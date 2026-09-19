from pathlib import Path
import pytest
from evaluate import prepare_output
from review import review_entry


def test_run_directory_cannot_overwrite_previous_evidence(tmp_path):
    output = tmp_path / 'experiment'
    assert prepare_output(output) == output
    report = output / 'submission.json'
    report.write_text('original evidence')
    with pytest.raises(FileExistsError):
        prepare_output(output)
    assert report.read_text() == 'original evidence'


@pytest.mark.parametrize('status', ['OK', 'MISMATCH', 'NEEDS_REVIEW'])
def test_comparison_result_requires_signoff_in_experiment(status):
    record = {'category': 'BL_COMPARISON', 'status': status, 'review_reason': 'missing_value' if status == 'NEEDS_REVIEW' else None}
    entry = review_entry('case-a', record, {'method': 'shipping_rules'})
    assert entry['review_state'] == 'PENDING'
    assert entry['reviewer'] is None
    assert entry['automated_status'] == status


def test_semantic_noncomparison_still_enters_review_queue():
    entry = review_entry('case-b', {'category': 'GENERAL', 'status': 'OK'}, {'review_recommended': True})
    assert 'classification_uncertain' in entry['reasons']


def test_clear_noncomparison_is_not_a_document_approval():
    assert review_entry('case-c', {'category': 'GENERAL', 'status': 'OK'}, {'category': 'GENERAL'}) is None
