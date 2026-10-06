"""Human approval must remain bound to every reviewed row and conversation."""
import copy
import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_master_annotations as master
import build_michael_review as reviewer
from michael_approval import APPROVED, PROJECTS, REVIEW_PATH, validate_saved_review
from michael_dataset import assemble

ROOT = Path(__file__).resolve().parents[1]


class SavedApprovalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.path = self.root / REVIEW_PATH
        self.path.parent.mkdir(parents=True)
        shutil.copyfile(ROOT / REVIEW_PATH, self.path)
        self.review = json.loads(self.path.read_bytes())
        for project in PROJECTS:
            folder = self.root / 'data' / project
            folder.mkdir()
            for name in ('annotations.json', 'vibe_combined.json'):
                shutil.copyfile(ROOT / 'data' / project / name, folder / name)

    def rejects(self, edit, message):
        value = copy.deepcopy(self.review)
        edit(value)
        self.path.write_text(json.dumps(value, ensure_ascii=False))
        with self.assertRaisesRegex(ValueError, message):
            validate_saved_review(self.root)

    def test_valid_review_preserves_provenance_and_all_189_approvals(self):
        before = self.path.read_bytes()
        approval = validate_saved_review(self.root)
        self.assertEqual(approval['status'], APPROVED)
        self.assertEqual(approval['sha256'], hashlib.sha256(before).hexdigest())
        self.assertEqual(approval['exported_at'], self.review['exportedAt'])
        self.assertEqual(sum(p['approved_questions'] for p in approval['projects'].values()), 189)
        self.assertEqual(before, self.path.read_bytes())

    def test_missing_review_is_pending(self):
        self.path.unlink()
        self.assertIsNone(validate_saved_review(self.root))

    def test_stale_source_revision_is_rejected(self):
        self.rejects(lambda r: r['projects'][0].update(sourceRevision='stale'), 'stale source revision')

    def test_incomplete_or_duplicate_project_coverage_is_rejected(self):
        self.rejects(lambda r: r['projects'].pop(), 'project coverage')
        self.rejects(lambda r: r['projects'].__setitem__(1, r['projects'][0]), 'duplicate, unknown or missing project')

    def test_missing_duplicate_and_unknown_questions_are_rejected(self):
        self.rejects(lambda r: r['projects'][0]['rows'].pop(), 'question coverage')
        self.rejects(lambda r: r['projects'][0]['rows'].__setitem__(1, r['projects'][0]['rows'][0]),
                     'duplicate or unknown question')
        self.rejects(lambda r: r['projects'][0]['rows'][0].update(questionId='Q999'),
                     'duplicate or unknown question')

    def test_incomplete_and_unapproved_decisions_are_rejected(self):
        for complete in (False, 'true', 1):
            with self.subTest(complete=complete):
                self.rejects(lambda r: r['projects'][0].update(complete=complete), 'approval is incomplete')
        for decision in ('unreviewed', 'needs-edit', 'rejected', None):
            with self.subTest(decision=decision):
                self.rejects(lambda r: r['projects'][0]['rows'][0].update(decision=decision), 'not approved')

    def test_row_checksums_and_exact_reviewed_content_are_required(self):
        self.rejects(lambda r: r['projects'][0]['rows'][0].update(id='wrong'), 'row checksum mismatch')
        for key, value in [('question', 'Changed?'), ('answer', 'Changed'),
                           ('category', ['single-session', 'singlehop']), ('evidence', ['changed'])]:
            with self.subTest(key=key):
                self.rejects(lambda r: r['projects'][0]['rows'][0]['qa'].update({key: value}),
                             'reviewed QA differs')

    def test_approved_combined_conversations_timestamps_and_qa_are_bound(self):
        edits = [
            lambda sample: sample['conversation'].update(session_1_date_time='changed'),
            lambda sample: sample['conversation']['session_1'][0].update(text='changed'),
            lambda sample: sample['conversation']['session_1'][0].update(dia_id='D2:1'),
            lambda sample: sample.update(num_sessions=5),
            lambda sample: sample['qa'][0]['category'].reverse(),
            lambda sample: sample['qa'].reverse(),
        ]
        for index, edit in enumerate(edits):
            with self.subTest(edit=index):
                self.rejects(lambda r: edit(r['projects'][0]['approvedCombined'][0]),
                             'approved combined export differs')

    def test_changed_published_files_cannot_keep_approval(self):
        path = self.root / 'data/stockapp/vibe_combined.json'
        combined = json.loads(path.read_bytes())
        combined[0]['conversation']['session_1'][0]['text'] += ' Changed.'
        path.write_text(json.dumps(combined))
        with self.assertRaisesRegex(ValueError, 'approved combined export differs'):
            validate_saved_review(self.root)
        with self.assertRaisesRegex(ValueError, 'stale source revision'):
            validate_saved_review(self.root, {'stockapp': (b'[]', combined)})

    def test_invalid_review_stops_master_and_reviewer_builds(self):
        self.rejects(lambda r: r['projects'][0]['rows'].pop(), 'question coverage')
        with patch.object(master, 'ROOT', self.root), patch.object(master, 'DATA', self.root / 'data'):
            with self.assertRaisesRegex(ValueError, 'question coverage'):
                master.build()
        with patch.object(reviewer, 'ROOT', self.root):
            with self.assertRaisesRegex(ValueError, 'question coverage'):
                reviewer.bundle()

    def test_published_consumers_derive_status_without_changing_other_contributors(self):
        document = master.build()
        sources = {s['id']: s for s in document['sources']}
        self.assertEqual(document['summary']['annotations'], 598)
        self.assertEqual(document['summary']['sources'], 14)
        for project in PROJECTS:
            self.assertEqual(sources[project]['review_status'], APPROVED)
            self.assertEqual(sources[project]['human_review_path'], REVIEW_PATH.as_posix())
        for source in document['sources']:
            if source['id'] not in PROJECTS:
                self.assertEqual(source['review_status'], master.project_info(source['id'])[2])
        bundle = reviewer.bundle()
        self.assertEqual(bundle['status'], APPROVED)
        self.assertTrue(all(p['status'] == APPROVED for p in bundle['projects']))
        for project in PROJECTS:
            files, _ = assemble(ROOT, project)
            self.assertIn('Human approval: approved', files['README.md'])


if __name__ == '__main__':
    unittest.main()
