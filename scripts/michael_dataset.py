#!/usr/bin/env python3
"""Build/validate Michael's curated datasets using the Focus Desk export schema.

Specs and semantic reviews are authored inputs. Building never re-signs a review.
Original Cline archives and the earlier trajectory outputs remain untouched.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.cline_export import source_prose

PROJECTS = {'stockapp': 'StockApp', 'startupsimulator': 'StartupSimulator', 'roompacker': 'Roompacker'}
LABELS = {'single-session', 'multi-session', 'singlehop', 'multihop',
          'preference', 'temporal', 'knowledge-facts', 'open-domain'}
EVIDENCE = re.compile(r'^(D\d+:\d+): "(.+)"$', re.S)


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def digest(value):
    return hashlib.sha256(value).hexdigest()


def row_digest(row):
    return digest(json.dumps(row, sort_keys=True, ensure_ascii=False).encode())


def utc(milliseconds):
    return datetime.fromtimestamp(milliseconds / 1000, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def reconstruct_session(root, project, folder, number):
    """Reconstruct every public text block; account for all omitted blocks."""
    manifest = read(folder / 'chat-history.json')['raw_files']
    require(len(manifest) == 1, f'{folder.name}: expected one original session')
    manifest = manifest[0]
    raw_path = root / 'projects' / project / 'evidence/raw' / manifest['filename']
    raw_bytes = raw_path.read_bytes()
    require(digest(raw_bytes) == manifest['sha256'], f'{folder.name}: original archive checksum mismatch')
    require(len(raw_bytes) == manifest['bytes'], f'{folder.name}: original archive size mismatch')
    raw = json.loads(raw_bytes)
    require(raw['sessionId'] == manifest['session'], f'{folder.name}: original session identity mismatch')
    label = f'D{number}'
    records, ledger = [], []
    source_path = raw_path.relative_to(root).as_posix()
    for position, message in enumerate(raw['messages']):
        blocks = message.get('content', [])
        if not blocks:
            ledger.append({'source_path': source_path, 'original_position': position,
                           'original_message_id': message['id'], 'reason': 'no content blocks'})
        for block_index, block in enumerate(blocks):
            texts = source_prose({'role': message['role'], 'content': [block]})
            entry = {'source_path': source_path, 'original_position': position,
                     'original_block_index': block_index, 'original_message_id': message['id']}
            if not texts:
                entry['reason'] = ('tool/non-text payload' if not isinstance(block, dict) or block.get('type') != 'text'
                                   else 'non-public runtime text outside a user_input envelope'
                                   if message['role'] == 'user' else 'non-public role or empty text')
                ledger.append(entry)
                continue
            text = texts[0]
            mapping = {**entry, 'original_session_id': raw['sessionId'],
                       'original_timestamp': message['ts'], 'timestamp_utc': utc(message['ts']),
                       'role': message['role'], 'text_sha256': digest(text.encode()),
                       'transformations': ['removed user_input envelope; trimmed outer whitespace']
                       if message['role'] == 'user' else ['trimmed outer whitespace']}
            records.append((message['ts'], position, block_index, text, mapping))
            entry['reason'] = 'included public prose'
            ledger.append(entry)
    records.sort(key=lambda row: row[:3])
    cleaned, mappings = [], []
    for index, (_, _, _, text, mapping) in enumerate(records, 1):
        dia_id = f'{label}:{index}'
        cleaned.append({'role': mapping['role'], 'dia_id': dia_id, 'text': text})
        mappings.append({'dia_id': dia_id, **mapping})
    require(cleaned, f'{folder.name}: empty conversation')
    # Verify the complete published legacy view, not just the cited messages.
    legacy = read(folder / 'cleaned-chat.json')
    require([{'role': m['role'], 'content': [{'type': 'text', 'text': m['text']}]} for m in cleaned] == legacy,
            f'{folder.name}: legacy transcript does not reconstruct from original records')
    first = min(message['ts'] for message in raw['messages'])
    source = {'original_session_id': raw['sessionId'],
              'session_start_utc': utc(first),
              'session_start_source': 'first recorded message timestamp; export has no explicit session-start metadata',
              'first_message_utc': mappings[0]['timestamp_utc'],
              'source_files_sha256': {source_path: digest(raw_bytes)}, 'messages': mappings}
    index = {'session_label': label, 'feature': folder.name.split('_', 2)[-1].replace('-', ' '),
             'original_session_id': raw['sessionId'], 'started_at_utc': None,
             'conversation_date_time_utc': utc(first), 'date_time_basis': source['session_start_source'],
             'first_message_at_utc': mappings[0]['timestamp_utc'],
             'last_message_at_utc': mappings[-1]['timestamp_utc'], 'message_count': len(cleaned),
             'conversation_path': f'{label}/conversation.md', 'source_map_path': f'{label}/source-map.json',
             'cleaning_ledger_path': f'{label}/cleaning-ledger.json',
             'legacy_trajectory': folder.relative_to(root).as_posix()}
    return cleaned, source, ledger, index


def render_conversation(title, messages):
    return '# ' + title + '\n\n' + '\n\n'.join(f"## {m['dia_id']} — {m['role']}\n\n{m['text']}" for m in messages) + '\n'


def assemble(root, project):
    destination = root / 'data' / project
    spec = read(destination / 'annotation-spec.json')
    reviews = read(destination / 'annotation-semantic-review.json')
    folders = sorted((root / 'data').glob(project + '_[0-9]*'))
    require(len(folders) == 6, f'{project}: expected the six original trajectories')
    files, session_index, conversation, all_messages, all_mappings, renumbering = {}, [], {}, [], {}, {}
    for number, folder in enumerate(folders, 1):
        cleaned, mapping, ledger, index = reconstruct_session(root, project, folder, number)
        label = f'D{number}'
        files[f'{label}/cleaned-chat.json'] = cleaned
        files[f'{label}/source-map.json'] = mapping
        files[f'{label}/cleaning-ledger.json'] = ledger
        files[f'{label}/conversation.md'] = render_conversation(PROJECTS[project] + ' — ' + index['feature'], cleaned)
        session_index.append(index)
        conversation[f'session_{number}_date_time'] = index['conversation_date_time_utc']
        conversation[f'session_{number}'] = cleaned
        all_messages.extend(cleaned)
        all_mappings[label] = mapping['messages']
        renumbering[index['legacy_trajectory']] = {f'D1:{i}': m['dia_id'] for i, m in enumerate(cleaned, 1)}
    dates = [s['conversation_date_time_utc'] for s in session_index]
    require(dates == sorted(dates) and len(set(dates)) == 6, f'{project}: session order is not chronological')
    require(len({s['original_session_id'] for s in session_index}) == 6, f'{project}: repeated source session')
    texts = {m['dia_id']: m['text'] for m in all_messages}
    questions, dependencies, normalized_questions = [], [], set()
    require(isinstance(spec, list) and spec, f'{project}: no authored questions')
    require(len(spec) == len(reviews), f'{project}: incomplete semantic review')
    for number, (item, review) in enumerate(zip(spec, reviews), 1):
        qid = f'Q{number:03d}'
        require(set(item) == {'question_id', 'question', 'category', 'citations', 'answer', 'requires_answers'}, f'{qid}: spec fields')
        require(item['question_id'] == review['question_id'] == qid, f'{qid}: question/review numbering')
        require(isinstance(item['question'], str) and item['question'].endswith('?'), f'{qid}: incomplete question')
        require(isinstance(item['answer'], str) and item['answer'].strip(), f'{qid}: empty answer')
        normalized = re.sub(r'\W+', '', item['question'].casefold())
        require(normalized not in normalized_questions, f'{qid}: duplicate question')
        normalized_questions.add(normalized)
        evidence = []
        for citation in item['citations']:
            require(set(citation) == {'session', 'original_message_id', 'excerpt'}, f'{qid}: citation fields')
            require(citation['excerpt'].strip(), f'{qid}: empty excerpt')
            candidates = [m for m in all_mappings.get(citation['session'], [])
                          if m['original_message_id'] == citation['original_message_id']
                          and citation['excerpt'] in texts[m['dia_id']]]
            require(len(candidates) == 1, f'{qid}: excerpt does not resolve to exactly one original message: {citation}')
            evidence.append(f'{candidates[0]["dia_id"]}: "{citation["excerpt"]}"')
        require(evidence and len(set(evidence)) == len(evidence), f'{qid}: missing or repeated evidence')
        labels = item['category']
        require(isinstance(labels, list) and len(labels) == len(set(labels)) and set(labels) <= LABELS, f'{qid}: invalid categories')
        cited_sessions = {e.split(':', 1)[0] for e in evidence}
        scope = 'multi-session' if len(cited_sessions) > 1 else 'single-session'
        require(set(labels) & {'single-session', 'multi-session'} == {scope}, f'{qid}: session category mismatch')
        hops = set(labels) & {'singlehop', 'multihop'}
        require(hops == set() if 'open-domain' in labels else len(hops) == 1, f'{qid}: invalid hop/open-domain labels')
        if scope == 'multi-session':
            require('multihop' in labels and review.get('cross_session_necessity', '').strip(), f'{qid}: missing cross-session rationale')
        parents = item['requires_answers']
        require(isinstance(parents, list) and len(set(parents)) == len(parents), f'{qid}: malformed dependencies')
        require(all(re.fullmatch(r'Q\d{3}', p) and 0 < int(p[1:]) < number for p in parents), f'{qid}: invalid dependency')
        row = {key: item[key] for key in ('question', 'category', 'answer')}
        row['evidence'] = evidence
        require(review['reviewed_question'] == row['question'] and review['reviewed_sha256'] == row_digest(row), f'{qid}: semantic review is stale')
        require(review['source_support'] == 'reviewed' and review['category_reason'].strip(), f'{qid}: unreviewed question')
        questions.append(row)
        dependencies.append({'question_id': qid, 'evidence_dia_ids': list(dict.fromkeys(EVIDENCE.fullmatch(e)[1] for e in evidence)), 'requires_answers': parents})
    counts = Counter(label for q in questions for label in q['category'])
    distribution = {'question_count': len(questions), 'counts': dict(sorted(counts.items())),
                    'percentages': {k: round(v / len(questions) * 100, 1) for k, v in sorted(counts.items())}}
    files.update({'annotations.json': questions, 'session-index.json': session_index,
                  'question-dependencies.json': dependencies, 'category-distribution.json': distribution,
                  'message-renumbering.json': renumbering,
                  'conversation.md': render_conversation(PROJECTS[project] + ' — original conversations', all_messages),
                  'vibe_combined.json': [{'sample_id': 'vibe_' + project, 'dataset': 'vibe_' + project,
                                         'num_sessions': 6, 'conversation': conversation, 'qa': questions}]})
    files['annotations.md'] = '# ' + PROJECTS[project] + ' annotations\n\n' + '\n\n'.join(
        f"## Q{i:03d} — {q['question']}\n\n{q['answer']}\n\nCategories: {', '.join(q['category'])}.\n\n"
        + '\n'.join('- ' + e for e in q['evidence']) + '\n\nReview: ' + reviews[i-1]['category_reason']
        + ('\n\nSession necessity: ' + reviews[i-1]['cross_session_necessity'] if 'cross_session_necessity' in reviews[i-1] else '')
        for i, q in enumerate(questions, 1)) + '\n'
    summary = {'project': project, 'sessions': len(session_index), 'public_messages': len(all_messages),
               'annotations': len(questions), 'citations': sum(len(q['evidence']) for q in questions),
               'categories': dict(sorted(counts.items()))}
    reference = read(root / 'data/focus_desk/category-distribution.json') if (root / 'data/focus_desk/category-distribution.json').exists() else None
    if reference:
        table = '\n'.join(f"| {label} | {reference['counts'].get(label, 0)} / {reference['question_count']} | {counts.get(label, 0)} / {len(questions)} |"
                          for label in sorted(LABELS))
        files['category-review.md'] = f'''# {PROJECTS[project]} category review

Reference: [Focus Desk](../focus_desk/category-review.md). Labels overlap and are not quotas.

| Category | Focus Desk | {PROJECTS[project]} |
|---|---:|---:|
{table}

Each question has a source-support and category rationale in
`annotation-semantic-review.json`, bound to the exact answer, question, labels
and evidence by a checksum. Cross-session entries also explain which distinct
facts require separate original conversations. These are editorial judgments;
the validator checks consistency and provenance, not semantic truth by label count.

Direct retrieval stays singlehop even with several excerpts. Comparisons,
calculations and integrations of distinct facts use multihop. Temporal covers
actual durations, intervals, dates or time-dependent rules; ordinary feature
revision order alone does not qualify. Preference requires an explicit user
choice. Open-domain questions have concise one-sentence explanations and no hop
label, following Focus Desk. Negative answers are not automatically adversarial.

All eight Focus Desk labels have grounded examples. The smaller set removes
repetitive control, color and implementation-detail lookups. No count or category
percentage was used as a target.
'''
    files['README.md'] = f'''# {PROJECTS[project]} dataset

Editorial status: agent-reviewed. Human approval of this revised set: pending.

The canonical set contains {len(questions)} questions, {summary['citations']} exact
evidence excerpts and {len(all_messages)} public messages across six original Cline
sessions. Its structure follows [Focus Desk](../focus_desk/README.md).

- [Combined conversation and questions](vibe_combined.json): a one-project array with
  exactly `sample_id`, `dataset`, `num_sessions`, `conversation` and `qa`.
- [Questions](annotations.json), [readable questions and rationales](annotations.md),
  [conversation](conversation.md) and [session index](session-index.json).
- [Authored citation specification](annotation-spec.json), [semantic review](annotation-semantic-review.json),
  [categories](category-review.md) and [question dependencies](question-dependencies.json).
- D1–D6 contain complete cleaned public messages, source maps, cleaning ledgers and
  readable conversations. [Message renumbering](message-renumbering.json) maps each
  earlier trajectory's D1:N references to the combined D1–D6 namespace.
- [Recording and timing policy](recording-policy.md) and [timing review](timing-review.md).
- [Application](../../projects/{project}/README.md).

From the repository root:

```sh
python3 scripts/michael_dataset.py {project}
python3 scripts/michael_dataset.py {project} --check
python3 -m unittest discover -s scripts -p test_michael_dataset.py
```

The specification and semantic review are authored inputs. Building resolves
original message IDs into citations and creates derived exports; it never
updates a review's checksum to bless an edited question automatically.

Earlier per-trajectory output.json files are preserved for traceability and are
excluded from the master in favor of this annotations.json. Their prior researcher
approvals do not transfer to rewritten questions. Historical implementation reports
remain reports; this dataset does not assert that every earlier feature survives
later rewrites or has been independently exercised in the current app.
'''
    files['recording-policy.md'] = '''# Recording and reconstruction policy

Original Cline `.messages.json` archives are retained byte-for-byte under the
application's `evidence/raw/` directory; source maps link to their repository paths
and SHA-256 hashes. They are not duplicated or rewritten inside each D directory.

Every assistant text block and every user text block inside a `user_input`
envelope is retained, including public progress replies, mistakes and corrections.
The envelope and outer whitespace are removed using the existing Cline importer
policy. Tool payloads, unwrapped runtime context and other non-public records stay
in the original archive. The cleaning ledger accounts for every original content
block, including both retained and excluded records. Original roles, message IDs,
positions, block indices, timestamps and text hashes remain available in source maps.

The six folder boundaries correspond to six distinct source session IDs. No new
conversation is invented to obtain multi-session questions. The raw exports have
no explicit session-start metadata: combined `session_N_date_time` values use the
first recorded raw-message timestamp, and `started_at_utc` is null in the session
index. They are not fabricated session-creation times. Public-message timestamps
are kept independently, and historical local paths inside messages remain verbatim.

The master selects the canonical annotations.json once per project. Legacy
per-trajectory outputs, older drafts and duplicate combined representations are
excluded from the annotation count. Question dependency arrays are empty where a
question stands on its own cited evidence; no artificial dependency chain is added.
'''
    timing_rows = '\n'.join(f"| {s['session_label']} | {s['original_session_id']} | {s['conversation_date_time_utc']} | {s['last_message_at_utc']} | {s['message_count']} |" for s in session_index)
    files['timing-review.md'] = f'''# Recorded timing review

Times are UTC. The conversation date is the first recorded raw-message time,
not an independently known session-start time. Original per-message timestamps
are preserved; no timestamps are synthesized from filesystem modification times.

| Session | Original ID | First recorded raw message | Last public message | Public messages |
|---|---|---|---|---:|
{timing_rows}
'''
    return files, summary


def build(root, project, check=False):
    files, summary = assemble(root, project)
    folder = root / 'data' / project
    for name, value in files.items():
        path = folder / name
        if check:
            actual = read(path) if name.endswith('.json') else path.read_text(encoding='utf-8')
            require(actual == value, f'{project}/{name}: stale or corrupted derived file')
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n' if name.endswith('.json') else value, encoding='utf-8')
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('projects', nargs='*', metavar='PROJECT', help='stockapp, startupsimulator or roompacker; defaults to all three')
    parser.add_argument('--check', action='store_true', help='Read-only validation of all derived files and authored reviews')
    args = parser.parse_args()
    for project in args.projects or list(PROJECTS):
        if project not in PROJECTS:
            parser.error(f'Unknown project: {project}')
        print(json.dumps(build(ROOT, project, check=args.check), ensure_ascii=False))


if __name__ == '__main__':
    main()
