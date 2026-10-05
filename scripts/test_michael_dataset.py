"""Corruption tests for public-message coverage and reviewed annotation integrity."""
import json
import tempfile
import unittest
from pathlib import Path

from michael_dataset import build, digest, read, row_digest


class DatasetIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.folder = self.root / 'data/stockapp'
        self.folder.mkdir(parents=True)
        for number in range(1, 7):
            raw = {'sessionId': f'session-{number}', 'messages': [
                {'id': f'user-{number}', 'role': 'user', 'ts': 1700000000000 + number * 1000,
                 'content': [{'type': 'text', 'text': f'<user_input mode="act">Feature {number}.</user_input>'}]},
                {'id': f'progress-{number}', 'role': 'assistant', 'ts': 1700000000001 + number * 1000,
                 'content': [{'type': 'text', 'text': 'I am checking the existing files.'}]},
                {'id': f'tool-{number}', 'role': 'assistant', 'ts': 1700000000002 + number * 1000,
                 'content': [{'type': 'tool_use', 'name': 'read_file', 'input': {'path': 'example'}}]},
            ]}
            path = self.root / f'projects/stockapp/evidence/raw/{number}.json'
            self.write(path, raw)
            legacy = self.root / f'data/stockapp_{number:02d}_feature'
            self.write(legacy / 'chat-history.json', {'raw_files': [{
                'filename': path.name, 'session': raw['sessionId'],
                'sha256': digest(path.read_bytes()), 'bytes': path.stat().st_size,
            }]})
            self.write(legacy / 'cleaned-chat.json', [
                {'role': 'user', 'content': [{'type': 'text', 'text': f'Feature {number}.'}]},
                {'role': 'assistant', 'content': [{'type': 'text', 'text': 'I am checking the existing files.'}]},
            ])
        spec = [
            {'question_id': 'Q001', 'question': 'What was requested first?', 'category': ['single-session', 'singlehop'],
             'citations': [{'session': 'D1', 'original_message_id': 'user-1', 'excerpt': 'Feature 1.'}],
             'answer': 'Feature 1.', 'requires_answers': []},
            {'question_id': 'Q002', 'question': 'Which two features were requested in D1 and D2?', 'category': ['multi-session', 'multihop'],
             'citations': [{'session': 'D1', 'original_message_id': 'user-1', 'excerpt': 'Feature 1.'},
                           {'session': 'D2', 'original_message_id': 'user-2', 'excerpt': 'Feature 2.'}],
             'answer': 'Features 1 and 2.', 'requires_answers': []},
        ]
        reviews = []
        for item in spec:
            qa = {k: item[k] for k in ('question', 'category', 'answer')}
            qa['evidence'] = [f'{c["session"]}:1: "{c["excerpt"]}"' for c in item['citations']]
            reviews.append({'question_id': item['question_id'], 'reviewed_question': item['question'],
                            'reviewed_sha256': row_digest(qa), 'source_support': 'reviewed',
                            'category_reason': 'Explicit requests in the cited messages.',
                            'cross_session_necessity': 'D1 and D2 provide separate requests.'})
        self.write(self.folder / 'annotation-spec.json', spec)
        self.write(self.folder / 'annotation-semantic-review.json', reviews)
        build(self.root, 'stockapp')

    def write(self, path, value):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))

    def change(self, path, edit):
        path = self.folder / path
        value = read(path)
        edit(value)
        self.write(path, value)

    def rejects(self, pattern):
        with self.assertRaisesRegex(ValueError, pattern):
            build(self.root, 'stockapp', check=True)

    def test_small_set_is_valid_without_quantity_quota(self):
        result = build(self.root, 'stockapp', check=True)
        self.assertEqual(result['annotations'], 2)
        self.assertEqual(result['public_messages'], 12)

    def test_missing_progress_reply_is_rejected(self):
        self.change('D1/cleaned-chat.json', lambda rows: rows.pop())
        self.rejects('cleaned-chat.json')

    def test_raw_archive_change_is_rejected(self):
        path = self.root / 'projects/stockapp/evidence/raw/1.json'
        path.write_text(path.read_text() + ' ')
        self.rejects('archive checksum')

    def test_forged_quote_is_rejected(self):
        self.change('annotation-spec.json', lambda rows: rows[0]['citations'][0].update(excerpt='Invented evidence.'))
        self.rejects('excerpt does not resolve')

    def test_stale_review_is_rejected_even_during_build(self):
        self.change('annotation-spec.json', lambda rows: rows[0].update(answer='A changed answer.'))
        with self.assertRaisesRegex(ValueError, 'semantic review is stale'):
            build(self.root, 'stockapp')

    def test_cross_session_misclassification_is_rejected(self):
        self.change('annotation-spec.json', lambda rows: rows[1].update(category=['single-session', 'multihop']))
        self.rejects('session category mismatch')

    def test_unknown_category_is_rejected(self):
        self.change('annotation-spec.json', lambda rows: rows[0]['category'].append('invented-category'))
        self.rejects('invalid categories')

    def test_combined_timestamp_change_is_rejected(self):
        self.change('vibe_combined.json', lambda rows: rows[0]['conversation'].update(session_1_date_time='2000-01-01T00:00:00Z'))
        self.rejects('vibe_combined.json')

    def test_missing_ledger_entry_is_rejected(self):
        self.change('D1/cleaning-ledger.json', lambda rows: rows.pop())
        self.rejects('cleaning-ledger.json')

    def test_cyclic_dependency_is_rejected(self):
        self.change('annotation-spec.json', lambda rows: rows[0].update(requires_answers=['Q001']))
        self.rejects('invalid dependency')


if __name__ == '__main__':
    unittest.main()
