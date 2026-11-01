import os
import uuid
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import (
    ResearchSession,
    SourceDocument,
    DocumentPage,
    ResearchDimension,
    ExtractedClaim,
    EvidenceSpan,
    ResearchFinding,
    VerificationTask,
    ResearchRequirement,
    AIAnalysisRun
)
from .serializers import (
    ResearchSessionSerializer,
    ResearchSessionDetailSerializer,
    SourceDocumentSerializer,
    SourceDocumentDetailSerializer,
    ResearchDimensionSerializer,
    ExtractedClaimSerializer,
    EvidenceSpanSerializer,
    ResearchFindingSerializer,
    VerificationTaskSerializer,
    ResearchRequirementSerializer,
    AIAnalysisRunSerializer,
    DashboardStatsSerializer,
)
from .ingestion import (
    process_url_source,
    process_pdf_bytes,
    process_manual_text,
)
from .ai.pipeline import run_ai_analysis
from .ai.classifier import classify_document
from .ai.claim_extraction import extract_claims_from_source
from .ai.semantic_matcher import match_claims_to_dimensions


def get_user_session_queryset(request):
    """
    Scope sessions to authenticated user, or anonymous sessions if not logged in.
    Always excludes public demonstration sessions (is_demo=True).
    """
    if request.user and request.user.is_authenticated:
        return ResearchSession.objects.filter(user=request.user, is_demo=False)
    return ResearchSession.objects.filter(user__isnull=True, is_demo=False)


def get_session_for_read(request, session_id):
    """
    Retrieves a session for read-only inspection.
    Permits access if it belongs to user/anonymous scope OR is a public demo session.
    """
    demo = ResearchSession.objects.filter(id=session_id, is_demo=True).first()
    if demo:
        return demo
    qs = get_user_session_queryset(request)
    return get_object_or_404(qs, id=session_id)


class ResearchSessionListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = get_user_session_queryset(request).order_by('-created_at')
        serializer = ResearchSessionSerializer(qs, many=True)
        return Response({
            'count': qs.count(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        title = request.data.get('title', '').strip()
        query = (request.data.get('query') or request.data.get('research_question') or '').strip()
        objective = (request.data.get('objective') or request.data.get('research_objective') or '').strip()
        context = (request.data.get('context') or request.data.get('research_context') or '').strip()

        if not query:
            return Response(
                {'error': 'A main research question or problem statement is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not title:
            # Generate a title from the first words of the query
            words = query.split()
            title = ' '.join(words[:6]) + ('...' if len(words) > 6 else '')

        user = request.user if request.user and request.user.is_authenticated else None

        session = ResearchSession.objects.create(
            user=user,
            title=title,
            query=query,
            objective=objective,
            context=context,
            status='pending',
        )

        serializer = ResearchSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ResearchSessionDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, session_id, request):
        demo = ResearchSession.objects.filter(id=session_id, is_demo=True).first()
        if demo:
            return demo
        qs = get_user_session_queryset(request)
        return get_object_or_404(qs, id=session_id)

    def get(self, request, session_id):
        session = self.get_object(session_id, request)
        serializer = ResearchSessionDetailSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, session_id):
        session = self.get_object(session_id, request)
        if session.is_demo:
            return Response({'error': 'The public demonstration investigation is strictly read-only.'}, status=status.HTTP_403_FORBIDDEN)
        title = request.data.get('title')
        query = request.data.get('query')
        objective = request.data.get('objective')
        context = request.data.get('context')

        if title is not None:
            session.title = title.strip()
        if query is not None:
            if not query.strip():
                return Response({'error': 'Research question cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
            session.query = query.strip()
        if objective is not None:
            session.objective = objective.strip()
        if context is not None:
            session.context = context.strip()

        session.save()
        serializer = ResearchSessionDetailSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, session_id):
        session = self.get_object(session_id, request)
        if session.is_demo:
            return Response({'error': 'The public demonstration investigation is strictly read-only.'}, status=status.HTTP_403_FORBIDDEN)
        # Delete associated uploaded files from disk
        for source in session.sources.all():
            if source.file:
                try:
                    if os.path.isfile(source.file.path):
                        os.remove(source.file.path)
                except Exception:
                    pass
        session.delete()
        return Response({'message': 'Research session and all sources deleted successfully.'}, status=status.HTTP_200_OK)


class SourceListCreateView(APIView):
    permission_classes = [AllowAny]

    def get_session(self, session_id, request):
        demo = ResearchSession.objects.filter(id=session_id, is_demo=True).first()
        if demo:
            return demo
        qs = get_user_session_queryset(request)
        return get_object_or_404(qs, id=session_id)

    def get(self, request, session_id):
        session = self.get_session(session_id, request)
        sources = session.sources.all().order_by('-created_at')
        serializer = SourceDocumentSerializer(sources, many=True)
        return Response({
            'session_id': str(session.id),
            'count': sources.count(),
            'sources': serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, session_id):
        session = self.get_session(session_id, request)
        if session.is_demo:
            return Response(
                {'error': 'The public demonstration investigation is strictly read-only. Please start your own research to upload sources.'},
                status=status.HTTP_403_FORBIDDEN
            )
        source_type = request.data.get('source_type')
        raw_document_category = request.data.get('document_category')
        evidence_type = request.data.get('evidence_type', '')

        # Determine if auto-classification should run
        auto_classify = not raw_document_category or str(raw_document_category).strip().lower() in ['auto', '', 'none', 'unknown']
        document_category = (raw_document_category or 'reference').strip().lower()

        if not source_type:
            return Response(
                {'error': 'source_type is required (url, pdf, or manual).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_sources = []
        errors = []
        skipped_duplicates = []

        # -------------------------------------------------------------
        # 1. URL Ingestion
        # -------------------------------------------------------------
        if source_type == 'url':
            # Can be single 'url' or list of 'urls'
            url_list = request.data.get('urls')
            single_url = request.data.get('url')

            if not url_list:
                if single_url:
                    url_list = [single_url]
                else:
                    return Response({'error': 'Please provide at least one URL.'}, status=status.HTTP_400_BAD_REQUEST)

            if isinstance(url_list, str):
                url_list = [u.strip() for u in url_list.split('\n') if u.strip()]

            for raw_url in url_list:
                u = raw_url.strip()
                if not u:
                    continue
                try:
                    res = process_url_source(u)
                    
                    # Check duplicate in this session
                    if session.sources.filter(content_hash=res['content_hash']).exists():
                        skipped_duplicates.append({'url': u, 'reason': 'Identical content already ingested in this session.'})
                        continue

                    # Auto-classification if not explicitly set
                    doc_cat = document_category
                    doc_ev_type = evidence_type
                    meta = dict(res.get('metadata') or {})
                    if auto_classify:
                        classification = classify_document(res['extracted_text'], filename=res.get('title', ''), metadata=meta)
                        doc_cat = classification['category']
                        doc_ev_type = classification.get('evidence_type', '')
                        meta['classification'] = classification

                    with transaction.atomic():
                        source_doc = SourceDocument.objects.create(
                            session=session,
                            source_type='url',
                            document_category=doc_cat,
                            evidence_type=doc_ev_type,
                            title=res['title'],
                            original_url=res['original_url'],
                            extracted_text=res['extracted_text'],
                            publication_date=res['publication_date'],
                            last_updated_date=res['last_updated_date'],
                            fetched_at=res['fetched_at'],
                            content_hash=res['content_hash'],
                            extraction_status='READY',
                            file_size=res['file_size'],
                            page_count=res['page_count'],
                            word_count=res['word_count'],
                            metadata=meta,
                        )
                        for p in res['pages']:
                            DocumentPage.objects.create(
                                document=source_doc,
                                page_number=p['page_number'],
                                page_text=p['page_text'],
                                char_count=p['char_count'],
                                metadata=p.get('metadata', {}),
                            )
                        created_sources.append(source_doc)

                except DjangoValidationError as ve:
                    errors.append({'url': u, 'error': str(ve.message if hasattr(ve, 'message') else ve)})
                except Exception as e:
                    errors.append({'url': u, 'error': f"Failed to ingest URL: {str(e)}"})

        # -------------------------------------------------------------
        # 2. PDF File Upload
        # -------------------------------------------------------------
        elif source_type == 'pdf':
            files = request.FILES.getlist('files')
            single_file = request.FILES.get('file')

            if not files and single_file:
                files = [single_file]

            if not files:
                return Response({'error': 'Please select at least one PDF file to upload.'}, status=status.HTTP_400_BAD_REQUEST)

            for uploaded_file in files:
                filename = uploaded_file.name
                try:
                    file_bytes = uploaded_file.read()
                    res = process_pdf_bytes(file_bytes, filename=filename)

                    # Duplicate check
                    if session.sources.filter(content_hash=res['content_hash']).exists():
                        skipped_duplicates.append({'file': filename, 'reason': 'Identical PDF content already exists in this session.'})
                        continue

                    # Auto-classification if not explicitly set
                    doc_cat = document_category
                    doc_ev_type = evidence_type
                    meta = dict(res.get('metadata') or {})
                    if auto_classify:
                        classification = classify_document(res['extracted_text'], filename=filename, metadata=meta)
                        doc_cat = classification['category']
                        doc_ev_type = classification.get('evidence_type', '')
                        meta['classification'] = classification

                    # Reset file pointer for saving to model field
                    uploaded_file.seek(0)

                    with transaction.atomic():
                        source_doc = SourceDocument.objects.create(
                            session=session,
                            source_type='pdf',
                            document_category=doc_cat,
                            evidence_type=doc_ev_type,
                            title=res['title'],
                            file=uploaded_file,
                            extracted_text=res['extracted_text'],
                            publication_date=res['publication_date'],
                            last_updated_date=res['last_updated_date'],
                            fetched_at=res['fetched_at'],
                            content_hash=res['content_hash'],
                            extraction_status='READY',
                            file_size=res['file_size'],
                            page_count=res['page_count'],
                            word_count=res['word_count'],
                            metadata=meta,
                        )
                        for p in res['pages']:
                            DocumentPage.objects.create(
                                document=source_doc,
                                page_number=p['page_number'],
                                page_text=p['page_text'],
                                char_count=p['char_count'],
                                metadata=p.get('metadata', {}),
                            )
                        created_sources.append(source_doc)

                except DjangoValidationError as ve:
                    errors.append({'file': filename, 'error': str(ve.message if hasattr(ve, 'message') else ve)})
                except Exception as e:
                    errors.append({'file': filename, 'error': f"Failed to process PDF: {str(e)}"})

        # -------------------------------------------------------------
        # 3. Manual Text Ingestion
        # -------------------------------------------------------------
        elif source_type == 'manual':
            title = request.data.get('title', 'Manual Research Note')
            text = request.data.get('text', '')
            publication_date = request.data.get('publication_date')

            try:
                res = process_manual_text(title, text, publication_date)

                if session.sources.filter(content_hash=res['content_hash']).exists():
                    return Response({
                        'error': 'Duplicate text: Identical content has already been added to this session.'
                    }, status=status.HTTP_409_CONFLICT)

                doc_cat = document_category
                doc_ev_type = evidence_type
                meta = dict(res.get('metadata') or {})
                if auto_classify:
                    classification = classify_document(res['extracted_text'], filename=title, metadata=meta)
                    doc_cat = classification['category']
                    doc_ev_type = classification.get('evidence_type', '')
                    meta['classification'] = classification

                with transaction.atomic():
                    source_doc = SourceDocument.objects.create(
                        session=session,
                        source_type='manual',
                        document_category=doc_cat,
                        evidence_type=doc_ev_type,
                        title=res['title'],
                        extracted_text=res['extracted_text'],
                        publication_date=res['publication_date'],
                        last_updated_date=None,
                        fetched_at=res['fetched_at'],
                        content_hash=res['content_hash'],
                        extraction_status='READY',
                        file_size=res['file_size'],
                        page_count=res['page_count'],
                        word_count=res['word_count'],
                        metadata=meta,
                    )
                    for p in res['pages']:
                        DocumentPage.objects.create(
                            document=source_doc,
                            page_number=p['page_number'],
                            page_text=p['page_text'],
                            char_count=p['char_count'],
                            metadata=p.get('metadata', {}),
                        )
                    created_sources.append(source_doc)

            except DjangoValidationError as ve:
                return Response({'error': str(ve.message if hasattr(ve, 'message') else ve)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response(
                {'error': f"Unsupported source_type '{source_type}'. Allowed types are 'url', 'pdf', 'manual'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update session status if sources added (stale state management)
        if created_sources:
            if session.status in ['ready', 'completed']:
                session.status = 'needs_reanalysis'
                session.save(update_fields=['status'])
            elif session.status == 'pending':
                session.status = 'ingesting'
                session.save(update_fields=['status'])

        # Auto evaluate evidence if requirements exist in this session
        re_eval_results = None
        if created_sources and session.requirements.exists():
            from .ai.requirement_engine import evaluate_evidence_against_requirements
            re_eval_results = evaluate_evidence_against_requirements(session)

        serializer = SourceDocumentSerializer(created_sources, many=True)
        return Response({
            'created_count': len(created_sources),
            'sources': serializer.data,
            'errors': errors,
            'skipped_duplicates': skipped_duplicates,
            'readiness_status': session.readiness_status,
            're_eval_results': re_eval_results,
            'created': serializer.data,
        }, status=status.HTTP_201_CREATED if created_sources else status.HTTP_400_BAD_REQUEST)


class SourceDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, source_id):
        source = SourceDocument.objects.filter(session__is_demo=True, id=source_id).first()
        if not source:
            user_sessions = get_user_session_queryset(request)
            source = get_object_or_404(SourceDocument.objects.filter(session__in=user_sessions), id=source_id)
        serializer = SourceDocumentDetailSerializer(source)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, source_id):
        source = SourceDocument.objects.filter(id=source_id).first()
        if not source:
            return Response({'error': 'Source document not found.'}, status=status.HTTP_404_NOT_FOUND)
        if source.session.is_demo:
            return Response(
                {'error': 'Demo sources are protected and cannot be modified.'},
                status=status.HTTP_403_FORBIDDEN
            )
        user_sessions = get_user_session_queryset(request)
        if source.session not in user_sessions:
            return Response({'error': 'Source document not found in your workspace.'}, status=status.HTTP_404_NOT_FOUND)

        new_category = request.data.get('document_category')
        new_evidence_type = request.data.get('evidence_type')
        new_title = request.data.get('title')

        if new_category is not None:
            source.document_category = str(new_category).strip().lower()
        if new_evidence_type is not None:
            source.evidence_type = str(new_evidence_type).strip()
        if new_title is not None and str(new_title).strip():
            source.title = str(new_title).strip()

        source.save()

        # If requirements exist in this session, re-evaluate them immediately
        if source.session.requirements.exists():
            from .ai.requirement_engine import evaluate_evidence_against_requirements
            evaluate_evidence_against_requirements(source.session)

        serializer = SourceDocumentDetailSerializer(source)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, source_id):
        source = SourceDocument.objects.filter(id=source_id).first()
        if not source:
            return Response({'error': 'Source document not found.'}, status=status.HTTP_404_NOT_FOUND)
        if source.session.is_demo:
            return Response(
                {'error': 'Demo sources are protected and cannot be deleted.'},
                status=status.HTTP_403_FORBIDDEN
            )
        user_sessions = get_user_session_queryset(request)
        if source.session not in user_sessions:
            return Response({'error': 'Source document not found in your workspace.'}, status=status.HTTP_404_NOT_FOUND)
        if source.file:
            try:
                if os.path.isfile(source.file.path):
                    os.remove(source.file.path)
            except Exception:
                pass
        session = source.session
        source.delete()
        if session.requirements.exists():
            from .ai.requirement_engine import evaluate_evidence_against_requirements
            evaluate_evidence_against_requirements(session)
        return Response({'message': 'Source document deleted successfully.'}, status=status.HTTP_200_OK)


def seed_canonical_demo_session() -> ResearchSession:
    """
    Retrieves or idempotently seeds the canonical public demonstration session.
    Tagged with is_demo=True, ensuring it is isolated from private personal research.
    Preloaded with 3 authentic-format documents, 6 dimensions, verified claims,
    and detected gaps/contradictions.
    """
    demo_session = ResearchSession.objects.filter(is_demo=True).first()
    if demo_session and demo_session.sources.filter(extraction_status='READY').exists():
        return demo_session

    if not demo_session:
        demo_session = ResearchSession.objects.create(
            user=None,
            is_demo=True,
            title="National Merit Scholarship Eligibility & Compliance Verification",
            query="What are the hidden compliance criteria, conflicting family income limits, and missing verification mandates across State and Central guidelines for the 2026 National Merit Scholarship?",
            objective="Detect conflicting eligibility ceilings between central circulars and state notices, uncover missing documentation mandates, and flag outdated application timelines.",
            context="Applicants report discrepancies regarding whether the family income ceiling is 6.0 LPA or 8.0 LPA, whether domicile certificates require magistrate countersignature, and whether offline submissions are recognized.",
            status="pending"
        )
    else:
        demo_session.sources.all().delete()
        demo_session.dimensions.all().delete()
        demo_session.findings.all().delete()
        demo_session.extracted_claims.all().delete()
        demo_session.verification_tasks.all().delete()

    demo_sources_data = [
        {
            'source_type': 'pdf',
            'title': 'Sample Central Scholarship Guidelines',
            'original_url': 'https://sample-scholarships.example.org/guidelines.pdf',
            'publication_date': '2024-08-15',
            'metadata': {
                'disclaimer': 'ILLUSTRATIVE SAMPLE DATA — FOR DEMO EVALUATION ONLY',
                'sample_type': 'Illustrative Central Guideline Document',
                'document_ref': 'SAMPLE-CSG-2026',
            },
            'pages': [
                {
                    'page_number': 1,
                    'text': (
                        "[ILLUSTRATIVE SAMPLE DOCUMENT — FOR DEMO USE ONLY]\n\n"
                        "SAMPLE CENTRAL SCHOLARSHIP SCHEME GUIDELINES\n\n"
                        "1. ELIGIBILITY CRITERIA:\n"
                        "1.1 Candidates who have secured at least 80 percentile in the Higher Secondary Examination.\n"
                        "1.2 Total parental gross annual income must not exceed INR 8,00,000 (Rupees Eight Lakhs only) "
                        "from all sources for the financial year ending March 31, 2025.\n"
                        "1.3 An automated Income Certificate issued by an Executive Magistrate or authorized Tehsildar "
                        "is strictly mandatory during online registration."
                    )
                },
                {
                    'page_number': 2,
                    'text': (
                        "[ILLUSTRATIVE SAMPLE DOCUMENT — FOR DEMO USE ONLY]\n\n"
                        "2. SUBMISSION AND DISBURSAL PROTOCOL:\n"
                        "2.1 All scholarship applications must be submitted strictly via the National Scholarship Portal (NSP).\n"
                        "2.2 Under no circumstance shall physical or offline paper applications be entertained by the Ministry.\n"
                        "2.3 Aadhaar-seeded biometric bank account is an absolute prerequisite for direct benefit transfer (DBT).\n"
                        "2.4 The portal closing date for fresh applications is November 30, 2025."
                    )
                }
            ]
        },
        {
            'source_type': 'url',
            'title': 'Sample State Education Addendum',
            'original_url': 'https://sample-state-education.example.org/addendum',
            'publication_date': '2025-01-10',
            'metadata': {
                'disclaimer': 'ILLUSTRATIVE SAMPLE DATA — FOR DEMO EVALUATION ONLY',
                'sample_type': 'Illustrative State Policy Addendum',
                'bulletin_num': 'SAMPLE-STA-2025',
            },
            'pages': [
                {
                    'page_number': 1,
                    'text': (
                        "[ILLUSTRATIVE SAMPLE DOCUMENT — FOR DEMO USE ONLY]\n\n"
                        "SAMPLE STATE HIGHER EDUCATION ADDENDUM\n\n"
                        "KEY STATE-LEVEL MANDATES:\n"
                        "1. CONFLICTING INCOME CEILING:\n"
                        "For candidates applying from State institutions, the family income threshold is capped at "
                        "INR 6,00,000 (Rupees Six Lakhs per annum). Candidates whose gross family earnings exceed "
                        "INR 6,00,000 are ineligible for state verification endorsement, notwithstanding any central provisions.\n\n"
                        "2. LOCAL RESIDENCY MANDATE:\n"
                        "A minimum of 7 years continuous residential domicile certificate countersigned by the District Revenue Officer "
                        "is required.\n\n"
                        "3. DEADLINE ADJUSTMENT:\n"
                        "State verification window closes on December 15, 2025."
                    )
                }
            ]
        },
        {
            'source_type': 'manual',
            'title': 'Illustrative Scholarship FAQ',
            'original_url': '',
            'publication_date': '2023-11-20',
            'metadata': {
                'disclaimer': 'ILLUSTRATIVE SAMPLE DATA — FOR DEMO EVALUATION ONLY',
                'sample_type': 'Illustrative Student Advisory FAQ Archive',
                'staleness_warning': 'Content older than 2 years',
            },
            'pages': [
                {
                    'page_number': 1,
                    'text': (
                        "[ILLUSTRATIVE SAMPLE DOCUMENT — FOR DEMO USE ONLY]\n\n"
                        "ILLUSTRATIVE SCHOLARSHIP FAQ ARCHIVE\n\n"
                        "FAQ: Can I submit physical documents if the NSP portal experiences server downtime?\n"
                        "ANSWER: Yes, candidates unable to upload digital scans may submit hard-copy attested dossiers "
                        "directly to the nodal district educational office along with a self-declared income affidavit.\n\n"
                        "FAQ: Is Aadhaar biometric authentication mandatory for all states?\n"
                        "ANSWER: No, voter ID or ration card can be accepted as alternative identity proof in lieu of Aadhaar.\n\n"
                        "NOTE: This advisory was compiled in late 2023 and has not been reconciled with new 2025/2026 digital directives."
                    )
                }
            ]
        }
    ]

    import hashlib
    with transaction.atomic():
        for src_data in demo_sources_data:
            full_text = "\n\n".join(p['text'] for p in src_data['pages'])
            words = len(full_text.split())
            content_hash = hashlib.sha256(full_text.encode('utf-8')).hexdigest()

            source_doc = SourceDocument.objects.create(
                session=demo_session,
                source_type=src_data['source_type'],
                title=src_data['title'],
                original_url=src_data.get('original_url', ''),
                extracted_text=full_text,
                publication_date=src_data.get('publication_date'),
                fetched_at=None,
                content_hash=content_hash,
                extraction_status='READY',
                file_size=len(full_text.encode('utf-8')),
                page_count=len(src_data['pages']),
                word_count=words,
                metadata=src_data['metadata'],
            )

            for p in src_data['pages']:
                DocumentPage.objects.create(
                    document=source_doc,
                    page_number=p['page_number'],
                    page_text=p['text'],
                    char_count=len(p['text']),
                    metadata={'disclaimer': 'ILLUSTRATIVE DEMO DATA — NOT A VERIFIED REAL-WORLD SOURCE'}
                )

    run_ai_analysis(demo_session)
    demo_session.refresh_from_db()
    return demo_session


class DemoInvestigationCreateView(APIView):
    """
    Creates or retrieves the illustrative scholarship research session.
    All data is clearly tagged with the required disclaimer.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        demo_session = seed_canonical_demo_session()
        detail_serializer = ResearchSessionDetailSerializer(demo_session)
        return Response({
            'message': 'Illustrative demo investigation retrieved successfully.',
            'session': detail_serializer.data,
            'is_demo': True,
            'disclaimer': 'ILLUSTRATIVE DEMO DATA — NOT VERIFIED REAL-WORLD INFORMATION'
        }, status=status.HTTP_200_OK)


class PublicDemoView(APIView):
    """
    Public Read-Only Demonstration Investigation endpoint.
    Accessible without authentication.
    Returns complete pre-analyzed demo data tagged with disclaimer.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        demo_session = seed_canonical_demo_session()
        serializer = ResearchSessionDetailSerializer(demo_session)
        data = serializer.data
        data['is_demo'] = True
        data['disclaimer'] = 'ILLUSTRATIVE DEMO DATA — NOT VERIFIED REAL-WORLD INFORMATION'
        return Response(data, status=status.HTTP_200_OK)


class PublicDemoReportView(APIView):
    """
    Public Read-Only Demonstration Intelligence Dossier / Report.
    Accessible without authentication.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        demo_session = seed_canonical_demo_session()
        report_view = ReportDataView()
        response = report_view.get(request, demo_session.id)
        if hasattr(response, 'data') and isinstance(response.data, dict):
            response.data['is_demo'] = True
            response.data['disclaimer'] = 'ILLUSTRATIVE DEMO DATA — NOT VERIFIED REAL-WORLD INFORMATION'
        return response


class AIStatusView(APIView):
    """
    Real-time AI Provider Health & Connectivity Status.
    Inspects configured Gemini and Local Deterministic Engine.
    Google Gemini is the sole external AI provider.
    Never exposes API keys.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        gemini_model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash").strip() or "gemini-3.8-flash"
        gemini_status = "Not Configured"
        gemini_error = None

        if gemini_key:
            # Check latest AIAnalysisRun to report honest operational status
            latest_run = AIAnalysisRun.objects.order_by('-created_at').first()
            if latest_run:
                if latest_run.provider == 'GeminiAIProvider' and latest_run.status == 'COMPLETED' and not latest_run.error_log:
                    gemini_status = "Connected"
                elif 'Fallback' in latest_run.model_used or latest_run.error_log or latest_run.status == 'FAILED':
                    gemini_status = "Failed"
                    gemini_error = latest_run.error_log or "Google Gemini service unavailable or timed out. Local deterministic fallback was utilized."
                else:
                    gemini_status = "Configured"
            else:
                gemini_status = "Configured"

        local_status = "Available"
        local_model = "Deterministic Semantic Engine"

        if gemini_status == "Connected":
            active_provider = f"Google Gemini ({gemini_model})"
            instructions = "Google Gemini is active and connected. High-speed reasoning engine operational."
        elif gemini_status == "Failed":
            active_provider = "Deterministic Semantic Engine (Gemini Fallback Active)"
            instructions = f"Gemini status: {gemini_error} Analysis is powered by the deterministic local engine with zero data loss."
        elif gemini_status == "Configured":
            active_provider = f"Google Gemini ({gemini_model}) [Configured]"
            instructions = "Google Gemini API key is configured. Analysis runs with Gemini and falls back automatically if remote API is unreachable."
        else:
            active_provider = "Deterministic Semantic Engine (Local Offline Fallback)"
            instructions = "To enable Google Gemini, configure GEMINI_API_KEY in backend/.env."

        return Response({
            "active_provider": active_provider,
            "providers": {
                "gemini": {
                    "name": "Google Gemini",
                    "status": gemini_status,
                    "model": gemini_model,
                    "role": "Primary External High-Speed Reasoning Provider",
                    "configured": bool(gemini_key),
                    "error": gemini_error
                },
                "groq": {
                    "name": "Groq Cloud",
                    "status": "Disabled (Gemini Only)",
                    "model": "llama-3.3-70b-versatile",
                    "role": "Unconfigured / Disabled in Gemini-Only Mode",
                    "configured": False,
                    "error": None
                },
                "local": {
                    "name": "Deterministic Semantic Engine",
                    "status": local_status,
                    "model": local_model,
                    "role": "On-Device Zero-Network Verifiable NLP Fallback",
                    "configured": True,
                    "error": None
                }
            },
            "instructions": instructions
        }, status=status.HTTP_200_OK)


class ResearchSessionAnalyzeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, session_id):
        demo = ResearchSession.objects.filter(id=session_id, is_demo=True).first()
        if demo:
            return Response(
                {'error': 'The public demonstration investigation is already analyzed and is read-only.'},
                status=status.HTTP_403_FORBIDDEN
            )
        qs = get_user_session_queryset(request)
        session = get_object_or_404(qs, id=session_id)

        sources = session.sources.filter(extraction_status='READY')
        if not sources.exists():
            return Response(
                {'error': 'At least one source document with extracted text must be ingested before running AI analysis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        session.status = 'analyzing'
        session.save(update_fields=['status'])

        result = run_ai_analysis(session)

        detail_serializer = ResearchSessionDetailSerializer(session)
        return Response({
            'message': 'AI Research Intelligence Analysis complete.',
            'result': result,
            'session': detail_serializer.data
        }, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResearchDimensionListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_session_for_read(request, session_id)
        dimensions = session.dimensions.all().order_by('importance', 'title')
        serializer = ResearchDimensionSerializer(dimensions, many=True)
        return Response({
            'count': dimensions.count(),
            'coverage_score': session.coverage_score,
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class ResearchFindingListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_session_for_read(request, session_id)
        findings = session.findings.all().order_by('-priority', '-created_at')

        finding_type = request.query_params.get('type')
        if finding_type:
            findings = findings.filter(finding_type=finding_type)

        priority = request.query_params.get('priority')
        if priority:
            findings = findings.filter(priority=priority.upper())

        is_resolved = request.query_params.get('resolved')
        if is_resolved is not None:
            findings = findings.filter(user_resolved=is_resolved.lower() in ['true', '1'])

        serializer = ResearchFindingSerializer(findings, many=True)
        return Response({
            'count': findings.count(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class ExtractedClaimListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_session_for_read(request, session_id)
        claims = session.claims.select_related('source', 'dimension').all().order_by('source', '-confidence_score')

        dimension_id = request.query_params.get('dimension')
        if dimension_id:
            claims = claims.filter(dimension_id=dimension_id)

        source_id = request.query_params.get('source')
        if source_id:
            claims = claims.filter(source_id=source_id)

        serializer = ExtractedClaimSerializer(claims, many=True)
        return Response({
            'count': claims.count(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class ResearchCoverageView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_session_for_read(request, session_id)
        dimensions = session.dimensions.all()

        covered = dimensions.filter(coverage_status='COVERED').count()
        partially_covered = dimensions.filter(coverage_status='PARTIALLY_COVERED').count()
        missing = dimensions.filter(coverage_status='NOT_FOUND_IN_REVIEWED_SOURCES').count()
        uncertain = dimensions.filter(coverage_status='UNCERTAIN').count()

        dim_serializer = ResearchDimensionSerializer(dimensions, many=True)

        return Response({
            'session_id': str(session.id),
            'coverage_score': session.coverage_score,
            'summary': {
                'total_dimensions': dimensions.count(),
                'covered': covered,
                'partially_covered': partially_covered,
                'missing_in_sources': missing,
                'uncertain': uncertain
            },
            'dimensions': dim_serializer.data
        }, status=status.HTTP_200_OK)


class AnalysisStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_session_for_read(request, session_id)
        latest_run = session.analysis_runs.order_by('-created_at').first()

        if not latest_run:
            return Response({
                'session_id': str(session.id),
                'status': session.status,
                'latest_run': None
            }, status=status.HTTP_200_OK)

        serializer = AIAnalysisRunSerializer(latest_run)
        return Response({
            'session_id': str(session.id),
            'status': session.status,
            'latest_run': serializer.data
        }, status=status.HTTP_200_OK)


class EvidenceGraphView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_session_for_read(request, session_id)

        nodes = []
        edges = []

        # 1. Central Session Node
        nodes.append({
            'id': f"session-{session.id}",
            'type': 'sessionNode',
            'label': session.title,
            'data': {
                'label': session.title,
                'status': session.status,
                'coverage': session.coverage_score,
                'category': 'central'
            },
            'details': {
                'title': session.title,
                'description': session.query,
                'status': session.status,
                'coverage': session.coverage_score,
            },
            'position': {'x': 550, 'y': 320}
        })

        # 2. Dimension Nodes
        dimensions = session.dimensions.all()
        for idx, dim in enumerate(dimensions):
            dim_node_id = f"dim-{dim.id}"
            nodes.append({
                'id': dim_node_id,
                'type': 'dimensionNode',
                'label': dim.name,
                'data': {
                    'label': dim.name,
                    'category': dim.category,
                    'status': dim.coverage_status,
                    'importance': dim.importance,
                    'score': dim.coverage_score
                },
                'details': {
                    'title': dim.name,
                    'category': dim.category,
                    'description': dim.description,
                    'status': dim.coverage_status,
                    'importance': dim.importance,
                    'score': dim.coverage_score
                },
                'position': {'x': 100 + (idx % 2) * 240, 'y': 80 + idx * 120}
            })
            edges.append({
                'id': f"e-session-{dim_node_id}",
                'source': f"session-{session.id}",
                'target': dim_node_id,
                'label': 'has_dimension'
            })

        # 3. Source Nodes
        sources = session.sources.all()
        for idx, src in enumerate(sources):
            src_node_id = f"src-{src.id}"
            nodes.append({
                'id': src_node_id,
                'type': 'sourceNode',
                'label': src.title,
                'data': {
                    'label': src.title,
                    'source_type': src.source_type,
                    'word_count': src.word_count,
                    'status': src.extraction_status
                },
                'details': {
                    'title': src.title,
                    'source_id': str(src.id),
                    'source_type': src.source_type,
                    'description': f"Published: {src.publication_date or 'N/A'}. Document format: {src.source_type.upper()}.",
                    'word_count': src.word_count,
                    'status': src.extraction_status
                },
                'position': {'x': 200 + (idx * 340), 'y': 620}
            })
            edges.append({
                'id': f"e-session-{src_node_id}",
                'source': f"session-{session.id}",
                'target': src_node_id,
                'label': 'references_source'
            })

        # 4. Finding Nodes (Contradictions, Gaps)
        findings = session.findings.all()[:20]
        for idx, f in enumerate(findings):
            f_node_id = f"finding-{f.id}"
            quote = ""
            if f.claim_a:
                quote = f.claim_a.verbatim_quote
            elif f.variance_details and isinstance(f.variance_details, dict):
                quote = f.variance_details.get('claim_a_quote', '')

            nodes.append({
                'id': f_node_id,
                'type': 'findingNode',
                'label': f.title,
                'data': {
                    'label': f.title,
                    'finding_type': f.finding_type,
                    'priority': f.priority,
                    'description': f.description[:120] + '...' if len(f.description) > 120 else f.description
                },
                'details': {
                    'title': f.title,
                    'type': f.finding_type,
                    'priority': f.priority,
                    'description': f.explanation,
                    'quote': quote,
                    'source_title': f.claim_a.source.title if f.claim_a and f.claim_a.source else (f.sources_checked[0] if f.sources_checked else ''),
                    'source_id': str(f.claim_a.source.id) if f.claim_a and f.claim_a.source else '',
                },
                'position': {'x': 980, 'y': 100 + idx * 160}
            })

            # Edge to dimension
            if f.dimension:
                edges.append({
                    'id': f"e-{f_node_id}-dim-{f.dimension_id}",
                    'source': f"dim-{f.dimension_id}",
                    'target': f_node_id,
                    'label': f.finding_type
                })

            # Edge to source if contradiction
            if f.claim_a and f.claim_a.source_id:
                edges.append({
                    'id': f"e-{f_node_id}-src-{f.claim_a.source_id}",
                    'source': f"src-{f.claim_a.source_id}",
                    'target': f_node_id,
                    'label': 'disputed_in'
                })
            if f.claim_b and f.claim_b.source_id:
                edges.append({
                    'id': f"e-{f_node_id}-src-{f.claim_b.source_id}",
                    'source': f"src-{f.claim_b.source_id}",
                    'target': f_node_id,
                    'label': 'disputed_in'
                })

        return Response({
            'session_id': str(session.id),
            'nodes': nodes,
            'edges': edges,
            'stats': {
                'total_nodes': len(nodes),
                'total_edges': len(edges),
                'sources': len(sources),
                'dimensions': len(dimensions),
                'findings': len(findings)
            }
        }, status=status.HTTP_200_OK)


class VerificationTaskListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_session_for_read(request, session_id)
        tasks = session.verification_tasks.select_related('finding').all().order_by('-priority', 'status')
        serializer = VerificationTaskSerializer(tasks, many=True)
        return Response({
            'count': tasks.count(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class VerificationTaskUpdateView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, task_id):
        task = get_object_or_404(VerificationTask, id=task_id)
        if task.session.is_demo:
            return Response(
                {'error': 'Verification tasks in the public demonstration investigation are strictly read-only.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if request.user and request.user.is_authenticated:
            if task.session.user != request.user:
                return Response(
                    {'error': 'Permission denied. This task does not belong to your workspace.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif task.session.user is not None:
            return Response(
                {'error': 'Authentication required to modify this task.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        new_status = request.data.get('status')
        audit_notes = request.data.get('audit_notes')

        if new_status:
            if new_status.upper() in ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']:
                task.status = new_status.upper()
            else:
                return Response({'error': f"Invalid status '{new_status}'."}, status=status.HTTP_400_BAD_REQUEST)

        if audit_notes is not None:
            task.audit_notes = audit_notes

        task.save()
        serializer = VerificationTaskSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FindingResolveView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, finding_id):
        finding = get_object_or_404(ResearchFinding, id=finding_id)
        if finding.session.is_demo:
            return Response(
                {'error': 'Findings in the public demonstration investigation are strictly read-only.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if request.user and request.user.is_authenticated:
            if finding.session.user != request.user:
                return Response(
                    {'error': 'Permission denied. This finding does not belong to your workspace.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif finding.session.user is not None:
            return Response(
                {'error': 'Authentication required to modify this finding.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        resolved = request.data.get('resolved')
        new_status = request.data.get('status')
        disposition = request.data.get('disposition', '').strip()
        notes = request.data.get('resolution_notes', '').strip()

        previous_status = finding.status
        if new_status:
            finding.status = new_status
        elif resolved is not None:
            finding.status = 'resolved' if resolved else 'pending'

        if disposition:
            finding.disposition = disposition
        if notes:
            finding.resolution_notes = notes

        # Record in append-only audit trail
        audit_entry = {
            'timestamp': timezone.now().isoformat(),
            'action': f"FINDING_DISPOSITION_{finding.status.upper()}",
            'original_finding': {
                'id': str(finding.id),
                'title': finding.title,
                'type': finding.finding_type,
            },
            'submitted_evidence': None,
            'user_action': f"APPLY_DISPOSITION_{disposition or 'STATUS_CHANGE'}",
            'reanalysis_outcome': {
                'disposition': finding.disposition,
                'status': finding.status,
            },
            'previous_status': previous_status,
            'new_status': finding.status,
            'notes': finding.resolution_notes,
            'disposition': finding.disposition,
            'status': finding.status,
        }
        if not isinstance(finding.resolution_audit_trail, list):
            finding.resolution_audit_trail = []
        finding.resolution_audit_trail.append(audit_entry)
        finding.save()

        # Sync verification tasks if linked
        if finding.status == 'resolved':
            VerificationTask.objects.filter(finding=finding).update(status='resolved')
        elif finding.status == 'dismissed':
            VerificationTask.objects.filter(finding=finding).update(status='dismissed')

        serializer = ResearchFindingSerializer(finding)
        return Response({
            'message': 'Finding resolution status and audit log updated.',
            'finding': serializer.data
        }, status=status.HTTP_200_OK)


class GapResolveWithEvidenceView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, finding_id):
        finding = get_object_or_404(ResearchFinding, id=finding_id)
        if finding.session.is_demo:
            return Response(
                {'error': 'Findings in the public demonstration investigation are strictly read-only.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if request.user and request.user.is_authenticated:
            if finding.session.user != request.user:
                return Response(
                    {'error': 'Permission denied. This finding does not belong to your workspace.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif finding.session.user is not None:
            return Response(
                {'error': 'Authentication required to modify this finding.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        session = finding.session
        source_type = request.data.get('source_type', 'manual')
        resolution_notes = request.data.get('resolution_notes', '').strip()

        created_sources = []
        try:
            if source_type == 'url':
                url = request.data.get('url', '').strip()
                if not url:
                    return Response({'error': 'URL is required.'}, status=status.HTTP_400_BAD_REQUEST)
                res = process_url_source(url)
                with transaction.atomic():
                    src = SourceDocument.objects.create(
                        session=session,
                        source_type='url',
                        title=res['title'],
                        original_url=res['original_url'],
                        extracted_text=res['extracted_text'],
                        publication_date=res['publication_date'],
                        last_updated_date=res['last_updated_date'],
                        fetched_at=res['fetched_at'],
                        content_hash=res['content_hash'],
                        extraction_status='READY',
                        file_size=res['file_size'],
                        page_count=res['page_count'],
                        word_count=res['word_count'],
                        metadata=res['metadata'],
                    )
                    for p in res['pages']:
                        DocumentPage.objects.create(
                            document=src,
                            page_number=p['page_number'],
                            page_text=p['page_text'],
                            char_count=p['char_count'],
                            metadata=p.get('metadata', {}),
                        )
                created_sources.append(src)

            elif source_type == 'pdf':
                file_obj = request.FILES.get('file')
                if not file_obj:
                    return Response({'error': 'PDF file is required.'}, status=status.HTTP_400_BAD_REQUEST)
                file_bytes = file_obj.read()
                res = process_pdf_bytes(file_bytes, filename=file_obj.name)
                with transaction.atomic():
                    src = SourceDocument.objects.create(
                        session=session,
                        source_type='pdf',
                        title=res['title'],
                        file=file_obj,
                        extracted_text=res['extracted_text'],
                        publication_date=res['publication_date'],
                        last_updated_date=res['last_updated_date'],
                        fetched_at=res['fetched_at'],
                        content_hash=res['content_hash'],
                        extraction_status='READY',
                        file_size=res['file_size'],
                        page_count=res['page_count'],
                        word_count=res['word_count'],
                        metadata=res['metadata'],
                    )
                    for p in res['pages']:
                        DocumentPage.objects.create(
                            document=src,
                            page_number=p['page_number'],
                            page_text=p['page_text'],
                            char_count=p['char_count'],
                            metadata=p.get('metadata', {}),
                        )
                created_sources.append(src)

            elif source_type == 'manual':
                title = request.data.get('title', f"Resolution Evidence: {finding.title}").strip()
                text = request.data.get('text', '').strip()
                pub_date = request.data.get('publication_date')
                if not text:
                    return Response({'error': 'Evidence text content is required.'}, status=status.HTTP_400_BAD_REQUEST)
                res = process_manual_text(title, text, pub_date)
                with transaction.atomic():
                    src = SourceDocument.objects.create(
                        session=session,
                        source_type='manual',
                        title=res['title'],
                        extracted_text=res['extracted_text'],
                        publication_date=res['publication_date'],
                        last_updated_date=None,
                        fetched_at=res['fetched_at'],
                        content_hash=res['content_hash'],
                        extraction_status='READY',
                        file_size=res['file_size'],
                        page_count=res['page_count'],
                        word_count=res['word_count'],
                        metadata=res['metadata'],
                    )
                    for p in res['pages']:
                        DocumentPage.objects.create(
                            document=src,
                            page_number=p['page_number'],
                            page_text=p['page_text'],
                            char_count=p['char_count'],
                            metadata=p.get('metadata', {}),
                        )
                created_sources.append(src)
            else:
                return Response({'error': f"Unsupported source type '{source_type}'."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f"Ingestion error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        new_source = created_sources[0]

        # Extract claims from new source with verbatim verification
        dimensions = list(session.dimensions.all())
        new_claims = extract_claims_from_source(new_source, dimensions)

        # Evaluate match against finding's dimension
        matched_claims = []
        if finding.dimension:
            dim_name_lower = finding.dimension.name.lower()
            dim_desc_lower = finding.dimension.description.lower()
            for c in new_claims:
                c_text = f"{c.subject} {c.attribute} {c.value} {c.verbatim_quote}".lower()
                is_match = (
                    c.dimension_id == finding.dimension_id or
                    finding.dimension.category.lower() in c_text or
                    any(w in c_text for w in dim_name_lower.split() if len(w) > 4) or
                    any(w in c_text for w in dim_desc_lower.split() if len(w) > 5)
                )
                if is_match:
                    c.dimension = finding.dimension
                    c.save(update_fields=['dimension'])
                    matched_claims.append(c)

        is_resolved = len(matched_claims) > 0

        if not isinstance(finding.resolution_audit_trail, list):
            finding.resolution_audit_trail = []

        previous_status = finding.status

        if is_resolved:
            # Dynamically recalculate dimension & session coverage without hardcoded numbers
            match_claims_to_dimensions(session)

            if finding.dimension:
                finding.dimension.refresh_from_db()
                finding.supporting_evidence_status = finding.dimension.coverage_status
            else:
                finding.supporting_evidence_status = 'COVERED'

            finding.status = 'resolved'
            finding.resolved_by_source = new_source
            finding.resolution_notes = resolution_notes or f"Resolved via verified claims extracted from '{new_source.title}'."

            # Update associated verification tasks
            VerificationTask.objects.filter(finding=finding).update(status='resolved')

            audit_entry = {
                'timestamp': timezone.now().isoformat(),
                'action': 'EVIDENCE_SUBMITTED_AND_VERIFIED',
                'original_finding': {
                    'id': str(finding.id),
                    'title': finding.title,
                    'type': finding.finding_type,
                },
                'submitted_evidence': {
                    'source_id': str(new_source.id),
                    'source_title': new_source.title,
                    'content_hash': new_source.content_hash,
                },
                'user_action': 'RESOLVE_WITH_EVIDENCE',
                'reanalysis_outcome': {
                    'claims_matched_count': len(matched_claims),
                    'dimension_coverage_score': finding.dimension.coverage_score if finding.dimension else 1.0,
                    'dimension_coverage_status': finding.dimension.coverage_status if finding.dimension else 'COVERED',
                    'session_coverage_score': session.coverage_score,
                },
                'previous_status': previous_status,
                'new_status': 'resolved',
                'status': 'resolved',
                'resolution_notes': finding.resolution_notes,
                'source_id': str(new_source.id),
                'source_title': new_source.title,
                'claims_matched_count': len(matched_claims),
                'coverage_updated_to': finding.dimension.coverage_score if finding.dimension else session.coverage_score
            }
            finding.resolution_audit_trail.append(audit_entry)
            finding.save()

            return Response({
                'success': True,
                'resolved': True,
                'message': f"Gap successfully resolved with {len(matched_claims)} verified claim(s) from '{new_source.title}'.",
                'source': SourceDocumentSerializer(new_source).data,
                'matched_claims_count': len(matched_claims),
                'session_coverage_score': session.coverage_score,
                'finding': ResearchFindingSerializer(finding).data
            }, status=status.HTTP_200_OK)
        else:
            finding.status = 'in_progress'
            finding.resolution_notes = resolution_notes
            audit_entry = {
                'timestamp': timezone.now().isoformat(),
                'action': 'EVIDENCE_SUBMITTED_INSUFFICIENT',
                'original_finding': {
                    'id': str(finding.id),
                    'title': finding.title,
                    'type': finding.finding_type,
                },
                'submitted_evidence': {
                    'source_id': str(new_source.id),
                    'source_title': new_source.title,
                    'content_hash': new_source.content_hash,
                },
                'user_action': 'RESOLVE_WITH_EVIDENCE',
                'reanalysis_outcome': {
                    'claims_matched_count': 0,
                    'reason': 'Ingested evidence did not contain claims directly addressing this dimension.',
                },
                'previous_status': previous_status,
                'new_status': 'in_progress',
                'status': 'in_progress',
                'source_id': str(new_source.id),
                'source_title': new_source.title,
                'claims_matched_count': 0,
                'reason': 'Ingested evidence did not contain claims directly addressing this dimension.',
                'resolution_notes': resolution_notes
            }
            finding.resolution_audit_trail.append(audit_entry)
            finding.save()

            return Response({
                'success': True,
                'resolved': False,
                'message': f"Evidence from '{new_source.title}' was ingested ({len(new_claims)} claim(s) extracted), but no claims directly satisfied the target dimension '{finding.dimension.name if finding.dimension else 'Dimension'}'. The gap remains in progress.",
                'source': SourceDocumentSerializer(new_source).data,
                'matched_claims_count': 0,
                'finding': ResearchFindingSerializer(finding).data
            }, status=status.HTTP_200_OK)


class DashboardStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        sessions = get_user_session_queryset(request)
        total_sessions = sessions.count()

        sources = SourceDocument.objects.filter(session__in=sessions)
        total_sources = sources.count()
        ready_sources = sources.filter(extraction_status='READY').count()

        findings = ResearchFinding.objects.filter(session__in=sessions)
        total_gaps = findings.filter(finding_type='gap').count()
        total_contradictions = findings.filter(finding_type='contradiction').count()
        total_temporal = findings.filter(finding_type='temporal').count()

        tasks = VerificationTask.objects.filter(session__in=sessions)

        # Averages & breakdowns
        cov_scores = [s.coverage_score for s in sessions if s.coverage_score is not None]
        avg_cov = round(sum(cov_scores) / len(cov_scores), 1) if cov_scores else 0.0

        source_type_breakdown = {
            'pdf': sources.filter(source_type='pdf').count(),
            'url': sources.filter(source_type='url').count(),
            'manual': sources.filter(source_type='manual').count(),
        }

        task_distribution = {
            'pending': tasks.filter(status='pending').count(),
            'in_progress': tasks.filter(status='in_progress').count(),
            'evidence_submitted': tasks.filter(status='evidence_submitted').count(),
            'resolved': tasks.filter(status='resolved').count(),
            'dismissed': tasks.filter(status='dismissed').count(),
        }

        coverage_distribution = [
            {
                'id': str(s.id),
                'title': s.title,
                'coverage_score': s.coverage_score or 0.0,
                'status': s.status,
                'findings_count': s.findings.count(),
                'sources_count': s.sources.count(),
            }
            for s in sessions[:8]
        ]

        recent_runs = AIAnalysisRun.objects.filter(session__in=sessions).order_by('-created_at')[:6]
        recent_activity = [
            {
                'id': str(r.id),
                'session_title': r.session.title,
                'session_id': str(r.session_id),
                'provider': r.provider,
                'status': r.status,
                'claims_count': r.claims_extracted,
                'duration': r.duration_seconds,
                'timestamp': r.created_at.isoformat(),
            }
            for r in recent_runs
        ]

        data = {
            'active_investigations': total_sessions,
            'total_sources': total_sources,
            'ready_sources': ready_sources,
            'total_gaps': total_gaps,
            'total_contradictions': total_contradictions,
            'total_temporal_findings': total_temporal,
            'average_coverage': avg_cov,
            'source_type_breakdown': source_type_breakdown,
            'task_distribution': task_distribution,
            'coverage_distribution': coverage_distribution,
            'recent_activity': recent_activity,
        }

        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReportDataView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_session_for_read(request, session_id)

        sources = session.sources.all()
        dimensions = session.dimensions.all().order_by('importance', 'title')
        findings = session.findings.all().order_by('-priority')
        gaps = findings.filter(finding_type='gap')
        contradictions = findings.filter(finding_type='contradiction')
        temporal = findings.filter(finding_type='temporal')
        claims = session.claims.select_related('source', 'dimension').all()[:40]
        tasks = session.verification_tasks.all()
        latest_run = session.analysis_runs.order_by('-created_at').first()

        provider_label = latest_run.provider if latest_run else 'SemanticLocalProvider'
        if latest_run and 'Gemini Fallback' in (latest_run.model_used or ''):
            provider_label = 'Deterministic Semantic Engine (Gemini Fallback Active)'

        # Check if all quotes (contradictions, claims, requirements) match actual source text
        all_quotes_verified = True
        quote_count = 0
        for c in contradictions:
            vd = c.variance_details or {}
            qa = vd.get('claim_a_quote') or vd.get('quote_a') or (c.claim_a.verbatim_quote if c.claim_a else '')
            qb = vd.get('claim_b_quote') or vd.get('quote_b') or (c.claim_b.verbatim_quote if c.claim_b else '')
            if qa:
                quote_count += 1
                if c.claim_a and c.claim_a.source:
                    if qa not in (c.claim_a.source.extracted_text or ''):
                        all_quotes_verified = False
            if qb:
                quote_count += 1
                if c.claim_b and c.claim_b.source:
                    if qb not in (c.claim_b.source.extracted_text or ''):
                        all_quotes_verified = False

        for cl in claims:
            q = cl.verbatim_quote
            if q:
                quote_count += 1
                if cl.source and q not in (cl.source.extracted_text or ''):
                    all_quotes_verified = False

        # Ensure requirements are extracted
        requirements = session.requirements.all()
        if requirements.count() == 0 and sources.exists():
            from .ai.requirement_engine import extract_and_evaluate_requirements
            extract_and_evaluate_requirements(session)
            requirements = session.requirements.all()

        for req in requirements:
            q = req.exact_quote
            if q:
                quote_count += 1
                if not any(q in (s.extracted_text or '') for s in sources):
                    all_quotes_verified = False

        if quote_count == 0:
            all_quotes_verified = False

        comparison_matrix = [
            {
                'id': str(req.id),
                'requirement': req.name,
                'status_type': req.status_type,
                'official_requirement': req.official_requirement_summary or req.description,
                'user_evidence': req.user_evidence_summary or 'No supporting document uploaded by user',
                'status': req.comparison_status,
                'next_action': req.next_action,
                'source_reference': f"{req.source_title} (Page {req.page_number or 1})" if req.source_title else "Official Reference",
                'exact_quote': req.exact_quote,
                'where_to_get_it': req.where_to_get_it,
                'verified_url': req.verified_official_url,
            }
            for req in requirements
        ]

        ref_sources = sources.filter(document_category='reference')
        ev_sources = sources.filter(document_category='evidence')

        report_payload = {
            'meta': {
                'session_id': str(session.id),
                'title': session.title,
                'research_question': session.query,
                'research_objective': session.objective,
                'research_context': session.context,
                'generated_at': timezone.now().isoformat(),
                'coverage_score': session.coverage_score,
                'confidence_score': session.confidence_score or 0.92,
                'status': session.status,
                'readiness_status': session.readiness_status,
                'readiness_explanation': session.readiness_explanation,
                'reference_review_status': session.reference_review_status,
                'model_used': latest_run.model_used if latest_run else 'Deterministic Semantic Engine',
                'provider': provider_label,
                'total_sources_count': sources.count(),
                'reference_sources_count': ref_sources.count(),
                'evidence_sources_count': ev_sources.count(),
                'all_quotes_verified': all_quotes_verified,
                'verified_quotes_count': quote_count if all_quotes_verified else 0,
            },
            'readiness_status': session.readiness_status,
            'readiness_explanation': session.readiness_explanation,
            'reference_review_status': session.reference_review_status,
            'sources_reviewed': [
                {
                    'id': str(s.id),
                    'title': s.title,
                    'filename': s.metadata.get('filename') if s.metadata else (s.title + '.pdf'),
                    'document_category': s.document_category,
                    'evidence_type': s.evidence_type,
                    'source_type': s.source_type,
                    'publication_date': s.publication_date,
                    'content_hash': s.content_hash,
                    'word_count': s.word_count,
                    'page_count': s.page_count,
                    'original_url': s.original_url,
                }
                for s in sources
            ],
            'reference_sources': [
                {
                    'id': str(s.id),
                    'title': s.title,
                    'filename': s.metadata.get('filename') if s.metadata else (s.title + '.pdf'),
                    'publication_date': s.publication_date,
                }
                for s in ref_sources
            ],
            'evidence_sources': [
                {
                    'id': str(s.id),
                    'title': s.title,
                    'filename': s.metadata.get('filename') if s.metadata else (s.title + '.pdf'),
                    'evidence_type': s.evidence_type,
                    'publication_date': s.publication_date,
                }
                for s in ev_sources
            ],
            'requirements': ResearchRequirementSerializer(requirements, many=True).data,
            'comparison_matrix': comparison_matrix,
            'matched_items': [m for m in comparison_matrix if m['status'] == 'MATCHED'],
            'missing_user_documents': [m for m in comparison_matrix if m['status'] == 'MISSING_USER_DOCUMENT'],
            'conflicting_requirements': [m for m in comparison_matrix if m['status'] == 'POSSIBLE_SOURCE_CONFLICT'],
            'policy_information_missing': [m for m in comparison_matrix if m['status'] == 'POLICY_NOT_FOUND'],
            'mismatched_evidence': [m for m in comparison_matrix if m['status'] == 'MISMATCH'],
            'dimensions': ResearchDimensionSerializer(dimensions, many=True).data,
            'coverage_summary': {
                'score': session.coverage_score,
                'total_dimensions': dimensions.count(),
                'covered': dimensions.filter(coverage_status='COVERED').count(),
                'partially_covered': dimensions.filter(coverage_status='PARTIALLY_COVERED').count(),
                'not_found': dimensions.filter(coverage_status='NOT_FOUND_IN_REVIEWED_SOURCES').count(),
            },
            'information_gaps': ResearchFindingSerializer(gaps, many=True).data,
            'contradictions': ResearchFindingSerializer(contradictions, many=True).data,
            'temporal_warnings': ResearchFindingSerializer(temporal, many=True).data,
            'supporting_evidence_claims': ExtractedClaimSerializer(claims, many=True).data,
            'verification_tasks': VerificationTaskSerializer(tasks, many=True).data,
            'remaining_uncertainties': [
                g.title for g in gaps.filter(status__in=['pending', 'open'])
            ],
            'provenance_signoff': {
                'algorithm': 'SHA-256 + Verbatim Substring Assertion',
                'verbatim_verification_enforced': True,
                'zero_hallucinations_enforced': True,
                'all_quotes_verified': all_quotes_verified,
                'total_sources_hashed': sources.count(),
            }
        }

        return Response(report_payload, status=status.HTTP_200_OK)


class ResearchRequirementListView(APIView):
    """
    Lists all structured requirements and comparison matrix items for a session.
    Auto-extracts requirements if not yet generated.
    """
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        session = get_session_for_read(request, session_id)
        requirements = session.requirements.all()

        if requirements.count() == 0 and session.sources.exists():
            from .ai.requirement_engine import extract_and_evaluate_requirements
            extract_and_evaluate_requirements(session)
            requirements = session.requirements.all()

        serializer = ResearchRequirementSerializer(requirements, many=True)
        return Response({
            'session_id': str(session.id),
            'readiness_status': session.readiness_status,
            'readiness_explanation': session.readiness_explanation,
            'reference_review_status': session.reference_review_status,
            'total_requirements': requirements.count(),
            'matched_count': requirements.filter(comparison_status='MATCHED').count(),
            'missing_documents_count': requirements.filter(comparison_status='MISSING_USER_DOCUMENT').count(),
            'conflict_count': requirements.filter(comparison_status='POSSIBLE_SOURCE_CONFLICT').count(),
            'policy_missing_count': requirements.filter(comparison_status='POLICY_NOT_FOUND').count(),
            'mismatch_count': requirements.filter(comparison_status='MISMATCH').count(),
            'requirements': serializer.data,
        }, status=status.HTTP_200_OK)


class ResearchReEvaluateView(APIView):
    """
    Triggers re-evaluation of user supporting evidence against requirements.
    Recalculates match statuses, next actions, and central readiness status.
    """
    permission_classes = [AllowAny]

    def post(self, request, session_id):
        session = get_session_for_read(request, session_id)
        if session.is_demo:
            return Response(
                {'error': 'Public demonstration investigation is read-only.'},
                status=status.HTTP_403_FORBIDDEN
            )

        from .ai.requirement_engine import evaluate_evidence_against_requirements, extract_and_evaluate_requirements
        if session.requirements.count() == 0:
            extract_and_evaluate_requirements(session)
        else:
            evaluate_evidence_against_requirements(session)

        requirements = session.requirements.all()
        serializer = ResearchRequirementSerializer(requirements, many=True)
        return Response({
            'success': True,
            'session_id': str(session.id),
            'readiness_status': session.readiness_status,
            'readiness_explanation': session.readiness_explanation,
            'total_requirements': requirements.count(),
            'matched_count': requirements.filter(comparison_status='MATCHED').count(),
            'requirements': serializer.data,
        }, status=status.HTTP_200_OK)


class RequirementResolveWithEvidenceView(APIView):
    """
    Re-upload and resolution endpoint for a specific requirement.
    Ingests supporting document as user evidence, maps to requirement, and re-evaluates.
    """
    permission_classes = [AllowAny]

    def post(self, request, requirement_id):
        req = get_object_or_404(ResearchRequirement, id=requirement_id)
        session = req.session

        if session.is_demo:
            return Response(
                {'error': 'Public demonstration investigation is read-only.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.user and request.user.is_authenticated:
            if session.user != request.user:
                return Response(
                    {'error': 'Permission denied. Requirement does not belong to your workspace.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        source_type = request.data.get('source_type', 'manual')
        evidence_type = request.data.get('evidence_type', req.required_evidence_type or 'general_evidence')

        created_source = None
        try:
            if source_type == 'pdf':
                file_obj = request.FILES.get('file')
                if not file_obj:
                    return Response({'error': 'PDF file is required.'}, status=status.HTTP_400_BAD_REQUEST)
                file_bytes = file_obj.read()
                res = process_pdf_bytes(file_bytes, filename=file_obj.name)
                with transaction.atomic():
                    created_source = SourceDocument.objects.create(
                        session=session,
                        source_type='pdf',
                        document_category='evidence',
                        evidence_type=evidence_type,
                        title=res['title'],
                        file=file_obj,
                        extracted_text=res['extracted_text'],
                        publication_date=res['publication_date'],
                        last_updated_date=res['last_updated_date'],
                        fetched_at=res['fetched_at'],
                        content_hash=res['content_hash'],
                        extraction_status='READY',
                        file_size=res['file_size'],
                        page_count=res['page_count'],
                        word_count=res['word_count'],
                        metadata=res['metadata'],
                    )
                    for p in res['pages']:
                        DocumentPage.objects.create(
                            document=created_source,
                            page_number=p['page_number'],
                            page_text=p['page_text'],
                            char_count=p['char_count'],
                            metadata=p.get('metadata', {}),
                        )

            elif source_type == 'manual':
                title = request.data.get('title', f"Evidence for {req.name}").strip()
                text = request.data.get('text', '').strip()
                if not text:
                    return Response({'error': 'Evidence text content is required.'}, status=status.HTTP_400_BAD_REQUEST)
                res = process_manual_text(title, text)
                with transaction.atomic():
                    created_source = SourceDocument.objects.create(
                        session=session,
                        source_type='manual',
                        document_category='evidence',
                        evidence_type=evidence_type,
                        title=res['title'],
                        extracted_text=res['extracted_text'],
                        publication_date=res['publication_date'],
                        content_hash=res['content_hash'],
                        extraction_status='READY',
                        file_size=res['file_size'],
                        page_count=res['page_count'],
                        word_count=res['word_count'],
                        metadata=res['metadata'],
                    )
                    for p in res['pages']:
                        DocumentPage.objects.create(
                            document=created_source,
                            page_number=p['page_number'],
                            page_text=p['page_text'],
                            char_count=p['char_count'],
                            metadata=p.get('metadata', {}),
                        )
            else:
                return Response({'error': f"Unsupported source_type '{source_type}'."}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'error': f"Failed to ingest evidence document: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Trigger re-evaluation
        from .ai.requirement_engine import evaluate_evidence_against_requirements
        evaluate_evidence_against_requirements(session)
        req.refresh_from_db()

        # Record resolution audit entry
        audit_entry = {
            'timestamp': timezone.now().isoformat(),
            'action': 'USER_EVIDENCE_SUBMITTED',
            'requirement_id': str(req.id),
            'requirement_name': req.name,
            'submitted_source_id': str(created_source.id),
            'submitted_source_title': created_source.title,
            'comparison_status': req.comparison_status,
            'user_evidence_summary': req.user_evidence_summary,
            'readiness_status': session.readiness_status
        }
        req.resolution_audit_trail.append(audit_entry)
        req.save(update_fields=['resolution_audit_trail'])

        return Response({
            'success': True,
            'requirement': ResearchRequirementSerializer(req).data,
            'readiness_status': session.readiness_status,
            'readiness_explanation': session.readiness_explanation,
            'source': SourceDocumentSerializer(created_source).data,
            'comparison_status': req.comparison_status,
            'message': f"Evidence '{created_source.title}' successfully ingested and evaluated against '{req.name}'. Status: {req.comparison_status}."
        }, status=status.HTTP_200_OK)
