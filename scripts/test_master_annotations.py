"""Regression checks for canonical selection and category normalization."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_master_annotations as master


class MasterSelectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / 'data'
        for name in ('stockapp/annotations.json', 'startupsimulator/annotations.json',
                     'roompacker/annotations.json', 'focus_desk/annotations.json',
                     'pantry_lane/annotations.json', 'cedar_table/output.json',
                     'mahjong/output.json', 'notesense_01_example/output.json',
                     'stockapp_01_example/output.json', 'startupsimulator_01_example/output.json',
                     'roompacker_01_example/output.json', 'roompacker/output.json',
                     'roompacker/revisions/72-question-draft/output.json'):
            path = self.data / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('{"qa": []}')
        self.addCleanup(patch.stopall)
        patch.object(master, 'ROOT', self.root).start()
        patch.object(master, 'DATA', self.data).start()

    def test_curated_sets_replace_legacy_trajectory_and_combined_duplicates(self):
        selected = {p.relative_to(self.data).as_posix() for p in master.annotation_sources()}
        self.assertEqual(selected, {
            'stockapp/annotations.json', 'startupsimulator/annotations.json',
            'roompacker/annotations.json', 'focus_desk/annotations.json',
            'pantry_lane/annotations.json', 'cedar_table/output.json',
            'mahjong/output.json', 'notesense_01_example/output.json',
        })

    def test_missing_curated_set_does_not_silently_fall_back_to_old_questions(self):
        (self.data / 'stockapp/annotations.json').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing canonical'):
            master.annotation_sources()

    def test_numeric_and_focus_desk_aliases_normalize_consistently(self):
        self.assertEqual(master.normalize_categories(1), ['multi-hop'])
        self.assertEqual(master.normalize_categories(['multi-session', 'multihop', 'preference']),
                         ['multi-session', 'multi-hop', 'preference'])

    def test_unknown_or_aliased_duplicate_categories_are_rejected(self):
        for value in (6, ['misspelled'], ['singlehop', 'single-hop']):
            with self.subTest(value=value), self.assertRaises(ValueError):
                master.normalize_categories(value)


if __name__ == '__main__':
    unittest.main()
