from dataset_paths import DATA_ROOT
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


BASE = Path(__file__).resolve().parents[1]


class DatasetIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "data"
        shutil.copytree(DATA_ROOT, self.root)

    def tearDown(self):
        self.temp.cleanup()

    def edit(self, name, mutate):
        path = self.root / name
        data = json.loads(path.read_text())
        mutate(data)
        path.write_text(json.dumps(data, ensure_ascii=False))

    def validate(self, expected=None):
        result = subprocess.run([sys.executable, str(BASE / "scripts/validate_dataset.py"), str(self.root)], capture_output=True, text=True)
        if expected:
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(expected, result.stderr)
        else:
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_complete_archive_passes(self):
        self.validate()

    def test_progress_reply_cannot_disappear_from_all_outputs(self):
        self.edit("vibe_combined.json", lambda d: d[0]["conversation"]["session_1"].pop(1))
        self.edit("D1/cleaned-chat.json", lambda d: d.pop(1))
        self.edit("D1/source-map.json", lambda d: d["messages"].pop(1))
        self.validate("Message count mismatch")

    def test_first_message_time_cannot_replace_session_start(self):
        source = json.loads((self.root / "D1/source-map.json").read_text())
        first = source["first_message_utc"]
        self.edit("vibe_combined.json", lambda d: d[0]["conversation"].update(session_1_date_time=first))
        self.edit("D1/source-map.json", lambda d: d.update(session_start_utc=first))
        self.validate("Start time mismatch")

    def test_exclusion_requires_a_ledger_entry(self):
        self.edit("D2/cleaning-ledger.json", lambda d: d.pop())
        self.validate("Cleaning ledger mismatch")

    def test_rewritten_quote_is_rejected(self):
        def change(q): q[0]["evidence"][0] = 'D1:1: "This quote was never spoken."'
        self.edit("vibe_combined.json", lambda d: change(d[0]["qa"]))
        self.edit("annotations.json", change)
        self.validate("Nonverbatim evidence")

    def test_answer_edit_invalidates_content_review(self):
        def change(q): q[0]["answer"] = "A changed answer."
        self.edit("vibe_combined.json", lambda d: change(d[0]["qa"]))
        self.edit("annotations.json", change)
        self.validate("Semantic review is stale")


if __name__ == "__main__":
    unittest.main()
