"""Explainable rule classification for shipping documents.

Raw values remain evidence. Embeddings never decide numeric/entity equality.
"""
import re
import unicodedata
from decimal import Decimal, InvalidOperation

FIELDS = ('shipper', 'consignee', 'notify_party', 'port_of_loading',
          'port_of_discharge', 'container_count', 'gross_weight_kg')
ALIASES = {
    'shipper': ('shipper', 'shipper exporter', 'shipper principal or seller', 'exporter', 'from'),
    'consignee': ('consignee', 'consignee to order', 'consignee non negotiable', 'to the order of', 'consigned to'),
    'notify_party': ('notify party', 'notify', 'notify address', 'also notify'),
    'port_of_loading': ('port of loading', 'port of loading pol', 'pol', 'load port', 'loading port'),
    'port_of_discharge': ('port of discharge', 'port of discharge pod', 'pod', 'discharge port', 'destination port'),
    'container_count': ('container count', 'no of containers', 'number of containers', 'no of containers or packages', 'containers', 'no of pkgs containers', 'quantity of containers', 'total containers'),
    'gross_weight_kg': ('gross weight', 'gross weight kg', 'gross weight kgs', 'gross wt', 'gross wt kg', 'gross wt kgs', 'total gross weight', 'total gross weight kg', 'total gross weight kgs', 'total gross wt kgs', 'total gross wt kg', 'weight kg'),
}


def normalize_text(text):
    # Normalize with NFKC, casefold, punctuation removal, and whitespace collapse.
    text = unicodedata.normalize('NFKC', text).casefold()
    text = ''.join(' ' if unicodedata.category(c).startswith('P') else c for c in text)
    return ' '.join(text.split())


def contains(text, term):
    return re.search(rf'(?<!\w){re.escape(term)}(?!\w)', text) is not None


def classify_rule(subject, body):
    terms = {
        'BL_COMPARISON': ('to confirm docs', 'request bl draft', 'draft bl', 'draft bill of lading', 'bl comparison', 'compare bl', 'semak bl', 'semak draf'),
        'SI_REQUEST': ('request si', 'si needed', 'cust si', 'shipping instructions', 'send si', 'submit si', 'arahan penghantaran'),
        'INVOICE_QUERY': ('invoice', 'billing', 'local charges', 'd d charges', 'total freight', 'invois'),
        'GENERAL': ('update summary', 'berthing report', 'sla', 'holiday', 'rpa'),
        'SPAM': ('prize', 'mailbox full', 'verify your account', 'parcel fee', 'lottery', 'winner', 'claim your', 'password expires'),
    }
    # Subject expresses current intent; quoted history is lower-priority evidence.
    for origin, text in (('subject', subject), ('body', body.split('-----Original Message-----')[0])):
        normalized = normalize_text(text)
        matches = {cat: [term for term in values if contains(normalized, term)] for cat, values in terms.items()}
        if origin == 'subject' and re.match(r'^(re\s+|fw\s+|fwd\s+)*si\b', normalized):
            matches['SI_REQUEST'].append('subject starts with SI')
        active = {cat: values for cat, values in matches.items() if values}
        if active:
            highest = max(map(len, active.values()))
            winners = [cat for cat, values in active.items() if len(values) == highest]
            if len(winners) == 1:
                cat = winners[0]
                return {'category': cat, 'method': 'shipping_rules', 'evidence': active[cat], 'source': origin}
    return {'category': None, 'method': 'unresolved_rules', 'evidence': []}


def canonical(field, raw):
    value = unicodedata.normalize('NFKC', raw).strip()
    norm = normalize_text(value)
    if not norm or norm in ('tba', 'tbc', 'n a', 'na', 'unknown', 'none', 'null', 'not available'):
        return None
    if field == 'container_count':
        match = re.fullmatch(r"\s*(\d+)\s*(?:[xX×]\s*\d{2}\s*['’\"]?\s*[A-Za-z]*)?\s*", value)
        return str(int(match[1])) if match else None
    if field == 'gross_weight_kg':
        match = re.fullmatch(r'\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|kgs|kilograms?|mt|tonnes?|tons?)?\s*', value, re.I)
        if not match:
            return None
        try:
            number = Decimal(match[1].replace(',', ''))
            if (match[2] or 'kg').lower() in ('mt', 'tonne', 'tonnes', 'ton', 'tons'):
                number *= 1000
            return str(number.normalize())
        except InvalidOperation:
            return None
    return norm


