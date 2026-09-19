import pytest
from manual_compare import recompute
from test_shipping import doc


def sample():
    return {'documents':[{'path':'si.txt','rows':doc('SHIPPING INSTRUCTION')},{'path':'bl.txt','rows':doc('BILL OF LADING')}]}


def test_manual_override_recomputes_without_mutating_original():
    audit=sample()
    result=recompute(audit,{'category':'BL_COMPARISON','siPath':'si.txt','blPath':'bl.txt','edits':{'bl.gross_weight_kg':{'value':'1001 KG','source':'page 1 total'}}})
    assert result['status']=='MISMATCH'
    assert result['fields']['gross_weight_kg']['bl']['evidence'][0]['location']=='page 1 total'
    assert audit==sample()


def test_missing_document_cannot_be_created_by_typing_values():
    result=recompute({'documents':[]},{'category':'BL_COMPARISON','siPath':'','blPath':'','edits':{}})
    assert result['status']=='NEEDS_REVIEW'


def test_same_document_cannot_be_both_sides():
    with pytest.raises(ValueError):
        recompute(sample(),{'category':'BL_COMPARISON','siPath':'si.txt','blPath':'si.txt','edits':{}})


def test_explicit_reclassification_is_not_a_match():
    assert recompute(sample(),{'category':'GENERAL','siPath':'','blPath':'','edits':{}})['status']=='NOT_APPLICABLE'
