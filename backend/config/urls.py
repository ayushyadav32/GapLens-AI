import datetime
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.db import connection

def health_check(request):
    """
    Core API Health Check endpoint verifying database connectivity
    and system status.
    """
    db_status = "ok"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        db_status = f"error: {str(e)}"

    return JsonResponse({
        "status": "ok" if db_status == "ok" else "degraded",
        "platform": "GapLens AI",
        "tagline": "Intelligence begins where information ends.",
        "subtitle": "AI-powered research and information gap detection.",
        "problem_statement": "DIGITAL DARK SPOT — AI-Assisted Information Gap Detection Platform",
        "version": "1.0.0",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "services": {
            "database": db_status,
            "auth": "ok",
            "ai_engine": "ready",
            "vector_search": "faiss-cpu",
        }
    })

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('accounts.urls')),
    path('api/research/', include('research.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
