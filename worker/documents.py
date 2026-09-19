"""Local readers with a source location on every extracted text row."""
import io
from pathlib import PurePosixPath
import zipfile
from xml.etree import ElementTree as ET


def read_document(path, data):
    suffix = PurePosixPath(path).suffix.lower()
    if not data:
        raise ValueError('empty attachment')
    rows = []
    def add(text, location):
        if text.strip():
            rows.append({'text': text, 'file': path, 'location': location})
    if suffix == '.txt':
        for i, line in enumerate(data.decode('utf-8-sig').splitlines(), 1):
            add(line, f'line {i}')
    elif suffix == '.pdf':
        from pypdf import PdfReader
        for p, page in enumerate(PdfReader(io.BytesIO(data)).pages, 1):
            for i, line in enumerate((page.extract_text() or '').splitlines(), 1):
                add(line, f'page {p}, extracted line {i}')
    elif suffix == '.xlsx':
        from openpyxl import load_workbook
        workbook = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        try:
            for sheet in workbook:
                for row in sheet:
                    cells = [cell for cell in row if cell.value is not None]
                    if cells:
                        add('\t'.join(str(c.value) for c in cells), f'{sheet.title}!{cells[0].coordinate}:{cells[-1].coordinate}')
        finally:
            workbook.close()
    elif suffix == '.docx':
        namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            root = ET.fromstring(archive.read('word/document.xml'))
        body = root.find('w:body', namespace)
        for i, child in enumerate(body, 1):
            if child.tag.endswith('}tbl'):
                for j, row in enumerate(child.findall('w:tr', namespace), 1):
                    cells = [' '.join(t.text or '' for t in cell.findall('.//w:t', namespace)) for cell in row.findall('w:tc', namespace)]
                    add('\t'.join(cells), f'block {i}, table row {j}')
            else:
                add(' '.join(t.text or '' for t in child.findall('.//w:t', namespace)), f'paragraph {i}')
    else:
        raise ValueError(f'unsupported format: {suffix}')
    if not rows:
        raise ValueError('no readable text; OCR or manual review required')
    return rows
