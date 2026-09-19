import pytest
from shipping import classify_rule, extract_fields, compare_documents, canonical


def test_shipping_email_intent_without_attachments():
    assert classify_rule('Please compare draft BL against SI', '')['category'] == 'BL_COMPARISON'
    assert classify_rule('REQUEST SI', 'Please send shipping instructions')['category'] == 'SI_REQUEST'
    assert classify_rule('LOCAL CHARGES', 'Please check invoice amount')['category'] == 'INVOICE_QUERY'


def test_unknown_is_not_equality():
    result = compare_documents([], [])
    assert result['status'] == 'NEEDS_REVIEW'
    assert result['review_reason'] == 'missing_attachment'


def test_values_preserve_meaning():
    assert canonical('gross_weight_kg', '21,577 KG') == canonical('gross_weight_kg', '21.577 tonnes')
    assert canonical('gross_weight_kg', '21,577 KG') != canonical('gross_weight_kg', '21,578 KG')
    assert canonical('container_count', "2 x 40'HC") == '2'
    assert canonical('container_count', "2 x 20 + 1 x 40") is None
    assert canonical('shipper', 'TBA') is None
    assert canonical('shipper', 'ABC 1 SDN BHD') != canonical('shipper', 'ABC 2 SDN BHD')


def test_duplicate_and_missing_fields_cannot_pass():
    rows = [{'text': 'Consignee: Alpha', 'location': 'line 1'},
            {'text': 'Consignee: Beta', 'location': 'line 2'}]
    fields = extract_fields(rows)
    assert fields['consignee']['canonical'] is None
    assert fields['consignee']['issue'] == 'ambiguous_value'


def doc(kind, weight='1000 KG'):
    lines = [kind, 'Shipper: ABC 1', 'Consignee: XYZ', 'Notify Party: XYZ',
             'Port of Loading: PORT KLANG (MYPKG)', 'Port of Discharge: SINGAPORE (SGSIN)',
             'Container Count: 2', f'Gross Weight: {weight}']
    return [{'text': text, 'location': f'line {i+1}'} for i, text in enumerate(lines)]


def test_known_equal_and_real_mismatch():
    assert compare_documents(doc('SHIPPING INSTRUCTION'), doc('BILL OF LADING'))['status'] == 'OK'
    result = compare_documents(doc('SHIPPING INSTRUCTION'), doc('BILL OF LADING', '1001 KG'))
    assert result['defect_fields'] == ['gross_weight_kg']
    assert result['status'] == 'MISMATCH'
    assert result['fields']['gross_weight_kg']['si']['evidence'][0]['location'] == 'line 8'


def test_missing_and_wrong_document_never_pass():
    assert compare_documents(doc('SHIPPING INSTRUCTION'), doc('COMMERCIAL INVOICE'))['review_reason'] == 'wrong_doc_type'
    assert compare_documents(doc('SHIPPING INSTRUCTION', '???'), doc('BILL OF LADING'))['status'] == 'NEEDS_REVIEW'


@pytest.mark.parametrize('label', ['Gross Weight毛重(KGS)', 'TOTAL Gross Weight毛重(KGS)'])
def test_bilingual_weight_labels(label):
    fields = extract_fields([{'text': f'{label}: 12,340 KG', 'location': 'line 1'}])
    assert fields['gross_weight_kg']['canonical'] == '1.234E+4'
    assert fields['gross_weight_kg']['evidence'][0]['text'].startswith(label)


def test_notify_alias_preserves_evidence():
    row = {'text': 'Notify Party/Intermediate Consignee: Meridian Paper Ltd', 'location': 'B7'}
    field = extract_fields([row])['notify_party']
    assert field['canonical'] == 'meridian paper ltd'
    assert field['evidence'] == [row]


def test_entity_layout_separator_equivalence_and_real_change():
    first = 'Meridian Paper Ltd | 12 Bay Road; Unit 9'
    second = 'Meridian Paper Ltd 12 Bay Road Unit 9'
    assert canonical('consignee', first) == canonical('consignee', second)
    assert canonical('consignee', first) != canonical('consignee', second.replace('12', '13'))
    # Do not strip embedded symbols indiscriminately from actual names.
    assert canonical('consignee', 'A|B Ltd') != canonical('consignee', 'AB Ltd')


def test_multiline_address_colon_is_not_a_new_field():
    rows = [
        {'text': 'Shipper: Meridian Paper Ltd', 'location': 'line 1'},
        {'text': '  P.O. BOX: 2468, Bay City', 'location': 'line 2'},
        {'text': 'Consignee: Other Ltd', 'location': 'line 3'},
    ]
    field = extract_fields(rows)['shipper']
    assert field['canonical'] == 'meridian paper ltd p o box 2468 bay city'
    assert [e['location'] for e in field['evidence']] == ['line 1', 'line 2']
    changed = [{**row, 'text': row['text'].replace('2468', '2469')} for row in rows]
    assert extract_fields(changed)['shipper']['canonical'] != field['canonical']


def test_numeric_cell_note_cannot_disappear():
    field = extract_fields([{'text': 'Gross Weight\t1000\tTBC', 'location': 'A1:C1'}])['gross_weight_kg']
    assert field['canonical'] is None


def test_review_keeps_known_discrepancies_when_another_field_is_missing():
    si = doc('SHIPPING INSTRUCTION')
    bl = doc('BILL OF LADING', '1001 KG')
    bl[2] = {**bl[2], 'text': 'Consignee: TBA'}
    result = compare_documents(si, bl)
    assert result['status'] == 'NEEDS_REVIEW'
    assert result['known_mismatches'] == ['gross_weight_kg']
    assert result['fields']['consignee']['outcome'] == 'unknown'
