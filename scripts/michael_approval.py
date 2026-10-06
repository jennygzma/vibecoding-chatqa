"""Validate saved human decisions against the exact current Michael datasets.

Editorial reviews are separate inputs. A missing human review means pending;
an invalid saved review stops publication instead of carrying approval forward.
This module never writes or repairs a review.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path

PROJECTS = ('stockapp', 'startupsimulator', 'roompacker')
REVIEW_PATH = Path('data/michael-annotation-review.json')
APPROVED = 'human-approved'
PENDING = 'agent-reviewed-human-review-pending'


def require(condition, message):
    if not condition:
        raise ValueError(f'Saved human review: {message}')


def timestamp(value, label):
    require(isinstance(value, str) and value.endswith('Z'), f'{label}: missing UTC timestamp')
    try:
        datetime.fromisoformat(value[:-1] + '+00:00')
    except ValueError as error:
        raise ValueError(f'Saved human review: {label}: invalid timestamp') from error


def validate_saved_review(root, prospective=None):
    """Return approval provenance, or None if no review has been saved.

    Dataset builders pass prospective {project: (annotations_bytes, combined)}
    so changed authored content is checked before any derived file is written.
    All other callers validate the published files directly.
    """
    path = root / REVIEW_PATH
    if not path.exists():
        return None
    raw = path.read_bytes()
    review = json.loads(raw)
    require(isinstance(review, dict) and review.get('format') == 'michael-review-v3',
            'expected michael-review-v3 format')
    timestamp(review.get('exportedAt'), 'exportedAt')
    projects = review.get('projects')
    require(isinstance(projects, list) and len(projects) == len(PROJECTS),
            'incomplete project coverage')
    require(all(isinstance(p, dict) and isinstance(p.get('project'), str) for p in projects),
            'malformed project')
    require({p['project'] for p in projects} == set(PROJECTS),
            'duplicate, unknown or missing project')
    approved = {}
    for project in projects:
        name = project['project']
        if prospective and name in prospective:
            annotations_bytes, combined = prospective[name]
        else:
            folder = root / 'data' / name
            annotations_bytes = (folder / 'annotations.json').read_bytes()
            combined = json.loads((folder / 'vibe_combined.json').read_bytes())
        revision = hashlib.sha256(annotations_bytes).hexdigest()
        require(project.get('sourceRevision') == revision, f'{name}: stale source revision')
        questions = json.loads(annotations_bytes)
        require(isinstance(questions, list) and questions, f'{name}: malformed canonical questions')
        require(isinstance(combined, list) and len(combined) == 1
                and isinstance(combined[0], dict) and combined[0].get('qa') == questions,
                f'{name}: combined/standalone questions disagree')
        require(project.get('complete') is True, f'{name}: approval is incomplete')
        rows = project.get('rows')
        require(isinstance(rows, list) and len(rows) == len(questions),
                f'{name}: incomplete question coverage')
        expected = {f'Q{i:03d}': qa for i, qa in enumerate(questions, 1)}
        seen = set()
        for row in rows:
            require(isinstance(row, dict), f'{name}: malformed review row')
            qid = row.get('questionId')
            require(isinstance(qid, str) and qid in expected and qid not in seen,
                    f'{name}: duplicate or unknown question')
            seen.add(qid)
            qa = expected[qid]
            checksum = hashlib.sha256(json.dumps(qa, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
            require(row.get('id') == f'{name}:{qid}:{checksum}', f'{name}/{qid}: row checksum mismatch')
            require(row.get('qa') == qa, f'{name}/{qid}: reviewed QA differs from canonical QA')
            require(row.get('decision') == 'approved', f'{name}/{qid}: decision is not approved')
            timestamp(row.get('updatedAt'), f'{name}/{qid}/updatedAt')
        # This also binds every conversation, session ID and timestamp, not just QA.
        require(project.get('approvedCombined') == combined,
                f'{name}: approved combined export differs from canonical export')
        approved[name] = {'source_revision': revision, 'approved_questions': len(rows)}
    return {'status': APPROVED, 'path': REVIEW_PATH.as_posix(),
            'sha256': hashlib.sha256(raw).hexdigest(), 'exported_at': review['exportedAt'],
            'projects': approved}


if __name__ == '__main__':
    approval = validate_saved_review(Path(__file__).resolve().parents[1])
    require(approval is not None, 'no saved review')
    print(json.dumps(approval, indent=2))
