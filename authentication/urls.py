from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    path('registro/', views.registro_usuario, name='registro'),
    path('login/', views.login_usuario, name='login'),
    path('logout/', views.logout_usuario, name='logout'),
    path('verificar-sesion/', views.verificar_sesion, name='verificar_sesion'),
]