from django.db import models
from django.conf import settings

class ServicioAgendado(models.Model):
    """
    Modelo para servicios agendados por los usuarios
    """
    TIPOS_SERVICIO = [
        ('residencial', 'Servicios Residenciales'),
        ('empresarial', 'Servicios Empresariales'),
        ('especializado', 'Servicios Especializados'),
        ('postobra', 'Servicios Post-obra'),
    ]
    
    ESTADOS_SERVICIO = [
        ('pendiente', 'Pendiente'),
        ('confirmado', 'Confirmado'),
        ('en_proceso', 'En Proceso'),
        ('completado', 'Completado'),
        ('cancelado', 'Cancelado'),
    ]
    
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        verbose_name="Usuario"
    )
    tipo_servicio = models.CharField(
        max_length=20, 
        choices=TIPOS_SERVICIO, 
        verbose_name="Tipo de Servicio"
    )
    descripcion = models.TextField(verbose_name="Descripción del Servicio")
    direccion_servicio = models.TextField(verbose_name="Dirección del Servicio")
    fecha_servicio = models.DateTimeField(verbose_name="Fecha y Hora del Servicio")
    estado = models.CharField(
        max_length=15, 
        choices=ESTADOS_SERVICIO, 
        default='pendiente',
        verbose_name="Estado"
    )
    precio_estimado = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Precio Estimado"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")
    
    class Meta:
        verbose_name = "Servicio Agendado"
        verbose_name_plural = "Servicios Agendados"
        db_table = "servicios_agendados"
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.get_tipo_servicio_display()} - {self.usuario.username} ({self.estado})"


class HistorialServicio(models.Model):
    """
    Modelo para el historial detallado de servicios completados
    """
    servicio = models.OneToOneField(
        ServicioAgendado, 
        on_delete=models.CASCADE, 
        verbose_name="Servicio"
    )
    fecha_inicio = models.DateTimeField(verbose_name="Fecha de Inicio")
    fecha_finalizacion = models.DateTimeField(verbose_name="Fecha de Finalización")
    calificacion = models.IntegerField(
        choices=[(i, i) for i in range(1, 6)], 
        null=True, 
        blank=True,
        verbose_name="Calificación (1-5)"
    )
    comentarios_cliente = models.TextField(
        blank=True, 
        verbose_name="Comentarios del Cliente"
    )
    reporte_trabajo = models.TextField(
        blank=True, 
        verbose_name="Reporte de Trabajo Realizado"
    )
    
    class Meta:
        verbose_name = "Historial de Servicio"
        verbose_name_plural = "Historiales de Servicios"
        db_table = "historial_servicios"
    
    def __str__(self):
        return f"Historial - {self.servicio}"


class SeguimientoServicio(models.Model):
    """
    Modelo para el seguimiento detallado de servicios en proceso
    """
    servicio = models.OneToOneField(
        ServicioAgendado, 
        on_delete=models.CASCADE, 
        verbose_name="Servicio"
    )
    equipo_asignado = models.CharField(
        max_length=100, 
        verbose_name="Equipo Asignado"
    )
    progreso_porcentaje = models.IntegerField(
        default=0, 
        verbose_name="Progreso (%)"
    )
    tareas_completadas = models.JSONField(
        default=list, 
        verbose_name="Tareas Completadas"
    )
    ubicacion_actual = models.CharField(
        max_length=200, 
        blank=True,
        verbose_name="Ubicación Actual del Equipo"
    )
    tiempo_estimado_finalizacion = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Tiempo Estimado de Finalización"
    )
    
    class Meta:
        verbose_name = "Seguimiento de Servicio"
        verbose_name_plural = "Seguimientos de Servicios"
        db_table = "seguimiento_servicios"
    
    def __str__(self):
        return f"Seguimiento - {self.servicio} ({self.progreso_porcentaje}%)"


class FacturacionServicio(models.Model):
    """
    Modelo para la facturación y pagos de servicios
    """
    ESTADOS_PAGO = [
        ('pendiente', 'Pendiente'),
        ('pagado', 'Pagado'),
        ('parcial', 'Pago Parcial'),
        ('vencido', 'Vencido'),
    ]
    
    servicio = models.OneToOneField(
        ServicioAgendado, 
        on_delete=models.CASCADE, 
        verbose_name="Servicio"
    )
    monto_total = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Monto Total"
    )
    monto_pagado = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name="Monto Pagado"
    )
    estado_pago = models.CharField(
        max_length=15, 
        choices=ESTADOS_PAGO, 
        default='pendiente',
        verbose_name="Estado del Pago"
    )
    fecha_vencimiento = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Fecha de Vencimiento"
    )
    fecha_pago = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Fecha de Pago"
    )
    metodo_pago = models.CharField(
        max_length=50, 
        blank=True,
        verbose_name="Método de Pago"
    )
    numero_factura = models.CharField(
        max_length=20, 
        unique=True,
        verbose_name="Número de Factura"
    )
    
    class Meta:
        verbose_name = "Facturación de Servicio"
        verbose_name_plural = "Facturaciones de Servicios"
        db_table = "facturacion_servicios"
        ordering = ['-fecha_pago']
    
    def __str__(self):
        return f"Factura {self.numero_factura} - {self.servicio}"
    
    @property
    def monto_pendiente(self):
        return self.monto_total - self.monto_pagado
