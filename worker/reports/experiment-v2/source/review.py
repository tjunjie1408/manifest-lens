"""Experiment review queue: automated evidence is never human approval."""
POLICY_VERSION = 'experiment-human-signoff-v1'


def review_entry(email_id, record, classification):
    reasons = []
    if classification.get('review_recommended') or classification.get('category') is None and classification.get('method') == 'unresolved_rules':
        reasons.append('classification_uncertain')
    if record['category'] == 'BL_COMPARISON':
        if record['status'] == 'NEEDS_REVIEW':
            reasons.append(record.get('review_reason') or 'incomplete_comparison')
        elif record['status'] == 'MISMATCH':
            reasons.append('confirm_discrepancies')
        else:
            reasons.append('verify_automated_match')
    if not reasons:
        return None
    return {
        'email_id': email_id,
        'review_state': 'PENDING',
        'reviewer': None,
        'reviewed_at': None,
        'policy_version': POLICY_VERSION,
        'automated_category': record['category'],
        'automated_status': record['status'],
        'reasons': reasons,
        'evidence_file': 'audit.json',
        'evidence_key': email_id,
    }
