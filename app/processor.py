from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from jsonschema import validate
from jsonschema.exceptions import ValidationError
from openai import OpenAI
import tiktoken


DATA_DIR = Path("data")
CHAT_FILENAME = "chat-history.json"
CHAT_FILENAME_ALT = "chat_history.json"
NOTES_FILENAME = "notes.txt"
OUTPUT_FILENAME = "output.json"
REFINE_FILENAME = "refine.json"
CLEANED_CHAT_FILENAME = "cleaned-chat.json"

logger = logging.getLogger("chatqa")


@dataclass
class ProcessResult:
    output_text: str
    output_json: Dict[str, Any]
    output_path: Path


def _load_env() -> None:
    load_dotenv()


def _get_openai_client() -> OpenAI:
    _load_env()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set. Put it in .env or environment.")
    return OpenAI(api_key=api_key)


def _get_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def _load_chat(chat_path: Path) -> Dict[str, Any]:
    with chat_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        # Support a list of messages directly.
        return {"messages": data}

    if not isinstance(data, dict):
        raise ValueError("Chat JSON must be an object or list of messages.")

    if "messages" not in data:
        # Allow alternative keys, but normalize to messages for the prompt.
        for key in ("chat", "history", "conversation"):
            if key in data and isinstance(data[key], list):
                return {"messages": data[key]}
        raise ValueError("Chat JSON must include a 'messages' array or be a list.")

    return data


