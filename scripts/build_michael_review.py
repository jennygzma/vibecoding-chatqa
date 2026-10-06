#!/usr/bin/env python3
"""Create a current, checksum-bound human review bundle, not a legacy draft."""
import argparse
import json
from pathlib import Path
from michael_dataset import PROJECTS, build, digest, read, row_digest
from michael_approval import APPROVED, validate_saved_review

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'projects/annotation-review/data.json'


def bundle():
    approval = validate_saved_review(ROOT)
    projects = []
    for project, title in PROJECTS.items():
        build(ROOT, project, check=True)
        folder = ROOT / 'data' / project
        sample = read(folder / 'vibe_combined.json')[0]
        report = read(folder / 'reevaluation-review.json')
        reviews = read(folder / 'annotation-semantic-review.json')
        previous = read(folder / 'revisions/before-full-reevaluation/annotations.json')
        items = []
        for index, (qa, audit, review) in enumerate(zip(sample['qa'], report['questions'], reviews)):
            qid = f'Q{index + 1:03d}'
            items.append({'id': f'{project}:{qid}:{row_digest(qa)}', 'questionId': qid,
                          'qa': qa, 'audit': audit, 'review': review,
                          'previous': previous[index] if index < len(previous) else None})
        projects.append({'id': project, 'title': title,
                         'status': APPROVED if approval else 'human-review-pending',
                         'revision': digest((folder / 'annotations.json').read_bytes()),
                         'sample': sample, 'items': items,
                         'categories': read(folder / 'category-distribution.json'),
                         'sessions': read(folder / 'session-index.json')})
    return {'format': 'michael-review-v3', 'status': APPROVED if approval else 'human-review-pending',
            'human_review': approval,
            'reference': report['reference'], 'projects': projects}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    value = bundle()
    if args.check:
        if read(OUTPUT) != value:
            raise SystemExit('Review bundle is stale; rebuild it.')
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
    print('Review bundle:', ', '.join(f'{p["title"]} {len(p["items"])}' for p in value['projects']))


if __name__ == '__main__':
    main()
