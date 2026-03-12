from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

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
RULES_FILENAME = "rules.json"

logger = logging.getLogger("chatqa")

USER_TAGS = ["task", "user_message"]
ASSISTANT_TAGS = ["thinking", "text"]
ALLOWED_ASSISTANT_TYPES = {"thinking", "text"}
TAG_RE = re.compile(r"<(?P<tag>[a-zA-Z_][\w-]*)>(?P<body>.*?)</\1>", re.DOTALL)


@dataclass
class ProcessResult:
    output_text: str
    output_json: Dict[str, Any]
    output_path: Path


@dataclass
class RuleLearningResult:
    output_text: str
    output_json: Dict[str, Any]
    output_path: Path


@dataclass
class CleanChatResult:
    cleaned_messages: List[Dict[str, Any]]
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


def _extract_tag_blocks(text: str, allowed_tags: List[str]) -> List[Tuple[str, str]]:
    blocks: List[Tuple[str, str]] = []
    for match in TAG_RE.finditer(text):
        tag = match.group("tag")
        if tag in allowed_tags:
            body = match.group("body").strip()
            if body:
                blocks.append((tag, body))
    return blocks


def _clean_user_content_item(item: Any) -> List[Dict[str, Any]]:
    if isinstance(item, dict) and isinstance(item.get("text"), str):
        blocks = _extract_tag_blocks(item["text"], USER_TAGS)
        return [{"type": "text", "text": b} for _tag, b in blocks]
    if isinstance(item, str):
        blocks = _extract_tag_blocks(item, USER_TAGS)
        return [{"type": "text", "text": b} for _tag, b in blocks]
    return []


def _clean_assistant_content_item(item: Any) -> List[Dict[str, Any]]:
    if isinstance(item, dict):
        text = item.get("text")
        item_type = item.get("type")
        if isinstance(text, str):
            blocks = _extract_tag_blocks(text, ASSISTANT_TAGS)
            if blocks:
                return [{"type": tag, "text": body} for tag, body in blocks]
            if item_type in ALLOWED_ASSISTANT_TYPES:
                return [{"type": item_type, "text": text}]
        return []
    if isinstance(item, str):
        blocks = _extract_tag_blocks(item, ASSISTANT_TAGS)
        if blocks:
            return [{"type": tag, "text": body} for tag, body in blocks]
        return []
    return []


