from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
from .models import ServicioAgendado, HistorialServicio, SeguimientoServicio, FacturacionServicio
import json
from datetime import datetime, timedelta
from decimal import Decimal

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def agendar_servicio(request):
    """
    Endpoint para agendar un nuevo servicio
    """
    try:
        data = json.loads(request.body)
        
        # Validar campos requeridos
        required_fields = ['tipo_servicio', 'descripcion', 'direccion_servicio', 'fecha_servicio']
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    'success': False,
                    'message': f'El campo {field} es requerido'
                }, status=400)
        
        # Validar tipo de servicio
        tipos_validos = ['residencial', 'empresarial', 'especializado', 'postobra']
        if data['tipo_servicio'] not in tipos_validos:
            return JsonResponse({
                'success': False,
                'message': 'Tipo de servicio inválido'
            }, status=400)
        
        # Parsear fecha
        try:
            fecha_servicio = parse_datetime(data['fecha_servicio'])
            if not fecha_servicio:
                return JsonResponse({
                    'success': False,
                    'message': 'Formato de fecha inválido. Use ISO format (YYYY-MM-DDTHH:MM:SS)'
                }, status=400)
        except ValueError:
            return JsonResponse({
                'success': False,
                'message': 'Formato de fecha inválido'
            }, status=400)
        
        # Crear servicio agendado
        servicio = ServicioAgendado.objects.create(
            usuario=request.user,
            tipo_servicio=data['tipo_servicio'],
            descripcion=data['descripcion'],
            direccion_servicio=data['direccion_servicio'],
            fecha_servicio=fecha_servicio,
            precio_estimado=data.get('precio_estimado')
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Servicio agendado exitosamente',
            'servicio': {
                'id': servicio.id,
                'tipo_servicio': servicio.get_tipo_servicio_display(),
                'descripcion': servicio.descripcion,
                'direccion_servicio': servicio.direccion_servicio,
                'fecha_servicio': servicio.fecha_servicio.isoformat(),
                'estado': servicio.get_estado_display(),
                'precio_estimado': str(servicio.precio_estimado) if servicio.precio_estimado else None
            }
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
@require_http_methods(["GET"])
def mis_servicios(request):
    """
    Endpoint para obtener los servicios del usuario autenticado
    """
    try:
        # Verificar si el usuario está autenticado
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'message': 'Usuario no autenticado'
            }, status=401)
        
        servicios = ServicioAgendado.objects.filter(usuario=request.user)
        
        servicios_data = []
        for servicio in servicios:
            servicios_data.append({
                'id': servicio.id,
                'tipo_servicio': servicio.get_tipo_servicio_display(),
                'descripcion': servicio.descripcion,
                'direccion_servicio': servicio.direccion_servicio,
                'fecha_servicio': servicio.fecha_servicio.isoformat(),
                'estado': servicio.get_estado_display(),
                'precio_estimado': str(servicio.precio_estimado) if servicio.precio_estimado else None,
                'fecha_creacion': servicio.fecha_creacion.isoformat()
            })
        
        return JsonResponse({
            'success': True,
            'servicios': servicios_data,
            'total': len(servicios_data)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)

@csrf_exempt
@login_required
@require_http_methods(["PUT"])
def cancelar_servicio(request, servicio_id):
    """
    Endpoint para cancelar un servicio agendado
    """
    try:
        servicio = ServicioAgendado.objects.get(id=servicio_id, usuario=request.user)
        
        if servicio.estado in ['completado', 'cancelado']:
            return JsonResponse({
                'success': False,
                'message': 'No se puede cancelar un servicio completado o ya cancelado'
            }, status=400)
        
        servicio.estado = 'cancelado'
        servicio.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Servicio cancelado exitosamente'
        })
        
    except ServicioAgendado.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Servicio no encontrado'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)
