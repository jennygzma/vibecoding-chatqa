"""Exercise published-export validation and rejection of inconsistent records."""
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from validate_dataset import ROOT, validate


class PublishedDatasetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'dataset'
        shutil.copytree(ROOT, self.root)

    def tearDown(self):
        self.temp.cleanup()

    def mutate(self, name, change):
        path = self.root / name
        value = json.loads(path.read_text())
        change(value)
        path.write_text(json.dumps(value))

    def check_structure(self):
        return validate(self.root, check_file_manifest=False)

    def mutate_qa(self, change):
        self.mutate('annotations.json', change)
        self.mutate('vibe_combined.json', lambda d: change(d[0]['qa']))

    def test_complete_package(self):
        self.assertEqual(validate(self.root)['question_count'], 50)

    def test_export_tampering(self):
        self.mutate('annotations.json', lambda d: d[0].update(answer='Changed answer'))
        with self.assertRaisesRegex(ValueError, 'Export checksum'):
            validate(self.root)

    def test_missing_question(self):
        self.mutate_qa(lambda d: d.pop())
        with self.assertRaisesRegex(ValueError, 'fifty'):
            self.check_structure()

    def test_rewritten_message(self):
        self.mutate('vibe_combined.json', lambda d: d[0]['conversation']['session_1'][0].update(text='Changed original message'))
        with self.assertRaisesRegex(ValueError, 'message content'):
            self.check_structure()

    def test_omitted_progress(self):
        self.mutate('vibe_combined.json', lambda d: d[0]['conversation']['session_1'].pop(2))
        with self.assertRaisesRegex(ValueError, 'message content'):
            self.check_structure()

    def test_invented_excerpt(self):
        self.mutate_qa(lambda d: d[0].update(evidence=['D1:1: "Unsupported text"']))
        with self.assertRaisesRegex(ValueError, 'excerpt mismatch'):
            self.check_structure()

    def test_unsupported_category(self):
        self.mutate_qa(lambda d: d[0]['category'].append('adversarial'))
        with self.assertRaisesRegex(ValueError, 'Unsupported categories'):
            self.check_structure()

    def test_false_cross_session(self):
        self.mutate_qa(lambda d: d[0].update(category=['multi-session', 'multihop']))
        with self.assertRaisesRegex(ValueError, 'Session label mismatch'):
            self.check_structure()

    def test_changed_start_time(self):
        self.mutate('vibe_combined.json', lambda d: d[0]['conversation'].update(session_2_date_time='2026-10-03T00:00:00Z'))
        with self.assertRaisesRegex(ValueError, 'Start timestamp'):
            self.check_structure()

    def test_cyclic_dependency(self):
        self.mutate('question-dependencies.json', lambda d: d[0].update(requires_answers=['Q001']))
        with self.assertRaisesRegex(ValueError, 'cyclic question dependency'):
            self.check_structure()


if __name__ == '__main__':
    unittest.main()