def _clean_message(msg: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    role = msg.get("role")
    content = msg.get("content")

    if role not in {"user", "assistant"}:
        return None

    if isinstance(content, list):
        cleaned_items: List[Dict[str, Any]] = []
        for item in content:
            if role == "user":
                cleaned_items.extend(_clean_user_content_item(item))
            else:
                cleaned_items.extend(_clean_assistant_content_item(item))
        if not cleaned_items:
            return None
        return {"role": role, "content": cleaned_items}

    if isinstance(content, str):
        if role == "user":
            blocks = _extract_tag_blocks(content, USER_TAGS)
            if not blocks:
                return None
            new_text = "\n\n".join(b for _t, b in blocks)
            return {"role": role, "content": new_text}
        if role == "assistant":
            blocks = _extract_tag_blocks(content, ASSISTANT_TAGS)
            if not blocks:
                return None
            new_text = "\n\n".join(b for _t, b in blocks)
            return {"role": role, "content": new_text}

    return None


def _clean_chat_messages(chat_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    messages = chat_json.get("messages", [])
    cleaned: List[Dict[str, Any]] = []
    for msg in messages:
        if isinstance(msg, dict):
            cleaned_msg = _clean_message(msg)
            if cleaned_msg is not None:
                cleaned.append(cleaned_msg)
    return cleaned


def _normalize_messages(cleaned_messages: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    normalized: List[Dict[str, str]] = []
    for msg in cleaned_messages:
        role = msg.get("role")
        if role not in {"user", "assistant"}:
            continue

        content = msg.get("content")
        if isinstance(content, str):
            text = content.strip()
            if text:
                normalized.append({"role": role, "content": text})
            continue

        if isinstance(content, list):
            parts: List[str] = []
            for item in content:
                if isinstance(item, dict) and isinstance(item.get("text"), str):
                    part = item["text"].strip()
                    if part:
                        parts.append(part)
            if parts:
                normalized.append({"role": role, "content": "\n\n".join(parts)})
    return normalized


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


def _is_valid_cleaned_messages(data: Any) -> bool:
    if not isinstance(data, list):
        return False
    for item in data:
        if not isinstance(item, dict):
            return False
        if item.get("role") not in {"user", "assistant"}:
            return False
    return True


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


def _build_rule_learning_prompt(
    messages: List[Dict[str, str]],
    notes_text: str,
    evidence_index: Dict[str, str],
    max_rules: int,
) -> str:
    rules = f"""
You are a rule-learning system extracting durable user preferences from chat history.
Return ONLY valid JSON with this exact schema:
{{
  "rules": [
    {{
      "rule": "...",
      "evidence": ["D1:3", "D1:8: \\"quote here\\""],
      "metadata": {{
        "confidence": 1,
        "decay": 1,
        "source_message_ids": ["D1:3"]
      }}
    }}
  ]
}}

Requirements:
- Generate between 1 and {max_rules} rules.
- Rules must be non-overlapping and generalizable beyond this specific task.
- Do not include task categorization outputs, workflow trajectory fields, or per-task labels.
- `rule` should be concise and actionable.
- `evidence` must reference actual message IDs (D1:N). Quotes are optional; IDs are required.
- `metadata.confidence`: 1-10 support strength for this rule.
- `metadata.decay`: 1-10 durability over time (10 = long-lasting preference).
- `metadata.source_message_ids` must list the core D1 IDs supporting the rule.
- Prefer conservative confidence scores unless evidence is explicit.
""".strip()

    payload = {
        "chat": messages,
        "notes": notes_text,
        "evidence_index": evidence_index,
        "max_rules": max_rules,
    }
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


def _extract_note_topics(notes_text: str) -> List[str]:
    topics: List[str] = []
    for raw in (notes_text or "").splitlines():
        line = raw.strip()
        if not line:
            continue
        # Support bullets/numbering in notes.txt.
        line = re.sub(r"^[\-\*\d\.\)\s]+", "", line).strip()
        if line:
            topics.append(line)
    return topics


def _qa_key(item: Dict[str, Any]) -> str:
    return str(item.get("question", "")).strip().lower()


def _tokenize_for_overlap(text: str) -> set[str]:
    stop_words = {
        "the", "and", "for", "with", "this", "that", "what", "how", "was", "were",
        "from", "have", "has", "into", "then", "than", "when", "where", "which", "why",
        "you", "your", "its", "there", "they", "them", "are", "is", "a", "an", "to",
        "of", "in", "on", "it", "be", "or",
    }
    words = re.findall(r"[a-zA-Z0-9_]+", (text or "").lower())
    return {w for w in words if len(w) >= 3 and w not in stop_words}


def _ensure_notes_coverage(
    selected: Dict[str, Any], candidates: Dict[str, Any], notes_text: str, max_items: int = 30
) -> Dict[str, Any]:
    topics = _extract_note_topics(notes_text)
    if not topics:
        return selected

    selected_qas = list(selected.get("qa", []))
    candidate_qas = list(candidates.get("qa", []))
    selected_keys = {_qa_key(q) for q in selected_qas}
    forced_keys: set[str] = set()

    for topic in topics:
        topic_tokens = _tokenize_for_overlap(topic)
        if not topic_tokens:
            continue

        best_item: Optional[Dict[str, Any]] = None
        best_score = 0
        for qa in candidate_qas:
            qa_text = f"{qa.get('question', '')} {qa.get('answer', '')}"
            score = len(topic_tokens & _tokenize_for_overlap(qa_text))
            if score > best_score:
                best_score = score
                best_item = qa

        if best_item is None or best_score <= 0:
            continue

        key = _qa_key(best_item)
        if key not in selected_keys:
            selected_qas.append(best_item)
            selected_keys.add(key)
        forced_keys.add(key)

    if len(selected_qas) <= max_items:
        selected["qa"] = selected_qas
        return selected

    # Trim to max_items, preserving forced note-topic matches first.
    trimmed: List[Dict[str, Any]] = []
    trimmed_keys: set[str] = set()
    for qa in selected_qas:
        key = _qa_key(qa)
        if key in forced_keys and key not in trimmed_keys:
            trimmed.append(qa)
            trimmed_keys.add(key)
    for qa in selected_qas:
        if len(trimmed) >= max_items:
            break
        key = _qa_key(qa)
        if key in trimmed_keys:
            continue
        trimmed.append(qa)
        trimmed_keys.add(key)

    selected["qa"] = trimmed[:max_items]
    return selected


def _parse_rules_output(text: str) -> Dict[str, Any]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Model did not return valid JSON for rules: {e}") from e

    schema = {
        "type": "object",
        "properties": {
            "rules": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "rule": {"type": "string"},
                        "evidence": {"type": "array", "items": {"type": "string"}},
                        "metadata": {
                            "type": "object",
                            "properties": {
                                "confidence": {"type": "integer", "minimum": 1, "maximum": 10},
                                "decay": {"type": "integer", "minimum": 1, "maximum": 10},
                                "source_message_ids": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["confidence", "decay", "source_message_ids"],
                            "additionalProperties": False,
                        },
                    },
                    "required": ["rule", "evidence", "metadata"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["rules"],
        "additionalProperties": False,
    }

    try:
        validate(instance=data, schema=schema)
    except ValidationError as e:
        raise ValueError(f"Rules JSON does not match schema: {e.message}") from e
    return data


def _extract_evidence_ids(text: str) -> List[str]:
    return re.findall(r"D1:\d+", text or "")


def _normalize_rules_evidence(output: Dict[str, Any], evidence_index: Dict[str, str]) -> Dict[str, Any]:
    valid_ids = set(evidence_index.keys())

    for item in output.get("rules", []):
        metadata = item.get("metadata", {})
        evidence = item.get("evidence", [])

        candidate_ids: List[str] = []
        for ev in evidence:
            candidate_ids.extend(_extract_evidence_ids(ev))
        for source_id in metadata.get("source_message_ids", []):
            candidate_ids.extend(_extract_evidence_ids(source_id))

        deduped: List[str] = []
        for cid in candidate_ids:
            if cid in valid_ids and cid not in deduped:
                deduped.append(cid)

        metadata["source_message_ids"] = deduped
        rebuilt_evidence = []
        for ev_id in deduped:
            quote = evidence_index[ev_id].replace("\n", " ").strip()
            rebuilt_evidence.append(f'{ev_id}: "{quote}"')
        item["evidence"] = rebuilt_evidence

    output["rules"] = [r for r in output.get("rules", []) if r.get("metadata", {}).get("source_message_ids")]
    return output


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
    output_json = _ensure_notes_coverage(output_json, merged, notes_text, max_items=30)
    output_json = _enrich_and_validate_evidence(output_json, evidence_index)
    count = len(output_json.get("qa", []))
    if count < 5 or count > 30:
        raise ValueError(f"Rerank output must contain 5-30 QA items, got {count}.")
    return output_json


def _slice_evidence_index(
    evidence_index: Dict[str, str], start_idx_1based: int, count: int
) -> Dict[str, str]:
    sliced: Dict[str, str] = {}
    for i in range(start_idx_1based, start_idx_1based + count):
        key = f"D1:{i}"
        if key in evidence_index:
            sliced[key] = evidence_index[key]
    return sliced


def clean_chat_folder(folder_name: str, force: bool = False) -> CleanChatResult:
    folder = DATA_DIR / folder_name
    chat_path = folder / CHAT_FILENAME
    alt_chat_path = folder / CHAT_FILENAME_ALT
    cleaned_chat_path = folder / CLEANED_CHAT_FILENAME

    if not chat_path.exists() and alt_chat_path.exists():
        chat_path = alt_chat_path
    if not chat_path.exists():
        raise FileNotFoundError(f"Missing {chat_path}")

    if cleaned_chat_path.exists() and not force:
        try:
            existing = json.loads(cleaned_chat_path.read_text(encoding="utf-8"))
            if _is_valid_cleaned_messages(existing):
                logger.info("Using existing cleaned chat: %s", cleaned_chat_path)
                return CleanChatResult(cleaned_messages=existing, output_path=cleaned_chat_path)
            logger.warning("Existing cleaned chat is invalid, regenerating: %s", cleaned_chat_path)
        except Exception:
            logger.warning("Could not parse existing cleaned chat, regenerating: %s", cleaned_chat_path)

    chat_json = _load_chat(chat_path)
    cleaned_messages = _clean_chat_messages(chat_json)
    cleaned_chat_path.write_text(
        json.dumps(cleaned_messages, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    logger.info("Wrote cleaned chat: %s (messages=%d)", cleaned_chat_path, len(cleaned_messages))
    return CleanChatResult(cleaned_messages=cleaned_messages, output_path=cleaned_chat_path)


def process_chat_folder(folder_name: str, refine: bool = False) -> ProcessResult:
    logger.info("Starting process for folder: %s (refine=%s)", folder_name, refine)
    folder = DATA_DIR / folder_name
    chat_path = folder / CHAT_FILENAME
    alt_chat_path = folder / CHAT_FILENAME_ALT
    notes_path = folder / NOTES_FILENAME
    output_path = folder / OUTPUT_FILENAME
    refine_path = folder / REFINE_FILENAME

    if not chat_path.exists() and alt_chat_path.exists():
        chat_path = alt_chat_path

    if not chat_path.exists():
        raise FileNotFoundError(f"Missing {chat_path}")

    logger.info("Using chat file: %s", chat_path)
    if notes_path.exists():
        logger.info("Using notes file: %s", notes_path)
    if refine and refine_path.exists():
        logger.info("Using refine file: %s", refine_path)

    notes_text = _load_notes(notes_path)
    clean_result = clean_chat_folder(folder_name, force=False)
    cleaned_messages = clean_result.cleaned_messages
    messages = _normalize_messages(cleaned_messages)
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
    cursor = 0
    for idx, chunk in enumerate(chunks, 1):
        logger.info("Processing chunk %d/%d (messages: %d)", idx, len(chunks), len(chunk))
        chunk_instruction = instruction
        if len(chunks) > 1:
            chunk_instruction = (instruction + " " if instruction else "") + f"(Chunk {idx}/{len(chunks)} only)"
        chunk_start = cursor + 1
        chunk_evidence_index = _slice_evidence_index(evidence_index, chunk_start, len(chunk))
        cursor += len(chunk)
        logger.info("Chunk %d evidence IDs: %d", idx, len(chunk_evidence_index))

        prompt = _build_prompt(
            chunk,
            notes_text,
            previous_output=previous_output,
            instruction=chunk_instruction,
            incremental=refine,
            evidence_index=chunk_evidence_index,
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


def learn_rules_for_chat_folder(folder_name: str, max_rules: int = 10) -> RuleLearningResult:
    if max_rules < 1:
        raise ValueError("max_rules must be >= 1")
    if max_rules > 30:
        raise ValueError("max_rules must be <= 30")

    logger.info("Starting rule learning for folder: %s", folder_name)
    folder = DATA_DIR / folder_name
    chat_path = folder / CHAT_FILENAME
    alt_chat_path = folder / CHAT_FILENAME_ALT
    notes_path = folder / NOTES_FILENAME
    rules_path = folder / RULES_FILENAME

    if not chat_path.exists() and alt_chat_path.exists():
        chat_path = alt_chat_path

    if not chat_path.exists():
        raise FileNotFoundError(f"Missing {chat_path}")

    notes_text = _load_notes(notes_path)
    clean_result = clean_chat_folder(folder_name, force=False)
    cleaned_messages = clean_result.cleaned_messages
    messages = _normalize_messages(cleaned_messages)
    if not messages:
        raise ValueError("No usable messages found in chat history.")

    evidence_index = _build_evidence_index(messages)
    prompt = _build_rule_learning_prompt(messages, notes_text, evidence_index, max_rules=max_rules)
    output_text = _call_llm(prompt)
    try:
        output_json = _parse_rules_output(output_text)
    except ValueError:
        logger.warning("Invalid rules JSON, retrying once")
        repair_prompt = (
            "The previous response was invalid JSON. "
            "Return ONLY valid JSON following the schema. "
            "Do not add any extra text.\n\n"
            + prompt
        )
        output_text = _call_llm(repair_prompt)
        output_json = _parse_rules_output(output_text)

    output_json = _normalize_rules_evidence(output_json, evidence_index)
    output_json["rules"] = output_json.get("rules", [])[:max_rules]

    if not output_json["rules"]:
        raise ValueError("No rules were produced with valid evidence references.")

    rules_path.write_text(json.dumps(output_json, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    logger.info("Wrote rule output: %s (rules=%d)", rules_path, len(output_json["rules"]))

    return RuleLearningResult(
        output_text=json.dumps(output_json, indent=2),
        output_json=output_json,
        output_path=rules_path,
    )
