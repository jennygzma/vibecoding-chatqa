"""Regression checks for StockApp draft annotation provenance."""
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from build_annotations import TRAJECTORIES
from validate_annotations import ROOT, roots, validate


class AnnotationValidationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        data_root, raw_root = roots(ROOT)
        for folder in TRAJECTORIES:
            shutil.copytree(data_root / folder, self.root / "data" / folder)
        shutil.copytree(raw_root, self.root / "evidence/raw")

    def tearDown(self):
        self.directory.cleanup()

    def edit(self, folder, filename, change):
        path = self.root / "data" / folder / filename
        document = json.loads(path.read_text())
        change(document)
        path.write_text(json.dumps(document))

    def assert_rejected(self):
        self.assertTrue(validate(self.root)["errors"])

    def test_draft_package_passes_structural_validation(self):
        self.assertEqual(validate(self.root)["errors"], [])

    def test_changed_quote_is_rejected(self):
        folder = next(iter(TRAJECTORIES))
        self.edit(
            folder,
            "output.json",
            lambda doc: doc["qa"][0]["evidence"].__setitem__(0, 'D1:1: "forged"'),
        )
        self.assert_rejected()

    def test_changed_raw_archive_is_rejected(self):
        archive = next((self.root / "evidence/raw").glob("*.messages.json"))
        archive.write_bytes(archive.read_bytes() + b" ")
        self.assert_rejected()

    def test_forged_source_message_is_rejected(self):
        folder = next(iter(TRAJECTORIES))
        self.edit(
            folder,
            "source-map.json",
            lambda doc: doc["messages"][0].update(original_message_id="forged"),
        )
        self.assert_rejected()

    def test_too_few_annotations_is_rejected(self):
        folder = next(iter(TRAJECTORIES))
        self.edit(folder, "output.json", lambda doc: doc.update(qa=doc["qa"][:4]))
        self.assert_rejected()

    def test_single_source_temporal_item_is_rejected(self):
        folder = next(iter(TRAJECTORIES))
        self.edit(folder, "output.json", lambda doc: doc["qa"][0].update(category=2))
        self.assert_rejected()


if __name__ == "__main__":
    unittest.main()
