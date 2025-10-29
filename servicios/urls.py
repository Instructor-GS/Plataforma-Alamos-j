from django.urls import path
from . import views

app_name = 'servicios'

urlpatterns = [
    path('agendar/', views.agendar_servicio, name='agendar'),
    path('mis-servicios/', views.mis_servicios, name='mis_servicios'),
    path('cancelar/<int:servicio_id>/', views.cancelar_servicio, name='cancelar'),
]