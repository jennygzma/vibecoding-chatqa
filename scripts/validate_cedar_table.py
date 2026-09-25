"""Validate the Cedar Table submission without external dependencies."""
from collections import Counter
from datetime import datetime
from hashlib import sha256
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/cedar_table'
PROJECT = ROOT / 'projects/cedar-table'
CATEGORIES = {'single-session', 'multi-session', 'singlehop', 'multihop', 'preference', 'temporal', 'knowledge-facts', 'open-domain'}

def unique_object(pairs):
    result = {}
    for key, value in pairs:
        assert key not in result, f'Duplicate JSON key: {key}'
        result[key] = value
    return result

def read(path):
    return json.loads(path.read_text(), object_pairs_hook=unique_object)

def main():
    files = [p for root in (DATA, PROJECT) for p in root.rglob('*') if p.is_file()]
    for path in files:
        if path.suffix == '.json':
            read(path)
    document = read(DATA / 'vibe_combined.json')
    assert isinstance(document, list) and len(document) == 1
    sample = document[0]
    assert set(sample) == {'sample_id', 'dataset', 'num_sessions', 'conversation', 'qa'}
    assert sample['num_sessions'] == 10 and len(sample['qa']) == 100
    conversation = sample['conversation']
    assert set(conversation) == {f'session_{i}{suffix}' for i in range(1, 11) for suffix in ('', '_date_time')}
    mapping = read(DATA / 'source-map.json')
    assert len(mapping['sessions']) == 10
    assert len({s['original_session_id'] for s in mapping['sessions']}) == 10
    mapped = {m['dia_id']: m for m in mapping['messages']}
    messages, previous = [], None
    for i, session in enumerate(mapping['sessions'], 1):
        rows = conversation[f'session_{i}']
        assert rows == read(DATA / f'D{i}/cleaned-chat.json')
        assert rows[0]['role'] == 'user'
        published = read(DATA / session['published_copy'])
        assert published['sessionId'] == session['original_session_id']
        assert sha256((DATA / session['published_copy']).read_bytes()).hexdigest() == session['published_sha256']
        assert len(published['messages']) == len(rows)
        assert read(DATA / f'D{i}/source-map.json')['messages'] == [mapped[m['dia_id']] for m in rows]
        for n, (message, original) in enumerate(zip(rows, published['messages']), 1):
            assert set(message) == {'role', 'dia_id', 'text'}
            assert message['dia_id'] == f'D{i}:{n}'
            assert message['role'] in {'user', 'assistant'} and message['text'].strip()
            source = mapped[message['dia_id']]
            assert source['original_session_id'] == session['original_session_id']
            assert source['original_message_id'] == original['id']
            assert source['role'] == message['role'] == original['role']
            assert original['content'] == [{'type': 'text', 'text': message['text']}]
            assert sha256(message['text'].encode()).hexdigest() == source['text_sha256']
            timestamp = source['original_timestamp']
            assert original['ts'] == timestamp
            assert round(datetime.fromisoformat(source['timestamp_utc'].replace('Z', '+00:00')).timestamp()*1000) == timestamp
            assert previous is None or previous <= timestamp
            previous = timestamp
        assert conversation[f'session_{i}_date_time'] == mapped[rows[0]['dia_id']]['timestamp_utc']
        messages.extend(rows)
    assert messages == read(DATA / 'cleaned-chat.json')
    assert len(messages) == len(mapped) == 320
    lookup = {m['dia_id']: m['text'] for m in messages}
    questions = sample['qa']
    assert len({q['question'].casefold() for q in questions}) == 100
    assert read(DATA / 'output.json') == {'qa': questions}
    citation_count = 0
    for question in questions:
        assert set(question) == {'question', 'category', 'evidence', 'answer'}
        assert isinstance(question['answer'], str) and question['answer'].strip()
        assert isinstance(question['category'], list) and len(question['category']) == len(set(question['category']))
        assert set(question['category']) <= CATEGORIES
        assert question['evidence'] and isinstance(question['evidence'], list)
        sessions = set()
        for citation in question['evidence']:
            match = re.fullmatch(r'(D\d+:\d+): "(.*)"', citation, re.S)
            assert match, citation
            key, quote = match.groups()
            assert quote.strip() and quote in lookup[key], key
            sessions.add(key.split(':')[0])
            citation_count += 1
        assert ('single-session' in question['category']) == (len(sessions) == 1)
        assert ('multi-session' in question['category']) == (len(sessions) > 1)
    assert citation_count == 152
    profile = read(DATA / 'annotation-profile.json')
    assert dict(Counter(c for q in questions for c in q['category'])) == profile['current_category_counts']
    assert set(profile['current_category_counts']) == CATEGORIES
    names = {q['question'] for q in questions}
    chains = read(DATA / 'question-dependencies.json')['chains']
    for chain in chains:
        assert chain['dependent_question'] in names
        assert all(q in names for q in chain['prerequisite_questions'])
    # The historical transcripts preserve original link text; validate maintained documentation links.
    for path in files:
        if path.suffix != '.md' or path.name == 'conversation.md':
            continue
        for target in re.findall(r'\]\(([^)]+)\)', path.read_text()):
            if re.match(r'[a-z]+:', target) or target.startswith('#'):
                continue
            resolved = (path.parent / target.split('#')[0]).resolve()
            assert resolved.is_relative_to(ROOT) and resolved.exists(), (path.relative_to(ROOT), target)
    print(json.dumps({'status': 'In Progress', 'approval': 'pending', 'sessions': 10, 'messages': len(messages), 'questions': len(questions), 'exact_citations': citation_count, 'dependency_chains': len(chains), 'json_syntax_and_unique_keys': 'passed', 'reference_field_structure': 'passed', 'timestamps_and_source_mappings': 'passed', 'published_hashes': 'passed', 'categories_and_evidence': 'passed', 'documentation_links': 'passed'}, indent=2))

if __name__ == '__main__':
    main()
