"""Regression checks for evidence and authorship validation."""
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from validate_annotations import ROOT, data_directory, validate


class AnnotationValidationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        shutil.copytree(data_directory(ROOT), self.root / "data/mahjong")
        shutil.copytree(ROOT / "evidence/raw", self.root / "evidence/raw")

    def tearDown(self):
        self.directory.cleanup()

    def edit(self, filename, change):
        path = self.root / "data/mahjong" / filename
        document = json.loads(path.read_text())
        change(document)
        path.write_text(json.dumps(document))

    def assert_rejected(self):
        self.assertTrue(validate(self.root)["errors"])

    def test_reviewed_package_passes(self):
        self.assertEqual(validate(self.root)["errors"], [])

    def test_changed_quote_is_rejected(self):
        def change(document):
            row = document["qa"][0]
            row["evidence"][0] = row["evidence"][0][:-1] + ' nonexistent claim"'
        self.edit("output.json", change)
        self.assert_rejected()

    def test_string_evidence_is_rejected(self):
        self.edit("output.json", lambda doc: doc["qa"][0].update(evidence=doc["qa"][0]["evidence"][0]))
        self.assert_rejected()

    def test_forged_role_and_matching_map_are_rejected(self):
        self.edit("cleaned-chat.json", lambda doc: doc[0].update(role="assistant"))
        self.edit("source-map.json", lambda doc: doc["messages"][0].update(role="assistant"))
        self.assert_rejected()

    def test_changed_original_message_id_is_rejected(self):
        self.edit("source-map.json", lambda doc: doc["messages"][0].update(original_message_id="missing-message"))
        self.assert_rejected()

    def test_raw_archive_change_is_rejected(self):
        archive = next((self.root / "evidence/raw").glob("*.json"))
        archive.write_bytes(archive.read_bytes() + b" ")
        self.assert_rejected()

    def test_fewer_than_one_hundred_items_is_rejected(self):
        self.edit("output.json", lambda doc: doc["qa"].pop())
        self.assert_rejected()

    def test_single_source_multi_hop_is_rejected(self):
        self.edit("output.json", lambda doc: doc["qa"][0].update(category=1))
        self.assert_rejected()


if __name__ == "__main__":
    unittest.main()
