from dataset_paths import DATA_ROOT
import json
from collections import Counter
from pathlib import Path

DATA = DATA_ROOT
spec = json.loads((DATA / 'annotation-spec.json').read_text())
conversation, lookup = {}, {}
for number in range(1, 5):
    label = f'D{number}'
    source = json.loads((DATA / label / 'source-map.json').read_text())
    messages = json.loads((DATA / label / 'cleaned-chat.json').read_text())
    conversation[f'session_{number}_date_time'] = source['session_start_utc']
    conversation[f'session_{number}'] = messages
    for origin, message in zip(source['messages'], messages):
        lookup[(label, origin['original_message_id'])] = message
qa, dependencies = [], []
for item in spec:
    evidence, cited_ids = [], []
    for cite in item['citations']:
        message = lookup[(cite['session'], cite['original_message_id'])]
        assert cite['excerpt'] in message['text'], (item['question_id'], cite)
        evidence.append(f'{message["dia_id"]}: "{cite["excerpt"]}"')
        cited_ids.append(message['dia_id'])
    qa.append({**{key:item[key] for key in ('question','category','answer')}, 'evidence': evidence})
    dependencies.append({'question_id':item['question_id'], 'evidence_dia_ids':list(dict.fromkeys(cited_ids)), 'requires_answers':item['requires_answers']})
assert len(qa) >= 50
combined = [{'sample_id':'vibe_focus_desk','dataset':'vibe_focus_desk','num_sessions':4,'conversation':conversation,'qa':qa}]
counts = Counter(label for item in qa for label in item['category'])
outputs = {'vibe_combined.json':combined,'annotations.json':qa,'question-dependencies.json':dependencies,
    'category-distribution.json':{'question_count':len(qa),'counts':dict(sorted(counts.items())), 'percentages':{label:round(100*count/len(qa),1) for label,count in sorted(counts.items())}}}
for filename,data in outputs.items():
    (DATA/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {len(qa)} questions; {dict(sorted(counts.items()))}')