def document_type(rows):
    heading = normalize_text(' '.join(r['text'] for r in rows[:12]))
    if any(x in heading for x in ('commercial invoice', 'packing list', 'certificate of origin')):
        return 'OTHER'
    if any(x in heading for x in ('bill of lading instruction', 'bl instruction', 'shipping instruction')):
        return 'SI'
    if 'bill of lading' in heading:
        return 'BL'
    if 'shipping instruction' in heading:
        return 'SI'
    return 'UNKNOWN'


def extract_fields(rows):
    aliases = {alias: field for field, values in ALIASES.items() for alias in values}
    found = {field: [] for field in FIELDS}
    current = None
    in_container_table = False
    boundaries = ('ocean vessel', 'vessel', 'vessel name', 'voy no', 'export carrier vessel voyage', 'description', 'description of goods', 'hs code', 'freight', 'commodity')
    for row in rows:
        text = row['text'].strip()
        parts = re.split(r'\s*[:：]\s*|\t+', text, maxsplit=1)
        key = normalize_text(re.sub(r'\([^)]*[\u3400-\u9fff][^)]*\)', '', parts[0]))
        if key == 'container no':
            in_container_table = True
            current = None
        if in_container_table:
            if len(parts) == 2 and key in aliases:
                in_container_table = False
            else:
                continue
        if any(key == b or key.startswith(b + ' ') for b in boundaries):
            current = None
            continue
        if len(parts) == 2:
            current = aliases.get(key)
            if current:
                found[current].append({'raw': parts[1].strip(), 'evidence': [row]})
        elif key in aliases:
            current = aliases[key]
            found[current].append({'raw': '', 'evidence': [row]})
        elif current and found[current] and (not found[current][-1]['raw'] or current in ('shipper', 'consignee', 'notify_party')) and text and not re.fullmatch(r'[-=]+', text):
            # Value on a following line, or continuation of an entity address.
            entry = found[current][-1]
            entry['raw'] = (entry['raw'] + ' ' + text).strip()
            entry['evidence'].append(row)
    result = {}
    for field, entries in found.items():
        values = [canonical(field, e['raw']) for e in entries]
        unique = set(values)
        value = values[0] if len(unique) == 1 and values else None
        issue = 'ambiguous_value' if len(unique) > 1 else ('missing_value' if value is None else None)
        result[field] = {'raw': [e['raw'] for e in entries], 'canonical': value,
                         'issue': issue, 'evidence': [r for e in entries for r in e['evidence']]}
    return result


def compare_documents(si, bl):
    base = {'status': 'NEEDS_REVIEW', 'review_reason': None, 'defect_fields': [], 'has_defect': False}
    if not si or not bl:
        return {**base, 'review_reason': 'missing_attachment'}
    if document_type(si) != 'SI' or document_type(bl) != 'BL':
        return {**base, 'review_reason': 'wrong_doc_type'}
    left, right = extract_fields(si), extract_fields(bl)
    evidence = {f: {'si': left[f], 'bl': right[f], 'outcome': 'unknown' if left[f]['canonical'] is None or right[f]['canonical'] is None else ('match' if left[f]['canonical'] == right[f]['canonical'] else 'mismatch')} for f in FIELDS}
    missing = [f for f in FIELDS if evidence[f]['outcome'] == 'unknown']
    defects = [f for f in FIELDS if evidence[f]['outcome'] == 'mismatch']
    if missing:
        return {**base, 'review_reason': 'missing_value', 'fields': evidence, 'known_mismatches': defects}
    return {**base, 'status': 'MISMATCH' if defects else 'OK', 'defect_fields': defects, 'has_defect': bool(defects), 'fields': evidence}
