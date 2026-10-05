"""Validate the published dataset; original source archives remain local."""
import hashlib
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3] / 'data' / 'pantry_lane'
LABELS = {'single-session', 'multi-session', 'singlehop', 'multihop', 'preference', 'temporal', 'knowledge-facts', 'open-domain'}


def read(path):
    return json.loads(path.read_text())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def moment(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def validate(root=ROOT, check_file_manifest=True):
    if check_file_manifest:
        manifest = read(root / 'publication-checksums.json')
        exported = {str(path.relative_to(root)) for path in root.rglob('*') if path.is_file() and path.name != 'publication-checksums.json'}
        require(set(manifest['dataset_files_sha256']) == exported, 'Incomplete export checksum manifest')
        for name, checksum in manifest['dataset_files_sha256'].items():
            path = root / name
            require(path.resolve().is_relative_to(root.resolve()), 'Invalid manifest path')
            require(path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == checksum, f'Export checksum mismatch: {name}')
        repository = Path(__file__).resolve().parents[3]
        for name, checksum in manifest['application_files_sha256'].items():
            path = repository / name
            require(path.resolve().is_relative_to(repository), 'Invalid application manifest path')
            require(path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == checksum, f'Application checksum mismatch: {name}')
    document = read(root / 'vibe_combined.json')
    require(isinstance(document, list) and len(document) == 1, 'Expected one project in an array')
    project = document[0]
    require(set(project) == {'sample_id', 'dataset', 'num_sessions', 'conversation', 'qa'}, 'Incorrect project fields')
    require(project['sample_id'] == project['dataset'] == 'vibe_pantry_lane', 'Incorrect project identity')
    require(type(project['num_sessions']) is int and project['num_sessions'] == 4, 'Expected four sessions')
    conversation = project['conversation']
    require(set(conversation) == {key for n in range(1, 5) for key in (f'session_{n}_date_time', f'session_{n}')}, 'Incorrect conversation fields')
    index = read(root / 'session-index.json')
    require(len(index) == 4, 'Incorrect session index')
    identities, message_text, prior_end = set(), {}, None
    for number in range(1, 5):
        label, folder = f'D{number}', root / f'D{number}'
        source, messages = read(folder / 'source-map.json'), read(folder / 'cleaned-chat.json')
        entry = index[number - 1]
        require(source['original_session_id'] not in identities, 'Duplicate original session identity')
        identities.add(source['original_session_id'])
        start = source['session_start_utc']
        require(start == entry['started_at_utc'] == conversation[f'session_{number}_date_time'], 'Start timestamp mismatch')
        require(prior_end is None or moment(start) > moment(prior_end), 'Nonsequential feature sessions')
        require(source['source_files_sha256'] == read(folder / 'raw-checksums.json'), 'Original checksum manifests differ')
        require(source['source_files_sha256'] and all(re.fullmatch(r'[a-f0-9]{64}', checksum) for checksum in source['source_files_sha256'].values()), 'Invalid original checksum manifest')
        require(conversation[f'session_{number}'] == messages, 'Public message content mismatch')
        require(len(source['messages']) == len(messages) == entry['message_count'], 'Public progress coverage mismatch')
        require(entry['session_label'] == label and entry['original_session_id'] == source['original_session_id'], 'Session identity mismatch')
        previous_time = start
        for position, (mapped, message) in enumerate(zip(source['messages'], messages), 1):
            dia_id = f'{label}:{position}'
            require(set(message) == {'role', 'dia_id', 'text'}, 'Incorrect message fields')
            require(all(isinstance(value, str) and value for value in message.values()), 'Invalid message value')
            require(message['role'] in {'user', 'assistant'}, 'Invalid message role')
            require(message['dia_id'] == mapped['dia_id'] == dia_id, 'Message numbering mismatch')
            require(mapped['role'] == message['role'] and mapped['original_session_id'] == source['original_session_id'], 'Message provenance mismatch')
            require(hashlib.sha256(message['text'].encode()).hexdigest() == mapped['text_sha256'], 'Message checksum mismatch')
            require(moment(mapped['timestamp_utc']) >= moment(previous_time), 'Message timestamp order mismatch')
            require(mapped['original_message_id'] or mapped.get('source_locator'), 'Missing original identity or locator')
            previous_time = mapped['timestamp_utc']
            message_text[dia_id] = message['text']
        prior_end = previous_time
        require(source['first_message_utc'] == source['messages'][0]['timestamp_utc'] == entry['first_message_at_utc'], 'First-message timestamp mismatch')
        require(entry['last_message_at_utc'] == prior_end, 'Last-message timestamp mismatch')
    qa, counts, seen = project['qa'], Counter(), set()
    require(len(qa) == 50, 'Expected exactly fifty questions')
    require(qa == read(root / 'annotations.json'), 'Annotation exports differ')
    for number, annotation in enumerate(qa, 1):
        require(set(annotation) == {'question', 'category', 'evidence', 'answer'}, 'Incorrect annotation fields')
        require(all(isinstance(annotation[key], str) and annotation[key].strip() for key in ['question', 'answer']), 'Empty question or answer')
        question = ' '.join(annotation['question'].lower().split())
        require(question not in seen, 'Duplicate question')
        seen.add(question)
        labels = annotation['category']
        require(isinstance(labels, list) and labels and all(isinstance(label, str) for label in labels), 'Invalid category array')
        require(len(labels) == len(set(labels)) and set(labels) <= LABELS, 'Unsupported categories')
        require(not {'singlehop', 'multihop'} <= set(labels), 'Conflicting hop labels')
        require(isinstance(annotation['evidence'], list) and annotation['evidence'], 'Missing evidence')
        sessions = set()
        for evidence in annotation['evidence']:
            require(isinstance(evidence, str), 'Invalid evidence type')
            match = re.fullmatch(r'(D[1-4]:[1-9]\d*): "([\s\S]*)"', evidence)
            require(match is not None, 'Invalid evidence syntax')
            target, excerpt = match.groups()
            require(target in message_text and excerpt and excerpt in message_text[target], 'Evidence excerpt mismatch')
            sessions.add(target.split(':')[0])
        require(('multi-session' in labels) == (len(sessions) > 1), 'Session label mismatch')
        require(('single-session' in labels) == (len(sessions) == 1), 'Single-session label mismatch')
        require('multi-session' not in labels or 'multihop' in labels, 'Missing cross-session reasoning label')
        counts.update(labels)
    dependencies, reviews = read(root / 'question-dependencies.json'), read(root / 'annotation-semantic-review.json')
    require(len(dependencies) == len(reviews) == 50, 'Missing dependency or semantic review')
    for number, (dependency, review) in enumerate(zip(dependencies, reviews), 1):
        require(dependency['question_id'] == review['question_id'] == f'Q{number:03d}', 'Review numbering mismatch')
        require(review.get('review', '').strip() and review['answer_grounding'] == 'reviewed', 'Missing individual review')
        require(review['categories'] == qa[number - 1]['category'], 'Review categories differ')
        require(all(re.fullmatch(r'Q\d{3}', key) and 1 <= int(key[1:]) < number for key in dependency['requires_answers']), 'Invalid or cyclic question dependency')
        ids = list(dict.fromkeys(e.split(': "', 1)[0] for e in qa[number - 1]['evidence']))
        require(dependency['evidence_dia_ids'] == ids, 'Dependency evidence mismatch')
    reported = read(root / 'category-distribution.json')
    require(reported['question_count'] == 50 and reported['counts'] == dict(sorted(counts.items())), 'Category totals mismatch')
    return {'session_count': 4, 'message_count': len(message_text), 'question_count': 50,
            'export_checksums': 'passed' if check_file_manifest else 'not checked',
            'exact_evidence': 'passed', 'structure': 'passed',
            'original_archives': 'private; not replayed by repository validation',
            'approval': 'pending'}


if __name__ == '__main__':
    print(json.dumps(validate(), indent=2))
