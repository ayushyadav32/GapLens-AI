import os
import sys
import django
import io

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import pymupdf as fitz
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from research.models import ResearchSession, SourceDocument, DocumentPage
from research.ingestion import validate_url_ssrf
from django.core.exceptions import ValidationError

client = APIClient()

print("========================================")
print("TEST 1: RESEARCH SESSION CREATION & RETRIEVAL")
print("========================================")
create_res = client.post('/api/research/sessions/', {
    'title': 'Test Renewable Energy Subsidies',
    'query': 'What are the unstated tax caveats in federal solar grants?',
    'objective': 'Identify eligibility cutoffs and conflicting state provisions.',
    'context': 'IRS Section 48E and state utility filings.'
}, format='json')

assert create_res.status_code == 201, f"Failed: {create_res.data}"
session_id = create_res.data['id']
print(f"Session created successfully: ID = {session_id}")
assert create_res.data['title'] == 'Test Renewable Energy Subsidies'
assert create_res.data['objective'] == 'Identify eligibility cutoffs and conflicting state provisions.'

list_res = client.get('/api/research/sessions/')
assert list_res.status_code == 200
assert any(s['id'] == session_id for s in list_res.data['results'])
print(f"Session list returned {list_res.data['count']} sessions.")

print("\n========================================")
print("TEST 2: SSRF PROTECTION")
print("========================================")
ssrf_test_urls = [
    'http://127.0.0.1:8000/secret',
    'http://localhost/admin',
    'http://169.254.169.254/latest/meta-data/',
    'http://0.0.0.0:80/',
    'ftp://example.com/file.txt',
]

for bad_url in ssrf_test_urls:
    try:
        validate_url_ssrf(bad_url)
        assert False, f"Expected validation error for dangerous URL: {bad_url}"
    except ValidationError as e:
        print(f"SSRF correctly blocked '{bad_url}': {e.message if hasattr(e, 'message') else e}")

print("\n========================================")
print("TEST 3: MULTI-PAGE PDF INGESTION & PARSING")
print("========================================")
# Generate a real 2-page PDF in memory using PyMuPDF
doc = fitz.open()
page1 = doc.new_page()
page1.insert_text((50, 100), "Confidential Energy Policy Report Page 1\nSection 48E mandates 30% investment tax credit.")
page2 = doc.new_page()
page2.insert_text((50, 100), "Section 48E Subclause B: Excludes projects interconnecting after December 31, 2026.")
pdf_bytes = doc.tobytes()
doc.close()

uploaded_pdf = SimpleUploadedFile("energy_policy.pdf", pdf_bytes, content_type="application/pdf")

pdf_res = client.post(
    f'/api/research/sessions/{session_id}/sources/',
    {'source_type': 'pdf', 'files': [uploaded_pdf]},
    format='multipart'
)
assert pdf_res.status_code == 201, f"Failed PDF upload: {pdf_res.data}"
pdf_source_id = pdf_res.data['created'][0]['id']
print(f"PDF source created with ID: {pdf_source_id}")
assert pdf_res.data['created'][0]['page_count'] == 2

# Verify DocumentPage records
pages = DocumentPage.objects.filter(document_id=pdf_source_id)
assert pages.count() == 2, f"Expected 2 pages, got {pages.count()}"
print(f"Verified {pages.count()} DocumentPage records with extracted text:")
for p in pages:
    print(f" - Page {p.page_number} ({p.char_count} chars): {p.page_text[:60]}...")

print("\n========================================")
print("TEST 4: DUPLICATE CONTENT DETECTION")
print("========================================")
# Re-upload the exact same PDF
uploaded_dup = SimpleUploadedFile("energy_policy_copy.pdf", pdf_bytes, content_type="application/pdf")
dup_res = client.post(
    f'/api/research/sessions/{session_id}/sources/',
    {'source_type': 'pdf', 'files': [uploaded_dup]},
    format='multipart'
)
print(f"Duplicate upload response: {dup_res.data}")
assert len(dup_res.data['skipped_duplicates']) == 1
print("Duplicate content correctly skipped based on SHA-256 hash matching!")

print("\n========================================")
print("TEST 5: MANUAL TEXT INGESTION")
print("========================================")
manual_res = client.post(
    f'/api/research/sessions/{session_id}/sources/',
    {
        'source_type': 'manual',
        'title': 'State Utility Commission Hearing Notes',
        'text': 'At the public hearing on January 14, 2026, Commissioner Vance stated that grid connection queues are frozen through 2027.',
        'publication_date': '2026-01-14'
    },
    format='json'
)
assert manual_res.status_code == 201, f"Failed manual text: {manual_res.data}"
manual_source_id = manual_res.data['created'][0]['id']
print(f"Manual text source created: ID = {manual_source_id}")

print("\n========================================")
print("TEST 6: SOURCE DETAIL & PAGES RETRIEVAL")
print("========================================")
detail_res = client.get(f'/api/research/sources/{pdf_source_id}/')
assert detail_res.status_code == 200
assert len(detail_res.data['pages']) == 2
print(f"Source detail successfully retrieved with {len(detail_res.data['pages'])} pages.")

print("\n========================================")
print("TEST 7: DEMO INVESTIGATION SEEDING")
print("========================================")
demo_res = client.post('/api/research/demo-investigation/', {}, format='json')
assert demo_res.status_code in (200, 201), f"Failed demo: {demo_res.data}"
demo_session = demo_res.data['session']
print(f"Demo investigation created: {demo_session['title']}")
assert len(demo_session['sources']) == 3
for s in demo_session['sources']:
    assert 'ILLUSTRATIVE' in s['metadata'].get('disclaimer', '')
    print(f" - [{s['source_type']}] {s['title'][:50]}... ({s['word_count']} words)")

print("\n========================================")
print("TEST 8: CLEANUP / SOURCE DELETION")
print("========================================")
del_res = client.delete(f'/api/research/sources/{manual_source_id}/')
assert del_res.status_code == 200
assert not SourceDocument.objects.filter(id=manual_source_id).exists()
print("Source deleted successfully.")

print("\n>>> ALL 8 BACKEND INGESTION AND SECURITY TESTS PASSED PERFECTLY! <<<")
