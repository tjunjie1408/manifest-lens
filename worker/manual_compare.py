"""JSON stdin/stdout bridge. No model loading, network or state mutation."""
import json
import sys
from shipping import FIELDS, canonical, extract_fields, compare_field_sets


def recompute(audit, request):
    base = {'status':'NEEDS_REVIEW','review_reason':None,'defect_fields':[],'has_defect':False}
    if request['category'] != 'BL_COMPARISON':
        return {**base,'status':'NOT_APPLICABLE'}
    paths = (request['siPath'], request['blPath'])
    if not all(paths):
        return {**base,'review_reason':'missing_attachment'}
    if paths[0] == paths[1]:
        raise ValueError('SI and BL must be different documents')
    documents = {d['path']:d for d in audit['documents']}
    if any(path not in documents for path in paths):
        raise ValueError('Document is not in the original evidence')
    sides = {side:extract_fields(documents[path]['rows']) for side,path in zip(('si','bl'),paths,strict=True)}
    for key, edit in request['edits'].items():
        side, field = key.split('.',1)
        if side not in sides or field not in FIELDS or not edit['source'].strip():
            raise ValueError('Invalid correction or missing source')
        value = canonical(field,edit['value'])
        sides[side][field] = {'raw':[edit['value']], 'canonical':value,
            'issue':'missing_value' if value is None else None,
            'evidence':[{'file':paths[0 if side=='si' else 1], 'location':edit['source'], 'text':edit['value']}]}
    return compare_field_sets(sides['si'],sides['bl'])


if __name__=='__main__':
    payload=json.load(sys.stdin)
    print(json.dumps(recompute(payload['audit'],payload['input']),ensure_ascii=False))
