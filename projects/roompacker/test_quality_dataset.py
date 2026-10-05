"""Regression checks for cross-session citation and schema integrity."""
import copy
import json
import unittest

from build_quality_dataset import DESTINATION
from validate_quality_dataset import check_sample


class QualityDatasetTests(unittest.TestCase):
    def setUp(self):
        self.sample = json.loads((DESTINATION / "vibe_combined.json").read_text())[0]

    def test_curated_combined_set_is_valid(self):
        self.assertEqual(check_sample(self.sample), [])

    def test_wrong_session_label_is_rejected(self):
        self.sample["qa"][-1]["category"][0] = "single-session"
        self.assertTrue(check_sample(self.sample))

    def test_quote_retargeted_to_other_thread_is_rejected(self):
        row = self.sample["qa"][60]
        row["evidence"][0] = row["evidence"][0].replace("D1:", "D6:", 1)
        self.assertTrue(check_sample(self.sample))

    def test_numeric_category_in_combined_schema_is_rejected(self):
        self.sample["qa"][0]["category"] = 4
        self.assertTrue(check_sample(self.sample))

    def test_duplicate_question_is_rejected(self):
        self.sample["qa"].append(copy.deepcopy(self.sample["qa"][0]))
        self.assertTrue(check_sample(self.sample))


if __name__ == "__main__":
    unittest.main()