def _extract_text_from_message(msg: Dict[str, Any]) -> str:
    # Accept common structures: {"content": "..."} or {"content": [{"type":"text","text":"..."}]}
    content = msg.get("content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "text" and isinstance(block.get("text"), str):
                parts.append(block["text"])
        return "\n".join(parts)
    return ""


def _normalize_messages(chat_json: Dict[str, Any]) -> list[Dict[str, str]]:
    messages = chat_json.get("messages", [])
    cleaned = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role")
        if role not in ("user", "assistant"):
            continue
        text = _extract_text_from_message(msg).strip()
        if not text:
            continue
        # Skip noisy/system/tool content
        lowered = text.lower()
        if any(prefix in lowered for prefix in ("<tool", "<read_file", "[read_file", "tool [", "<environment_details")):
            continue
        if text.startswith("# TODO") or text.startswith("# Todo List") or text.startswith("# Current"):
            continue
        if len(text.splitlines()) > 30 and "import " in text:
            continue
        cleaned.append({"role": role, "content": text})
    return cleaned


def _build_evidence_index(messages: list[Dict[str, str]]) -> Dict[str, str]:
    index: Dict[str, str] = {}
    for i, msg in enumerate(messages, 1):
        index[f"D1:{i}"] = msg.get("content", "")
    return index


def _estimate_tokens(text: str) -> int:
    try:
        enc = tiktoken.encoding_for_model("gpt-4o")
        return len(enc.encode(text))
    except Exception:
        return max(1, len(text) // 4)


def _chunk_messages(messages: list[Dict[str, str]], max_tokens: int = 6000) -> list[list[Dict[str, str]]]:
    if not messages:
        return []
    chunks: list[list[Dict[str, str]]] = []
    current: list[Dict[str, str]] = []
    tokens = 0
    for msg in messages:
        msg_tokens = _estimate_tokens(msg.get("content", "")) + 8
        if current and tokens + msg_tokens > max_tokens:
            chunks.append(current)
            current = [msg]
            tokens = msg_tokens
        else:
            current.append(msg)
            tokens += msg_tokens
    if current:
        chunks.append(current)
    return chunks


def _load_notes(notes_path: Optional[Path]) -> str:
    if not notes_path or not notes_path.exists():
        return ""
    return notes_path.read_text(encoding="utf-8")


def _build_prompt(
    chat_chunk: list[Dict[str, str]],
    notes_text: str,
    previous_output: Optional[Dict[str, Any]] = None,
    instruction: str = "",
    incremental: bool = False,
    evidence_index: Optional[Dict[str, str]] = None,
) -> str:
    rules = """
You are a data cleaning and QA generation system.
Generate QA pairs from the chat history and notes.
Output MUST be valid JSON with this exact schema:
{
  "qa": [
    {
      "question": "...",
      "answer": "...",
      "evidence": ["D1:3: \"verbatim quote here\""],
      "category": 1
    }
  ]
}

Category mapping (use these integer IDs):
1 = Multi-hop
2 = Temporal
3 = Open-domain
4 = Single-hop
5 = Adversarial

Guidelines:
- Use Q/A format based on the chat history and notes.
- Use notes as a soft focus: prioritize topics/goals mentioned in notes, but still cover key chat items not in notes.
- Evidence MUST be formatted as `D1:INDEX: "verbatim quote here"` (chat message index only).
- INDEX is 1-based (first chat message is D1:1).
- If evidence is unknown, use an empty list.
- Keep answers concise.
- Generate between 5 and 30 total questions across the whole chat. Fewer is better if high quality.
- Questions must be non-trivial and specific. Avoid vague, generic, or low-value questions.
- Focus on what the user and the assistant actually said (chat-grounded). Do not invent facts.
- Prefer questions that capture decisions, plans, commitments, timelines, preferences, constraints, and key facts.
- Return JSON only, no extra text.
""".strip()

    if incremental:
        rules += """

Refinement mode:
- You are given previous_output (existing QA list). Modify it minimally.
- Do NOT add new QA items unless the instruction explicitly says to add.
- Do NOT remove QA items unless the instruction explicitly says to remove.
- Prefer small edits to questions/answers/categories/evidence for correctness.
- Keep the order and count of QA items the same unless explicitly told otherwise.
""".strip()

    payload = {"chat": chat_chunk, "notes": notes_text}
    if previous_output is not None:
        payload["previous_output"] = previous_output
    if instruction:
        payload["instruction"] = instruction
    if evidence_index is not None:
        payload["evidence_index"] = evidence_index

    return rules + "\n\nINPUT:\n" + json.dumps(payload, ensure_ascii=True)


def _build_rerank_prompt(all_qa: Dict[str, Any], notes_text: str) -> str:
    rules = """
You are selecting the best QA items from a larger list.
Return ONLY valid JSON with the exact schema:
{
  "qa": [
    {
      "question": "...",
      "answer": "...",
      "evidence": ["D1:3: \"verbatim quote here\""],
      "category": 1
    }
  ]
}

Selection rules:
- Choose between 5 and 30 total QA items.
- Keep only high-quality, specific, non-trivial questions.
- Strongly prioritize items aligned with notes; ensure every distinct notes topic is covered by at least one selected QA when possible.
- If a notes topic is not addressed in any candidate QA, you may keep a small number of extra QAs that best approximate it.
- Do NOT invent new QA items; only select from the provided list.
- Do NOT alter evidence format.
""".strip()

    payload = {"qa": all_qa.get("qa", []), "notes": notes_text}
    return rules + "\n\nINPUT:\n" + json.dumps(payload, ensure_ascii=True)


def _call_llm(prompt: str) -> str:
    client = _get_openai_client()
    model = _get_model()

    response = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": "Return JSON only."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    return response.output_text


def _parse_output(text: str) -> Dict[str, Any]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Model did not return valid JSON: {e}") from e

    schema = {
        "type": "object",
        "properties": {
            "qa": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string"},
                        "answer": {"type": ["string", "number"]},
                        "evidence": {"type": "array", "items": {"type": "string"}},
                        "category": {"type": "integer", "minimum": 1, "maximum": 5},
                    },
                    "required": ["question", "answer", "evidence", "category"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["qa"],
        "additionalProperties": False,
    }

    try:
        validate(instance=data, schema=schema)
    except ValidationError as e:
        raise ValueError(f"Output JSON does not match schema: {e.message}") from e

    return data


def _enrich_and_validate_evidence(output: Dict[str, Any], evidence_index: Dict[str, str]) -> Dict[str, Any]:
    valid_ids = set(evidence_index.keys())
    max_id = len(evidence_index)
    for item in output.get("qa", []):
        evidence = item.get("evidence", [])
        rebuilt = []
        for ev in evidence:
            if ":" not in ev:
                raise ValueError(f"Evidence must include an ID and quote: {ev}")
            parts = ev.split(":", 2)
            if len(parts) < 2:
                raise ValueError(f"Evidence must include an ID and quote: {ev}")
            ev_id = ":".join(parts[:2]).strip()
            if ev_id not in valid_ids:
                # Try to normalize common off-by-one like D1:0
                try:
                    prefix, idx_str = ev_id.split(":", 1)
                    idx = int(idx_str)
                    if prefix == "D1" and 0 <= idx <= max_id:
                        idx = max(1, idx)
                        ev_id = f"{prefix}:{idx}"
                except Exception:
                    pass
            if ev_id not in valid_ids:
                continue
            quote = evidence_index[ev_id].replace("\n", " ").strip()
            rebuilt.append(f'{ev_id}: "{quote}"')
        item["evidence"] = rebuilt
    return output


def _merge_outputs(outputs: list[Dict[str, Any]]) -> Dict[str, Any]:
    merged = {"qa": []}
    for out in outputs:
        merged["qa"].extend(out.get("qa", []))
    return merged


def _rerank_and_select(merged: Dict[str, Any], notes_text: str, evidence_index: Dict[str, str]) -> Dict[str, Any]:
    prompt = _build_rerank_prompt(merged, notes_text)
    output_text = _call_llm(prompt)
    try:
        output_json = _parse_output(output_text)
    except ValueError:
        repair_prompt = (
            "The previous response was invalid JSON. "
            "Return ONLY valid JSON following the schema. "
            "Do not add any extra text.\n\n"
            + prompt
        )
        output_text = _call_llm(repair_prompt)
        output_json = _parse_output(output_text)

    output_json = _enrich_and_validate_evidence(output_json, evidence_index)
    count = len(output_json.get("qa", []))
    if count < 5 or count > 30:
        raise ValueError(f"Rerank output must contain 5-30 QA items, got {count}.")
    return output_json


def process_chat_folder(folder_name: str, refine: bool = False) -> ProcessResult:
    logger.info("Starting process for folder: %s (refine=%s)", folder_name, refine)
    folder = DATA_DIR / folder_name
    chat_path = folder / CHAT_FILENAME
    alt_chat_path = folder / CHAT_FILENAME_ALT
    notes_path = folder / NOTES_FILENAME
    output_path = folder / OUTPUT_FILENAME
    refine_path = folder / REFINE_FILENAME
    cleaned_chat_path = folder / CLEANED_CHAT_FILENAME

    if not chat_path.exists() and alt_chat_path.exists():
        chat_path = alt_chat_path

    if not chat_path.exists():
        raise FileNotFoundError(f"Missing {chat_path}")

    logger.info("Using chat file: %s", chat_path)
    if notes_path.exists():
        logger.info("Using notes file: %s", notes_path)
    if refine and refine_path.exists():
        logger.info("Using refine file: %s", refine_path)

    chat_json = _load_chat(chat_path)
    notes_text = _load_notes(notes_path)
    messages = _normalize_messages(chat_json)
    cleaned_chat_path.write_text(
        json.dumps({"messages": messages}, indent=2) + "\n",
        encoding="utf-8",
    )
    chunks = _chunk_messages(messages)
    if not chunks:
        raise ValueError("No usable messages found in chat history.")
    evidence_index = _build_evidence_index(messages)
    logger.info("Messages: %d | Chunks: %d | Evidence IDs: %d", len(messages), len(chunks), len(evidence_index))

    previous_output = None
    instruction = ""
    if refine:
        if not output_path.exists():
            raise FileNotFoundError(f"Missing {output_path} for refine.")
        try:
            previous_output = json.loads(output_path.read_text(encoding="utf-8"))
        except Exception as e:
            raise ValueError(f"Existing output.json is invalid: {e}") from e
        if refine_path.exists():
            try:
                instruction = refine_path.read_text(encoding="utf-8").strip()
            except Exception as e:
                raise ValueError(f"Could not read refine.json: {e}") from e

    outputs = []
    for idx, chunk in enumerate(chunks, 1):
        logger.info("Processing chunk %d/%d (messages: %d)", idx, len(chunks), len(chunk))
        chunk_instruction = instruction
        if len(chunks) > 1:
            chunk_instruction = (instruction + " " if instruction else "") + f"(Chunk {idx}/{len(chunks)} only)"

        prompt = _build_prompt(
            chunk,
            notes_text,
            previous_output=previous_output,
            instruction=chunk_instruction,
            incremental=refine,
            evidence_index=evidence_index,
        )

        output_text = _call_llm(prompt)
        try:
            output_json = _parse_output(output_text)
        except ValueError:
            logger.warning("Invalid JSON on chunk %d, retrying once", idx)
            repair_prompt = (
                "The previous response was invalid JSON. "
                "Return ONLY valid JSON following the schema. "
                "Do not add any extra text.\n\n"
                + prompt
            )
            output_text = _call_llm(repair_prompt)
            output_json = _parse_output(output_text)

        output_json = _enrich_and_validate_evidence(output_json, evidence_index)
        outputs.append(output_json)

    merged = _merge_outputs(outputs)
    logger.info("Merged QA count before rerank: %d", len(merged.get("qa", [])))
    merged = _rerank_and_select(merged, notes_text, evidence_index)
    logger.info("QA count after rerank: %d", len(merged.get("qa", [])))
    output_path.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    logger.info("Wrote output: %s (qa=%d)", output_path, len(merged.get("qa", [])))

    return ProcessResult(
        output_text=json.dumps(merged, indent=2),
        output_json=merged,
        output_path=output_path,
    )
