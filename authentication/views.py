from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
import json

Usuario = get_user_model()

@csrf_exempt
@require_http_methods(["POST"])
def registro_usuario(request):
    """
    Endpoint para registro de nuevos usuarios
    """
    try:
        # Verificar si es FormData (con archivo) o JSON
        if request.content_type.startswith('multipart/form-data'):
            # Manejar FormData (con foto de perfil)
            data = request.POST
            foto_perfil = request.FILES.get('profilePhoto')
        else:
            # Manejar JSON (sin foto de perfil)
            data = json.loads(request.body)
            foto_perfil = None
        
        # Validar campos requeridos
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    'success': False,
                    'message': f'El campo {field} es requerido'
                }, status=400)
        
        # Verificar si el usuario ya existe
        if Usuario.objects.filter(username=data['username']).exists():
            return JsonResponse({
                'success': False,
                'message': 'El nombre de usuario ya existe'
            }, status=400)
        
        if Usuario.objects.filter(email=data['email']).exists():
            return JsonResponse({
                'success': False,
                'message': 'El email ya está registrado'
            }, status=400)
        
        # Crear nuevo usuario
        usuario = Usuario.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            telefono=data.get('telefono', ''),
            direccion=data.get('direccion', '')
        )
        
        # Agregar foto de perfil si se proporcionó
        if foto_perfil:
            usuario.foto_perfil = foto_perfil
            usuario.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Usuario registrado exitosamente',
            'user_id': usuario.id
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Datos JSON inválidos'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def login_usuario(request):
    """
    Endpoint para login de usuarios
    """
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({
                'success': False,
                'message': 'Username y password son requeridos'
            }, status=400)
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            if user.is_active:
                login(request, user)
                
                # Forzar la creación de la sesión
                request.session.save()
                
                # Debug: imprimir información de la sesión después del login
                print(f"Login successful - Session key: {request.session.session_key}")
                print(f"User: {user}")
                print(f"Session items after login: {dict(request.session.items())}")
                
                return JsonResponse({
                    'success': True,
                    'message': 'Login exitoso',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'telefono': user.telefono,
                        'direccion': user.direccion,
                        'foto_perfil': user.foto_perfil.url if user.foto_perfil else None
                    }
                })
            else:
                return JsonResponse({
                    'success': False,
                    'message': 'Usuario inactivo'
                }, status=401)
        else:
            return JsonResponse({
                'success': False,
                'message': 'Credenciales inválidas'
            }, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Datos JSON inválidos'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)
        return JsonResponse({
            'success': False,
            'message': 'Datos JSON inválidos'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)

@require_http_methods(["POST"])
def logout_usuario(request):
    """
    Endpoint para logout de usuarios
    """
    try:
        if request.user.is_authenticated:
            logout(request)
            return JsonResponse({
                'success': True,
                'message': 'Logout exitoso'
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Usuario no autenticado'
            }, status=401)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)

def verificar_sesion(request):
    """
    Endpoint para verificar si el usuario está autenticado
    """
    try:
        # Debug: imprimir información de la sesión y headers
        print(f"=== VERIFICAR SESION DEBUG ===")
        print(f"Session key: {request.session.session_key}")
        print(f"User authenticated: {request.user.is_authenticated}")
        print(f"User: {request.user}")
        print(f"Session items: {dict(request.session.items())}")
        print(f"Cookies: {request.COOKIES}")
        print(f"Headers: {dict(request.headers)}")
        print(f"Method: {request.method}")
        print(f"Origin: {request.headers.get('Origin', 'No Origin')}")
        print(f"Referer: {request.headers.get('Referer', 'No Referer')}")
        print(f"================================")
        
        if request.user.is_authenticated:
            return JsonResponse({
                'success': True,
                'autenticado': True,
                'usuario': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email,
                    'first_name': request.user.first_name,
                    'last_name': request.user.last_name,
                    'telefono': getattr(request.user, 'telefono', ''),
                    'direccion': getattr(request.user, 'direccion', '')
                }
            })
        else:
            return JsonResponse({
                'success': True,
                'autenticado': False,
                'usuario': None
            })
    except Exception as e:
        print(f"Error en verificar_sesion: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)
