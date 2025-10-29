"""
URL configuration for alamosjclean project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse
from django.shortcuts import get_object_or_404
import os

def serve_static_file(request, filename):
    """Servir archivos estáticos desde el directorio raíz"""
    file_path = os.path.join(settings.BASE_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'))
    else:
        from django.http import Http404
        raise Http404("File not found")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/servicios/', include('servicios.urls')),
    path('styles.css', serve_static_file, {'filename': 'styles.css'}, name='styles'),
    path('script.js', serve_static_file, {'filename': 'script.js'}, name='script'),
    path('Logo2.png', serve_static_file, {'filename': 'Logo2.png'}, name='logo'),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]

# Servir archivos estáticos en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0] if settings.STATICFILES_DIRS else settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
