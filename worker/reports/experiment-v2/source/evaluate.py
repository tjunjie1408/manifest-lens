"""Reproducible first baseline. Only public inbox/attachment HTTP endpoints are read.

Ground truth is accessible exclusively inside the organizer's scoring server.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import time
from urllib.request import Request, urlopen

from semantic_matching.embeddings import SentenceTransformerProvider, cosine_similarity
from documents import read_document
from review import review_entry
from shipping import classify_rule, compare_documents, document_type, normalize_text

MODEL_REVISION = '614241f622f53c4eeff9890bdc4f31cfecc418b3'
PROTOTYPES = {
    'BL_COMPARISON': 'Please check and compare the draft bill of lading BL with the attached shipping instruction SI, confirm or amend the shipping documents.',
    'SI_REQUEST': 'Please provide and submit the shipping instructions SI for our booking before the documentation deadline.',
    'INVOICE_QUERY': 'Query about billing, invoice cancellation, missing goods receipt, freight payment and local shipping charges.',
    'GENERAL': 'General operational notice, berthing schedule, summary report, holiday or staff announcement.',
    'SPAM': 'Suspicious unsolicited email asking to claim a prize, verify a password, pay a parcel fee or unlock a full mailbox.',
}


def request_json(url, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    with urlopen(Request(url, data=data, headers={'Content-Type': 'application/json'}), timeout=60) as response:
        return json.load(response)


def prepare_output(path):
    output = Path(path)
    output.mkdir(parents=True, exist_ok=False)
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--server', default='http://localhost:8080')
    parser.add_argument('--output', default='reports/baseline-v1')
    parser.add_argument('--model-path', default=str(Path.home() / '.cache/huggingface/hub/models--intfloat--multilingual-e5-small/snapshots' / MODEL_REVISION))
    parser.add_argument('--rules-only', action='store_true')
    args = parser.parse_args()
    out = prepare_output(args.output)
    source_files = ('shipping.py', 'documents.py', 'evaluate.py', 'review.py', 'semantic_matching/embeddings.py', 'uv.lock')
    source_hashes = {}
    for name in source_files:
        content = Path(name).read_bytes()
        snapshot = out / 'source' / name
        snapshot.parent.mkdir(parents=True, exist_ok=True)
        snapshot.write_bytes(content)
        source_hashes[name] = hashlib.sha256(content).hexdigest()
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    started = time.perf_counter()
    emails = request_json(args.server + '/emails')
    predictions = [classify_rule(e['subject'], e['body']) for e in emails]
    unresolved = [i for i, p in enumerate(predictions) if p['category'] is None]
    if unresolved and not args.rules_only:
        import torch
        torch.set_num_threads(min(4, os.cpu_count() or 1))
        provider = SentenceTransformerProvider.for_runtime(args.model_path, 'shipping-text-v1', expected_dimension=384)
        categories = list(PROTOTYPES)
        # E5 recommends query prefixes for symmetric semantic tasks including classification.
        references = provider.embed(['query: ' + PROTOTYPES[c] for c in categories])
        texts = ['query: ' + normalize_text(emails[i]['subject'] + '\n' + emails[i]['body']) for i in unresolved]
        vectors = provider.embed(texts)
        for i, vector in zip(unresolved, vectors, strict=True):
            scores = sorted(((c, cosine_similarity(vector, ref)) for c, ref in zip(categories, references, strict=True)), key=lambda x: x[1], reverse=True)
            predictions[i] = {'category': scores[0][0], 'method': 'shipping_e5_prototype',
                              'similarities': dict(scores), 'margin': scores[0][1] - scores[1][1],
                              'review_recommended': True, 'note': 'Uncalibrated similarity, not probability. No shipping training performed.'}
    submission, audit, review_queue = {}, {}, []
    for email, classification in zip(emails, predictions, strict=True):
        category = classification['category'] or 'GENERAL'
        result = {'status': 'OK', 'review_reason': None, 'defect_fields': [], 'has_defect': False}
        documents, errors = [], []
        if category == 'BL_COMPARISON':
            for path in email['attachments']:
                try:
                    # Only use observed public attachment paths, never local answer-key files.
                    if not path.startswith('attachments/') or '..' in path.split('/'):
                        raise ValueError('invalid attachment path')
                    with urlopen(args.server + '/' + path, timeout=60) as response:
                        data = response.read()
                    rows = read_document(path, data)
                    documents.append({'path': path, 'sha256': hashlib.sha256(data).hexdigest(), 'type': document_type(rows), 'rows': rows})
                except Exception as exc:
                    errors.append({'file': path, 'error': type(exc).__name__, 'detail': str(exc)})
            si = [d for d in documents if d['type'] == 'SI']
            bl = [d for d in documents if d['type'] == 'BL']
            if errors:
                result.update(status='NEEDS_REVIEW', review_reason='unreadable')
            elif any(d['type'] in ('OTHER', 'UNKNOWN') for d in documents):
                result.update(status='NEEDS_REVIEW', review_reason='wrong_doc_type')
            elif len(si) > 1 or len(bl) > 1:
                result.update(status='NEEDS_REVIEW', review_reason='ambiguous_document_pair')
            else:
                result = compare_documents(si[0]['rows'] if si else [], bl[0]['rows'] if bl else [])
        record = {'category': category, **result}
        review = review_entry(email['email_id'], record, classification)
        if review is not None:
            review_queue.append(review)
        submission[email['email_id']] = {k: record[k] for k in ('category', 'status', 'review_reason', 'defect_fields', 'has_defect')}
        audit[email['email_id']] = {'subject': email['subject'], 'classification': classification,
                                  'comparison_applicable': category == 'BL_COMPARISON',
                                  'human_review': review,
                                  'documents': documents, 'errors': errors, **record}
    def write(name, value):
        (out / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    # Freeze predictions before scoring. Do not optimize against this score in the same run.
    write('submission.json', submission)
    write('audit.json', audit)
    write('review_queue.json', review_queue)
    score = request_json(args.server + '/submit', submission)
    write('score.json', score)
    metadata = {'timestamp_utc': datetime.now(timezone.utc).isoformat(), 'python': platform.python_version(),
                'emails': len(emails), 'pending_review': len(review_queue), 'upstream_commit': 'fadf77b8db2943427bc46db471650c7f166f40bc',
                'model_revision': None if args.rules_only else MODEL_REVISION,
                'semantic_fallback_count': 0 if args.rules_only else len(unresolved),
                'duration_seconds': round(time.perf_counter() - started, 2),
                'categories': dict(Counter(p['category'] for p in submission.values())),
                'statuses': dict(Counter(p['status'] for p in submission.values())),
                'review_reasons': dict(Counter(p['review_reason'] for p in submission.values() if p['review_reason'])),
                'evaluation_type': 'exploratory supplied benchmark; not held-out generalization',
                'submission_sha256': hashlib.sha256((out / 'submission.json').read_bytes()).hexdigest(),
                'source_sha256': source_hashes}
    write('run.json', metadata)
    print(json.dumps({'run': metadata, 'score': score}, indent=2))


if __name__ == '__main__':
    main()
