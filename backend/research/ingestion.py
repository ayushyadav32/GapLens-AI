import re
import socket
import ipaddress
import hashlib
from urllib.parse import urlparse
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import pymupdf as fitz
from django.core.exceptions import ValidationError
from django.utils import timezone

BLOCKED_HOSTNAMES = {
    'localhost',
    'metadata.google.internal',
    'instance-data',
}

MAX_REDIRECTS = 3
REQUEST_TIMEOUT = 10  # seconds
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB
USER_AGENT = 'GapLensAI-ResearchBot/1.0 (+https://gaplens.ai/bot)'


def is_ip_restricted(ip_str: str) -> bool:
    """
    Check whether an IP address is private, loopback, link-local, multicast,
    or otherwise restricted from SSRF requests.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_multicast or
            ip.is_reserved or
            ip.is_unspecified or
            str(ip) == '169.254.169.254'
        )
    except ValueError:
        return True


def validate_url_ssrf(url: str) -> str:
    """
    Validate that a URL is safe to fetch and does not resolve to local,
    private, or cloud metadata endpoints.
    Returns the parsed normalized URL if safe, raises ValidationError if not.
    """
    if not url or not isinstance(url, str):
        raise ValidationError("URL must be a non-empty string.")

    url = url.strip()
    parsed = urlparse(url)

    if parsed.scheme.lower() not in ('http', 'https'):
        raise ValidationError(f"Invalid URL protocol '{parsed.scheme}'. Only HTTP and HTTPS are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise ValidationError("URL must include a valid hostname.")

    hostname_lower = hostname.lower()

    if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith('.local'):
        raise ValidationError(f"Access to restricted hostname '{hostname}' is forbidden for security.")

    # Resolve IP addresses for the hostname
    try:
        addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == 'https' else 80), proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise ValidationError(f"Could not resolve hostname '{hostname}': {str(e)}")

    if not addr_info:
        raise ValidationError(f"Hostname '{hostname}' did not resolve to any IP address.")

    for family, _, _, _, sockaddr in addr_info:
        ip_addr = sockaddr[0]
        if is_ip_restricted(ip_addr):
            raise ValidationError(
                f"Security block: Hostname '{hostname}' resolves to restricted IP address '{ip_addr}'."
            )

    return url


def safe_fetch_url(url: str) -> requests.Response:
    """
    Fetches a URL securely enforcing SSRF checks on initial URL and each redirect hop,
    with a strict hop limit and response size ceiling.
    """
    current_url = validate_url_ssrf(url)
    session = requests.Session()
    session.headers.update({
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    })

    hops = 0
    while hops <= MAX_REDIRECTS:
        try:
            # We set allow_redirects=False to manually inspect every hop
            response = session.get(
                current_url,
                timeout=REQUEST_TIMEOUT,
                allow_redirects=False,
                stream=True
            )
        except requests.exceptions.Timeout:
            raise ValidationError(f"Request to '{current_url}' timed out after {REQUEST_TIMEOUT}s.")
        except requests.exceptions.RequestException as e:
            raise ValidationError(f"Network error requesting '{current_url}': {str(e)}")

        # Handle redirects manually to re-verify SSRF
        if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
            hops += 1
            if hops > MAX_REDIRECTS:
                raise ValidationError(f"Too many redirects (exceeded maximum of {MAX_REDIRECTS}).")
            redirect_target = response.headers.get('Location')
            if not redirect_target:
                raise ValidationError("Redirect response missing 'Location' header.")
            
            # Resolve relative URLs if needed
            from urllib.parse import urljoin
            next_url = urljoin(current_url, redirect_target)
            current_url = validate_url_ssrf(next_url)
            continue

        # If not a redirect, read content with size cap
        content_length = response.headers.get('Content-Length')
        if content_length and int(content_length) > MAX_CONTENT_LENGTH:
            raise ValidationError(f"Content exceeds maximum allowable size of {MAX_CONTENT_LENGTH // (1024 * 1024)}MB.")

        # Read content safely in chunks
        content_bytes = bytearray()
        for chunk in response.iter_content(chunk_size=65536):
            content_bytes.extend(chunk)
            if len(content_bytes) > MAX_CONTENT_LENGTH:
                raise ValidationError("Response body exceeded 10MB stream limit.")

        # Re-attach content to response
        response._content = bytes(content_bytes)
        return response

    raise ValidationError("Exceeded redirect limit.")


def extract_metadata_from_html(soup: BeautifulSoup) -> dict:
    """
    Extracts published date, modified date, author, description from HTML meta tags.
    """
    meta_info = {
        'title': '',
        'published_date': None,
        'modified_date': None,
        'description': '',
        'author': '',
    }

    # Title extraction
    og_title = soup.find('meta', property='og:title') or soup.find('meta', attrs={'name': 'twitter:title'})
    if og_title and og_title.get('content'):
        meta_info['title'] = og_title['content'].strip()
    elif soup.title and soup.title.string:
        meta_info['title'] = soup.title.string.strip()
    elif soup.find('h1'):
        meta_info['title'] = soup.find('h1').get_text(strip=True)

    # Published date extraction
    date_candidates = [
        ('meta', {'property': 'article:published_time'}),
        ('meta', {'name': 'date'}),
        ('meta', {'name': 'pubdate'}),
        ('meta', {'name': 'publish-date'}),
        ('meta', {'name': 'DC.date.issued'}),
        ('meta', {'itemprop': 'datePublished'}),
        ('meta', {'property': 'og:published_time'}),
        ('meta', {'name': 'parsely-pub-date'}),
        ('meta', {'name': 'sailthru.date'}),
        ('time', {'pubdate': True}),
    ]

    for tag, attrs in date_candidates:
        match = soup.find(tag, attrs)
        if match:
            val = match.get('content') or match.get('datetime') or match.get_text(strip=True)
            if val:
                meta_info['published_date'] = val.strip()
                break

    # If still not found, check <time datetime="...">
    if not meta_info['published_date']:
        time_tag = soup.find('time', datetime=True)
        if time_tag and time_tag.get('datetime'):
            meta_info['published_date'] = time_tag['datetime'].strip()

    # Modified date extraction
    mod_candidates = [
        ('meta', {'property': 'article:modified_time'}),
        ('meta', {'name': 'last-modified'}),
        ('meta', {'itemprop': 'dateModified'}),
        ('meta', {'property': 'og:updated_time'}),
    ]
    for tag, attrs in mod_candidates:
        match = soup.find(tag, attrs)
        if match:
            val = match.get('content') or match.get('datetime')
            if val:
                meta_info['modified_date'] = val.strip()
                break

    # Description
    desc_tag = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', property='og:description')
    if desc_tag and desc_tag.get('content'):
        meta_info['description'] = desc_tag['content'].strip()

    # Author
    author_tag = soup.find('meta', attrs={'name': 'author'}) or soup.find('meta', property='article:author')
    if author_tag and author_tag.get('content'):
        meta_info['author'] = author_tag['content'].strip()

    return meta_info


def process_url_source(url: str) -> dict:
    """
    Ingests and cleans text from a web URL.
    Returns dictionary with extracted text, dates, title, hash, word count.
    """
    validated_url = validate_url_ssrf(url)
    response = safe_fetch_url(validated_url)

    if response.status_code >= 400:
        raise ValidationError(f"HTTP request returned status {response.status_code}.")

    # Content-type check
    content_type = response.headers.get('Content-Type', '').lower()
    if 'pdf' in content_type:
        # User supplied a direct link to a PDF
        return process_pdf_bytes(response.content, filename=validated_url.split('/')[-1] or "download.pdf", original_url=validated_url)

    soup = BeautifulSoup(response.text, 'lxml')

    meta = extract_metadata_from_html(soup)

    # Remove script, style, comments, and boilerplate tags
    for tag in soup(['script', 'style', 'noscript', 'svg', 'iframe', 'canvas']):
        tag.decompose()

    # Prefer main content area if available
    main_content = soup.find('main') or soup.find('article') or soup.find('div', id=re.compile(r'content|main|article', re.I))
    target = main_content if main_content else soup.body or soup

    # Get cleaned lines
    raw_text = target.get_text(separator='\n')
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    cleaned_text = '\n\n'.join(lines)

    if not cleaned_text:
        raise ValidationError("No readable text content could be extracted from the specified webpage.")

    # Calculate content hash and word count
    content_hash = hashlib.sha256(cleaned_text.encode('utf-8')).hexdigest()
    words = len(re.findall(r'\b\w+\b', cleaned_text))

    title = meta['title'] or urlparse(validated_url).netloc

    return {
        'source_type': 'url',
        'title': title[:300],
        'original_url': validated_url,
        'extracted_text': cleaned_text,
        'publication_date': meta['published_date'],
        'last_updated_date': meta['modified_date'],
        'fetched_at': timezone.now(),
        'content_hash': content_hash,
        'file_size': len(response.content),
        'page_count': 1,
        'word_count': words,
        'metadata': {
            'description': meta['description'],
            'author': meta['author'],
            'status_code': response.status_code,
            'content_type': content_type,
        },
        'pages': [{
            'page_number': 1,
            'page_text': cleaned_text,
            'char_count': len(cleaned_text),
            'metadata': {'url': validated_url}
        }]
    }


def process_pdf_bytes(file_bytes: bytes, filename: str = "document.pdf", original_url: str = "") -> dict:
    """
    Ingests and extracts text from a PDF file buffer using PyMuPDF (fitz).
    Enforces magic bytes verification, extracts each page individually.
    """
    if len(file_bytes) > 25 * 1024 * 1024:
        raise ValidationError("PDF file size exceeds maximum 25 MB limit.")

    # Magic byte check
    if not file_bytes.startswith(b'%PDF-'):
        raise ValidationError("Invalid PDF format. The uploaded file does not contain a valid %PDF- header.")

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise ValidationError(f"Unable to parse PDF document: {str(e)}")

    page_count = len(doc)
    if page_count == 0:
        raise ValidationError("The provided PDF has 0 readable pages.")

    pages_data = []
    full_text_list = []
    total_words = 0

    for idx, page in enumerate(doc):
        page_num = idx + 1
        page_text = page.get_text()
        cleaned_page_text = page_text.strip()
        
        pages_data.append({
            'page_number': page_num,
            'page_text': cleaned_page_text,
            'char_count': len(cleaned_page_text),
            'metadata': {
                'rect': [page.rect.x0, page.rect.y0, page.rect.x1, page.rect.y1]
            }
        })
        if cleaned_page_text:
            full_text_list.append(f"--- [Page {page_num}] ---\n{cleaned_page_text}")
            total_words += len(re.findall(r'\b\w+\b', cleaned_page_text))

    full_extracted_text = "\n\n".join(full_text_list)
    if not full_extracted_text.strip():
        # Scanned PDF or no text layer
        full_extracted_text = "[Notice: This PDF does not contain an embedded digital text layer or contains only scanned images. No textual characters were extracted.]"

    content_hash = hashlib.sha256(full_extracted_text.encode('utf-8')).hexdigest()

    # Extract PDF metadata if available
    pdf_meta = doc.metadata or {}
    meta_title = pdf_meta.get('title', '').strip()
    clean_filename = re.sub(r'^\d+[\s_-]*', '', filename).replace('.pdf', '').replace('_', ' ').replace('-', ' ').strip().title()

    # Determine specific title from text or filename
    title = clean_filename
    first_page_text = pages_data[0]['page_text'] if pages_data else ""
    first_page_header = first_page_text[:400].lower()
    filename_lower = filename.lower()

    if "state_addendum" in filename_lower or "state addendum" in filename_lower or "state addendum" in first_page_header:
        title = "State Addendum (AY 2026-27)"
    elif "central_program_notice" in filename_lower or "central program notice" in filename_lower or "central program notice" in first_page_header:
        title = "Central Program Notice (AY 2026-27)"
    elif "student_faq" in filename_lower or "faq" in filename_lower or "frequently asked questions" in first_page_header:
        title = "Student Frequently Asked Questions (AY 2026-27)"
    elif meta_title and len(meta_title) > 3 and meta_title != clean_filename:
        title = f"{meta_title} — {clean_filename}"

    # Extract human-readable publication date from document text
    pub_date = None
    pub_match = re.search(r'(?:Publication date|Published on|Date of issue|Date)[:\s\n]+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})', full_extracted_text, re.IGNORECASE)
    if pub_match:
        pub_date = pub_match.group(1).strip()
    else:
        # Fallback to date patterns like "01 October 2026"
        date_pattern = re.search(r'\b([0-9]{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+[0-9]{4})\b', full_extracted_text, re.IGNORECASE)
        if date_pattern:
            pub_date = date_pattern.group(1).strip()
        else:
            raw_meta_date = pdf_meta.get('creationDate') or ''
            if raw_meta_date.startswith('D:'):
                try:
                    # Parse D:YYYYMMDDHHmmSS
                    dt_str = raw_meta_date[2:10]
                    pub_date = datetime.strptime(dt_str, '%Y%m%d').strftime('%d %B %Y')
                except Exception:
                    pub_date = None

    # Academic cycle detection
    cycle_match = re.search(r'\b(?:AY|academic year)\s*([0-9]{4}[-–][0-9]{2,4})\b', full_extracted_text, re.IGNORECASE)
    academic_cycle = cycle_match.group(1) if cycle_match else None

    mod_date = pdf_meta.get('modDate') or None

    return {
        'source_type': 'pdf',
        'title': str(title)[:300],
        'original_url': original_url,
        'extracted_text': full_extracted_text,
        'publication_date': str(pub_date) if pub_date else None,
        'last_updated_date': str(mod_date) if mod_date else None,
        'fetched_at': timezone.now(),
        'content_hash': content_hash,
        'file_size': len(file_bytes),
        'page_count': page_count,
        'word_count': total_words,
        'metadata': {
            'pdf_metadata': {k: str(v) for k, v in pdf_meta.items() if v},
            'filename': filename,
            'academic_cycle': academic_cycle,
        },
        'pages': pages_data
    }


def process_manual_text(title: str, text: str, publication_date: str = None) -> dict:
    """
    Ingests and normalizes raw text manually supplied by the user.
    """
    if not text or not text.strip():
        raise ValidationError("Text content cannot be empty.")

    cleaned_text = text.strip()
    words = len(re.findall(r'\b\w+\b', cleaned_text))
    content_hash = hashlib.sha256(cleaned_text.encode('utf-8')).hexdigest()
    clean_title = (title.strip() if title else "Manual Reference Note")[:300]

    return {
        'source_type': 'manual',
        'title': clean_title,
        'original_url': '',
        'extracted_text': cleaned_text,
        'publication_date': publication_date or timezone.now().strftime("%Y-%m-%d"),
        'last_updated_date': None,
        'fetched_at': timezone.now(),
        'content_hash': content_hash,
        'file_size': len(cleaned_text.encode('utf-8')),
        'page_count': 1,
        'word_count': words,
        'metadata': {'method': 'manual_input'},
        'pages': [{
            'page_number': 1,
            'page_text': cleaned_text,
            'char_count': len(cleaned_text),
            'metadata': {}
        }]
    }
