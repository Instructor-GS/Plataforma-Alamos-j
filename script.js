// Variables globales
let currentUser = null;
let services = [];
let currentService = null;

// Datos de ejemplo
const sampleServices = [
    {
        id: 1,
        type: 'residencial',
        date: '2024-12-20',
        time: '14:00',
        address: 'Calle 15 #23-45, Riohacha',
        status: 'en_progreso',
        progress: 65,
        team: ['María González', 'Carlos Pérez'],
        checklist: [
            { task: 'Alistamiento y verificación EPP', completed: true, time: '14:00' },
            { task: 'Limpieza de sala', completed: true, time: '14:30' },
            { task: 'Limpieza de cocina', completed: false, time: 'En progreso' },
            { task: 'Limpieza de baños', completed: false, time: 'Pendiente' },
            { task: 'Control de calidad', completed: false, time: 'Pendiente' }
        ],
        cost: 85000
    },
    {
        id: 2,
        type: 'residencial',
        date: '2024-12-22',
        time: '15:00',
        address: 'Carrera 10 #45-67, Riohacha',
        status: 'programado',
        team: ['Ana Martínez', 'Luis Rodríguez'],
        cost: 85000
    }
];

const serviceHistory = [
    {
        id: 'service1',
        date: '2024-12-15',
        type: 'Limpieza Residencial',
        status: 'completado',
        rating: 5,
        cost: 85000,
        photos: ['antes1.jpg', 'despues1.jpg']
    },
    {
        id: 'service2',
        date: '2024-12-08',
        type: 'Limpieza Profunda',
        status: 'completado',
        rating: 5,
        cost: 120000,
        photos: ['antes2.jpg', 'despues2.jpg']
    }
];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateDateTime();
    checkSession(); // Verificar sesión al cargar la página
});

function initializeApp() {
    // Configurar fecha mínima para el agendamiento
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateInput = document.getElementById('serviceDate');
    if (dateInput) {
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }
    
    // currentUser se establecerá solo cuando haya autenticación real
    // services se cargarán desde la API cuando el usuario esté autenticado
}

function setupEventListeners() {
    // Navegación suave
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            if (target.startsWith('#')) {
                document.querySelector(target).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Formulario de agendamiento
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }
    
    // Formularios de login y registro
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Menú hamburguesa
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
}

// Funciones de modal
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

function showBooking() {
    // Verificar si el usuario está autenticado antes de mostrar el formulario de agendamiento
    if (!currentUser) {
        showErrorMessage('Debe iniciar sesión para agendar un servicio.');
        showLogin();
        return;
    }
    
    // Solo mostrar el modal de agendamiento si el usuario está autenticado
    showModal('bookingModal');
}

function showClientPanel() {
    // Verificar si el usuario está autenticado antes de mostrar el panel
    if (!currentUser) {
        showErrorMessage('Debe iniciar sesión para acceder al Panel Cliente.');
        showLogin();
        return;
    }
    
    // Solo mostrar el modal y cargar datos si el usuario está autenticado
    showModal('clientModal');
    loadClientData();
}

function showLogin() {
    closeModal('registerModal');
    showModal('loginModal');
}

function showRegister() {
    closeModal('loginModal');
    showModal('registerModal');
}

// Funciones de servicios
function selectService(serviceType) {
    document.getElementById('serviceType').value = serviceType;
    showBooking();
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    // Verificar si el usuario está autenticado
    if (!currentUser) {
        showErrorMessage('Debe iniciar sesión para agendar un servicio.');
        showLogin();
        return;
    }
    
    showLoadingMessage('Procesando su solicitud...');
    
    const formData = new FormData(e.target);
    const bookingData = {
        tipo_servicio: document.getElementById('serviceType').value,
        fecha: document.getElementById('serviceDate').value,
        hora: document.getElementById('serviceTime').value,
        direccion: document.getElementById('serviceAddress').value,
        area_metros: parseInt(document.getElementById('serviceArea').value),
        numero_habitaciones: parseInt(document.getElementById('serviceRooms').value),
        notas_especiales: document.getElementById('serviceNotes').value || '',
        nombre_contacto: document.getElementById('clientName').value,
        telefono_contacto: document.getElementById('clientPhone').value,
        email_contacto: document.getElementById('clientEmail').value
    };
    
    try {
        const response = await fetch('http://127.0.0.1:8000/api/servicios/agendar/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': await getCSRFToken()
            },
            credentials: 'include',
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        hideLoadingMessage();
        
        if (response.ok) {
            // Agregar el servicio a la lista local
            services.push({
                id: result.id,
                type: result.tipo_servicio,
                date: result.fecha,
                time: result.hora,
                address: result.direccion,
                status: result.estado,
                cost: result.precio_estimado || 0
            });
            
            showSuccessMessage('¡Servicio agendado exitosamente! Recibirá una confirmación por email.');
            closeModal('bookingModal');
            e.target.reset();
        } else {
            showErrorMessage(result.error || 'Error al agendar el servicio');
        }
    } catch (error) {
        hideLoadingMessage();
        showErrorMessage('Error de conexión. Intente nuevamente.');
        console.error('Error:', error);
    }
}

// Funciones del panel de cliente
async function loadClientData() {
    if (!currentUser) {
        showErrorMessage('Debe iniciar sesión para acceder al panel de cliente.');
        showLogin();
        return;
    }
    
    // Actualizar el nombre del usuario en el panel
    const clientNameElement = document.getElementById('clientName');
    const clientPhotoElement = document.getElementById('clientPhoto');
    const clientIconElement = document.getElementById('clientIcon');
    
    if (clientNameElement && currentUser) {
        // Construir el nombre completo usando first_name y last_name
        const nombreCompleto = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
        clientNameElement.textContent = nombreCompleto || currentUser.username || 'Usuario';
    }
    
    // Mostrar foto de perfil si existe
    if (clientPhotoElement && clientIconElement && currentUser) {
        if (currentUser.foto_perfil) {
            clientPhotoElement.src = currentUser.foto_perfil;
            clientPhotoElement.style.display = 'inline-block';
            clientIconElement.style.display = 'none';
        } else {
            clientPhotoElement.style.display = 'none';
            clientIconElement.style.display = 'inline-block';
        }
    }
    
    await loadUserServices();
    updateServiceHistory();
    updateBillingInfo();
}

// Función para cargar servicios del usuario desde la API
async function loadUserServices() {
    try {
        console.log('Iniciando carga de servicios del usuario...');
        
        // Verificar si hay datos de sesión en localStorage
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const currentUserData = localStorage.getItem('currentUser');
        
        if (!isLoggedIn || !currentUserData) {
            console.log('No hay datos de sesión en localStorage');
            showErrorMessage('Sesión no válida. Redirigiendo al login...');
            window.location.href = '/';
            return;
        }
        
        // Verificar sesión en el servidor
        const sessionResponse = await fetch('http://127.0.0.1:8000/api/auth/verificar-sesion/', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!sessionResponse.ok) {
            console.error('Error en verificación de sesión:', sessionResponse.status);
            showErrorMessage('Error de autenticación. Redirigiendo al login...');
            window.location.href = '/';
            return;
        }
        
        const sessionResult = await sessionResponse.json();
        console.log('Resultado de verificación de sesión:', sessionResult);
        
        if (!sessionResult.success || !sessionResult.autenticado) {
            console.error('Sesión no válida según el servidor');
            // Limpiar datos locales
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            showErrorMessage('Sesión no válida. Redirigiendo al login...');
            window.location.href = '/';
            return;
        }

        // Actualizar datos del usuario si es necesario
        if (sessionResult.usuario) {
            currentUser = sessionResult.usuario;
            localStorage.setItem('currentUser', JSON.stringify(sessionResult.usuario));
        }

        // Obtener el token CSRF antes de hacer la petición
        const csrfToken = await getCSRFToken();
        
        // Cargar servicios del usuario
        const servicesResponse = await fetch('http://127.0.0.1:8000/api/servicios/mis-servicios/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        if (servicesResponse.ok) {
            const result = await servicesResponse.json();
            if (result.success) {
                services = result.servicios.map(service => ({
                    id: service.id,
                    type: service.tipo_servicio,
                    date: service.fecha_servicio.split('T')[0], // Extraer solo la fecha
                    time: service.fecha_servicio.split('T')[1]?.substring(0, 5) || '00:00', // Extraer solo la hora
                    address: service.direccion_servicio,
                    status: service.estado,
                    progress: service.estado === 'en_proceso' ? 65 : 0,
                    cost: parseFloat(service.precio_estimado) || 0,
                    team: [], // Por ahora vacío, se puede agregar más tarde
                    checklist: [], // Por ahora vacío, se puede agregar más tarde
                    description: service.descripcion
                }));
                
                updateServiceStatus();
                updateServicesTab(); // Agregar esta línea para actualizar el tab principal
                console.log('Servicios cargados:', services);
            } else {
                console.error('Error en la respuesta:', result.message);
                showErrorMessage('Error cargando servicios: ' + result.message);
            }
        } else if (servicesResponse.status === 401) {
            console.error('Error de autenticación. Redirigiendo al login...');
            showErrorMessage('Sesión expirada. Por favor, inicie sesión nuevamente.');
            logout();
        } else {
            const errorData = await servicesResponse.json();
            console.error('Error cargando servicios:', errorData);
            showErrorMessage('Error cargando servicios del usuario: ' + servicesResponse.status);
        }
    } catch (error) {
        console.error('Error en loadUserServices:', error);
        showErrorMessage('Error de conexión al cargar servicios');
    }
}

// Función para cancelar un servicio
async function cancelService(serviceId) {
    if (!confirm('¿Está seguro de que desea cancelar este servicio?')) {
        return;
    }
    
    showLoadingMessage('Cancelando servicio...');
    
    try {
        const response = await fetch('http://127.0.0.1:8000/api/servicios/cancelar/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': await getCSRFToken()
            },
            credentials: 'include',
            body: JSON.stringify({ servicio_id: serviceId })
        });
        
        const result = await response.json();
        hideLoadingMessage();
        
        if (response.ok) {
            // Actualizar el estado local del servicio
            const service = services.find(s => s.id === serviceId);
            if (service) {
                service.status = 'cancelado';
            }
            
            showSuccessMessage('Servicio cancelado exitosamente.');
            loadClientData(); // Recargar datos
        } else {
            showErrorMessage(result.error || 'Error al cancelar el servicio');
        }
    } catch (error) {
        hideLoadingMessage();
        showErrorMessage('Error de conexión. Intente nuevamente.');
        console.error('Error:', error);
    }
}

function showTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar pestaña seleccionada
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Activar botón correspondiente
    event.target.classList.add('active');
    
    // Cargar datos específicos según la pestaña
    switch(tabName) {
        case 'tracking':
            updateTrackingInfo();
            break;
        case 'history':
            updateServiceHistory();
            break;
        case 'billing':
            updateBillingInfo();
            break;
    }
}

function updateServiceStatus() {
    // Actualizar la pestaña "Mis Servicios" con datos reales del usuario
    const misServiciosContainer = document.querySelector('#mis-servicios .tab-content');
    if (!misServiciosContainer) return;
    
    if (services.length === 0) {
        misServiciosContainer.innerHTML = `
            <div class="no-services">
                <i class="fas fa-calendar-times"></i>
                <p>No tienes servicios agendados</p>
                <button onclick="showBooking()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Agendar Servicio
                </button>
            </div>
        `;
        return;
    }
    
    // Separar servicios por estado
    const activeServices = services.filter(s => s.status === 'en_proceso' || s.status === 'en_progreso');
    const scheduledServices = services.filter(s => s.status === 'programado' || s.status === 'agendado');
    const completedServices = services.filter(s => s.status === 'completado' || s.status === 'finalizado');
    
    let html = '';
    
    // Servicios en progreso
    if (activeServices.length > 0) {
        html += `
            <div class="services-section">
                <h3><i class="fas fa-clock"></i> Servicios en Progreso</h3>
                ${activeServices.map(service => `
                    <div class="service-card active">
                        <div class="service-header">
                            <h4>${service.type}</h4>
                            <span class="service-status in-progress">
                                <i class="fas fa-spinner fa-spin"></i> En Progreso
                            </span>
                        </div>
                        <div class="service-details">
                            <p><i class="fas fa-calendar"></i> ${formatDate(service.date)} a las ${service.time}</p>
                            <p><i class="fas fa-map-marker-alt"></i> ${service.address}</p>
                            <p><i class="fas fa-dollar-sign"></i> $${service.cost.toLocaleString()}</p>
                        </div>
                        <div class="service-progress">
                            <div class="progress-bar">
                                <div class="progress" style="width: ${service.progress}%"></div>
                            </div>
                            <span class="progress-text">${service.progress}% Completado</span>
                        </div>
                        <div class="service-actions">
                            <button onclick="showTracking()" class="btn btn-secondary">
                                <i class="fas fa-eye"></i> Ver Seguimiento
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Servicios programados
    if (scheduledServices.length > 0) {
        html += `
            <div class="services-section">
                <h3><i class="fas fa-calendar-check"></i> Servicios Programados</h3>
                ${scheduledServices.map(service => `
                    <div class="service-card scheduled">
                        <div class="service-header">
                            <h4>${service.type}</h4>
                            <span class="service-status scheduled">
                                <i class="fas fa-calendar"></i> Programado
                            </span>
                        </div>
                        <div class="service-details">
                            <p><i class="fas fa-calendar"></i> ${formatDate(service.date)} a las ${service.time}</p>
                            <p><i class="fas fa-map-marker-alt"></i> ${service.address}</p>
                            <p><i class="fas fa-dollar-sign"></i> $${service.cost.toLocaleString()}</p>
                        </div>
                        <div class="service-actions">
                            <button onclick="rescheduleService(${service.id})" class="btn btn-secondary">
                                <i class="fas fa-edit"></i> Reprogramar
                            </button>
                            <button onclick="cancelService(${service.id})" class="btn btn-danger">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Servicios completados recientes (últimos 3)
    if (completedServices.length > 0) {
        const recentCompleted = completedServices.slice(-3);
        html += `
            <div class="services-section">
                <h3><i class="fas fa-check-circle"></i> Servicios Completados Recientes</h3>
                ${recentCompleted.map(service => `
                    <div class="service-card completed">
                        <div class="service-header">
                            <h4>${service.type}</h4>
                            <span class="service-status completed">
                                <i class="fas fa-check"></i> Completado
                            </span>
                        </div>
                        <div class="service-details">
                            <p><i class="fas fa-calendar"></i> ${formatDate(service.date)}</p>
                            <p><i class="fas fa-map-marker-alt"></i> ${service.address}</p>
                            <p><i class="fas fa-dollar-sign"></i> $${service.cost.toLocaleString()}</p>
                        </div>
                        <div class="service-actions">
                            <button onclick="viewReport(${service.id})" class="btn btn-secondary">
                                <i class="fas fa-file-alt"></i> Ver Reporte
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    misServiciosContainer.innerHTML = html;
}

// Función para actualizar el tab principal de servicios con datos reales del usuario
function updateServicesTab() {
    const servicesTabContainer = document.getElementById('servicesTab');
    if (!servicesTabContainer) return;
    
    if (services.length === 0) {
        // Si no hay servicios, mostrar mensaje de no servicios
        servicesTabContainer.innerHTML = `
            <div class="no-services-main">
                <i class="fas fa-calendar-times"></i>
                <h3>No tienes servicios agendados</h3>
                <p>Agenda tu primer servicio de limpieza profesional</p>
                <button onclick="showBooking()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Agendar Servicio
                </button>
            </div>
        `;
        return;
    }
    
    // Separar servicios por estado
    const activeServices = services.filter(s => s.status === 'en_proceso' || s.status === 'en_progreso');
    const scheduledServices = services.filter(s => s.status === 'programado' || s.status === 'agendado');
    
    let html = '';
    
    // Mostrar servicio en progreso (solo el primero si hay varios)
    if (activeServices.length > 0) {
        const service = activeServices[0];
        html += `
            <div class="status-card in-progress">
                <div class="status-header">
                    <h3>Servicio en Progreso</h3>
                    <span class="status-badge in-progress">En Ejecución</span>
                </div>
                <div class="status-content">
                    <p><i class="fas fa-clock"></i> ${formatDate(service.date)}, ${service.time}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${service.address}</p>
                    <p><i class="fas fa-users"></i> Cuadrilla: Equipo Asignado</p>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${service.progress}%"></div>
                        </div>
                        <span class="progress-text">${service.progress}% Completado - ${getCurrentTask(service.progress)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Mostrar próximo servicio programado (solo el primero si hay varios)
    if (scheduledServices.length > 0) {
        const service = scheduledServices[0];
        html += `
            <div class="status-card scheduled">
                <div class="status-header">
                    <h3>Próximo Servicio</h3>
                    <span class="status-badge scheduled">Programado</span>
                </div>
                <div class="status-content">
                    <p><i class="fas fa-calendar"></i> ${formatDate(service.date)}, ${service.time}</p>
                    <p><i class="fas fa-home"></i> ${service.type}</p>
                    <p><i class="fas fa-clock"></i> Duración estimada: 3 horas</p>
                </div>
            </div>
        `;
    }
    
    // Si no hay servicios activos ni programados, mostrar mensaje
    if (activeServices.length === 0 && scheduledServices.length === 0) {
        html = `
            <div class="no-active-services">
                <i class="fas fa-check-circle"></i>
                <h3>No hay servicios activos</h3>
                <p>Todos tus servicios han sido completados</p>
                <button onclick="showBooking()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Agendar Nuevo Servicio
                </button>
            </div>
        `;
    }
    
    servicesTabContainer.innerHTML = html;
}

function getCurrentTask(progress) {
    if (progress < 20) return 'Alistamiento y verificación EPP';
    if (progress < 40) return 'Limpieza de sala';
    if (progress < 70) return 'Limpieza de cocina';
    if (progress < 90) return 'Limpieza de baños';
    return 'Control de calidad';
}

function updateTrackingInfo() {
    // Actualizar la pestaña "Seguimiento" con información detallada del servicio en progreso
    const seguimientoContainer = document.querySelector('#seguimiento .tab-content');
    if (!seguimientoContainer) return;
    
    // Buscar servicios en progreso
    const activeService = services.find(s => s.status === 'en_proceso' || s.status === 'en_progreso');
    
    if (!activeService) {
        seguimientoContainer.innerHTML = `
            <div class="no-tracking">
                <i class="fas fa-search"></i>
                <p>No hay servicios en progreso para hacer seguimiento</p>
            </div>
        `;
        return;
    }
    
    // Crear checklist básico basado en el progreso
    const checklist = [
        { task: 'Alistamiento y verificación EPP', completed: activeService.progress > 0, time: activeService.progress > 0 ? '14:00' : 'Pendiente' },
        { task: 'Limpieza de sala', completed: activeService.progress > 25, time: activeService.progress > 25 ? '14:30' : 'Pendiente' },
        { task: 'Limpieza de cocina', completed: activeService.progress > 50, time: activeService.progress > 50 ? '15:00' : activeService.progress > 25 ? 'En progreso' : 'Pendiente' },
        { task: 'Limpieza de baños', completed: activeService.progress > 75, time: activeService.progress > 75 ? '15:30' : 'Pendiente' },
        { task: 'Control de calidad', completed: activeService.progress >= 100, time: activeService.progress >= 100 ? '16:00' : 'Pendiente' }
    ];
    
    seguimientoContainer.innerHTML = `
        <div class="tracking-container">
            <div class="service-tracking-header">
                <h3>${activeService.type}</h3>
                <p><i class="fas fa-map-marker-alt"></i> ${activeService.address}</p>
                <p><i class="fas fa-calendar"></i> ${formatDate(activeService.date)} a las ${activeService.time}</p>
            </div>
            
            <div class="progress-section">
                <h4>Progreso General</h4>
                <div class="progress-bar-large">
                    <div class="progress" style="width: ${activeService.progress}%"></div>
                </div>
                <span class="progress-text-large">${activeService.progress}% Completado</span>
            </div>
            
            <div class="checklist-section">
                <h4>Lista de Tareas</h4>
                <div class="checklist">
                    ${checklist.map(item => `
                        <div class="checklist-item ${item.completed ? 'completed' : ''}">
                            <div class="task-status">
                                <i class="fas ${item.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                            </div>
                            <div class="task-info">
                                <span class="task-name">${item.task}</span>
                                <span class="task-time">${item.time}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="team-section">
                <h4>Equipo Asignado</h4>
                <div class="team-info">
                    ${activeService.team && activeService.team.length > 0 ? 
                        activeService.team.map(member => `
                            <div class="team-member">
                                <i class="fas fa-user"></i>
                                <span>${member}</span>
                            </div>
                        `).join('') :
                        '<p>Equipo por asignar</p>'
                    }
                </div>
            </div>
            
            <div class="tracking-actions">
                <button onclick="getCurrentLocation()" class="btn btn-secondary">
                    <i class="fas fa-map-marker-alt"></i> Ver Ubicación del Equipo
                </button>
                <button onclick="sendNotification('Solicitud de actualización enviada', 'info')" class="btn btn-primary">
                    <i class="fas fa-bell"></i> Solicitar Actualización
                </button>
            </div>
        </div>
    `;
}

function updateServiceHistory() {
    // Actualizar historial con servicios completados del usuario
    const historyContainer = document.querySelector('#historial .tab-content');
    if (!historyContainer) return;
    
    // Filtrar servicios completados
    const completedServices = services.filter(service => 
        service.status === 'completado' || service.status === 'finalizado'
    );
    
    if (completedServices.length === 0) {
        historyContainer.innerHTML = `
            <div class="no-services">
                <i class="fas fa-history"></i>
                <p>No tienes servicios completados aún</p>
            </div>
        `;
        return;
    }
    
    historyContainer.innerHTML = completedServices.map(service => `
        <div class="service-history-item">
            <div class="service-info">
                <h4>${service.type}</h4>
                <p><i class="fas fa-calendar"></i> ${formatDate(service.date)}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${service.address}</p>
                <p><i class="fas fa-dollar-sign"></i> $${service.cost.toLocaleString()}</p>
            </div>
            <div class="service-status completed">
                <i class="fas fa-check-circle"></i>
                Completado
            </div>
        </div>
    `).join('');
}

function updateBillingInfo() {
    // Actualizar información de facturación con datos reales del usuario
    const billingContainer = document.querySelector('#facturacion .tab-content');
    if (!billingContainer) return;
    
    // Calcular totales de servicios
    const totalServices = services.length;
    const completedServices = services.filter(s => s.status === 'completado' || s.status === 'finalizado');
    const totalAmount = completedServices.reduce((sum, service) => sum + service.cost, 0);
    const pendingServices = services.filter(s => s.status === 'programado' || s.status === 'en_proceso');
    const pendingAmount = pendingServices.reduce((sum, service) => sum + service.cost, 0);
    
    billingContainer.innerHTML = `
        <div class="billing-summary">
            <div class="billing-card">
                <h4>Resumen de Facturación</h4>
                <div class="billing-item">
                    <span>Total de servicios:</span>
                    <span>${totalServices}</span>
                </div>
                <div class="billing-item">
                    <span>Servicios completados:</span>
                    <span>${completedServices.length}</span>
                </div>
                <div class="billing-item">
                    <span>Total pagado:</span>
                    <span class="amount">$${totalAmount.toLocaleString()}</span>
                </div>
                <div class="billing-item">
                    <span>Servicios pendientes:</span>
                    <span>${pendingServices.length}</span>
                </div>
                <div class="billing-item">
                    <span>Monto pendiente:</span>
                    <span class="amount pending">$${pendingAmount.toLocaleString()}</span>
                </div>
            </div>
        </div>
        
        <div class="billing-history">
            <h4>Historial de Pagos</h4>
            ${completedServices.length > 0 ? 
                completedServices.map(service => `
                    <div class="payment-item">
                        <div class="payment-info">
                            <span class="service-type">${service.type}</span>
                            <span class="payment-date">${formatDate(service.date)}</span>
                        </div>
                        <div class="payment-amount">$${service.cost.toLocaleString()}</div>
                        <div class="payment-status paid">
                            <i class="fas fa-check"></i> Pagado
                        </div>
                    </div>
                `).join('') :
                '<p class="no-payments">No hay pagos registrados</p>'
            }
        </div>
    `;
}

// Funciones de seguimiento
function showTracking() {
    showTab('tracking');
}

function rescheduleService() {
    showSuccessMessage('Función de reprogramación disponible próximamente. Por favor contacte al servicio al cliente.');
}

function viewReport(serviceId) {
    const service = serviceHistory.find(s => s.id === serviceId);
    if (service) {
        showServiceReport(service);
    }
}

function showServiceReport(service) {
    const reportModal = createReportModal(service);
    document.body.appendChild(reportModal);
    reportModal.style.display = 'block';
}

function createReportModal(service) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Reporte de Servicio</h2>
            <div class="report-content">
                <div class="report-header">
                    <h3>${service.type}</h3>
                    <p>Fecha: ${formatDate(service.date)}</p>
                    <p>Costo: $${service.cost.toLocaleString()}</p>
                    <p>Calificación: ${'⭐'.repeat(service.rating)}</p>
                </div>
                <div class="report-photos">
                    <h4>Evidencias Fotográficas</h4>
                    <div class="photo-grid">
                        <div class="photo-placeholder">
                            <i class="fas fa-image"></i>
                            <p>Foto Antes</p>
                        </div>
                        <div class="photo-placeholder">
                            <i class="fas fa-image"></i>
                            <p>Foto Después</p>
                        </div>
                    </div>
                </div>
                <div class="report-checklist">
                    <h4>Tareas Completadas</h4>
                    <ul>
                        <li>✓ Limpieza general de espacios</li>
                        <li>✓ Desinfección de superficies</li>
                        <li>✓ Limpieza de baños</li>
                        <li>✓ Limpieza de cocina</li>
                        <li>✓ Control de calidad</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    return modal;
}

// Funciones de autenticación
async function handleLogin(e) {
    e.preventDefault();
    showLoadingMessage('Iniciando sesión...');
    
    const formData = new FormData(e.target);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': await getCSRFToken()
            },
            credentials: 'include',
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        hideLoadingMessage();
        
        if (response.ok) {
            currentUser = result.user;
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            // Iniciar renovación automática de sesión
            startSessionRenewal();
            
            // Esperar un momento para que las cookies se establezcan
            await new Promise(resolve => setTimeout(resolve, 500));
            
            showSuccessMessage('¡Bienvenido de vuelta!');
            closeModal('loginModal');
            updateNavigation(true);
            
            // Cargar servicios del usuario después del login exitoso
            if (typeof loadUserServices === 'function') {
                await loadUserServices();
            }
        } else {
            showErrorMessage(result.message || 'Error al iniciar sesión');
        }
    } catch (error) {
        hideLoadingMessage();
        showErrorMessage('Error de conexión. Intente nuevamente.');
        console.error('Error:', error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showLoadingMessage('Creando cuenta...');
    
    const formData = new FormData(e.target);
    
    // Verificar si hay una foto de perfil
    const profilePhoto = formData.get('profilePhoto');
    
    if (profilePhoto && profilePhoto.size > 0) {
        // Si hay foto, usar FormData para enviar multipart/form-data
        try {
            const response = await fetch('http://127.0.0.1:8000/api/auth/registro/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': await getCSRFToken()
                },
                credentials: 'include',
                body: formData // Enviar FormData directamente
            });
            
            const result = await response.json();
            hideLoadingMessage();
            
            if (response.ok) {
                showSuccessMessage('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');
                closeModal('registerModal');
                showLogin();
                e.target.reset();
            } else {
                showErrorMessage(result.message || 'Error al crear la cuenta');
            }
        } catch (error) {
            hideLoadingMessage();
            showErrorMessage('Error de conexión. Intente nuevamente.');
            console.error('Error:', error);
        }
    } else {
        // Si no hay foto, usar JSON como antes
        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            first_name: formData.get('firstName'),
            last_name: formData.get('lastName'),
            telefono: formData.get('phone'),
            direccion: formData.get('address')
        };
        
        try {
            const response = await fetch('http://127.0.0.1:8000/api/auth/registro/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': await getCSRFToken()
                },
                credentials: 'include',
                body: JSON.stringify(registerData)
            });
            
            const result = await response.json();
            hideLoadingMessage();
            
            if (response.ok) {
                showSuccessMessage('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');
                closeModal('registerModal');
                showLogin();
                e.target.reset();
            } else {
                showErrorMessage(result.message || 'Error al crear la cuenta');
            }
        } catch (error) {
            hideLoadingMessage();
            showErrorMessage('Error de conexión. Intente nuevamente.');
            console.error('Error:', error);
        }
    }
}

// Función para renovar la sesión automáticamente
async function renewSession() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/verificar-sesion/', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.autenticado) {
                console.log('Sesión renovada exitosamente');
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error renovando sesión:', error);
        return false;
    }
}

// Configurar renovación automática de sesión cada 10 minutos
let sessionRenewalInterval;

function startSessionRenewal() {
    // Limpiar intervalo anterior si existe
    if (sessionRenewalInterval) {
        clearInterval(sessionRenewalInterval);
    }
    
    // Renovar sesión cada 10 minutos (600000 ms)
    sessionRenewalInterval = setInterval(async () => {
        const renewed = await renewSession();
        if (!renewed) {
            console.log('No se pudo renovar la sesión, redirigiendo al login');
            logout();
        }
    }, 600000); // 10 minutos
}

function stopSessionRenewal() {
    if (sessionRenewalInterval) {
        clearInterval(sessionRenewalInterval);
        sessionRenewalInterval = null;
    }
}

// Función para obtener CSRF token
async function getCSRFToken() {
    try {
        // Primero intentar obtener el token de las cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        
        // Si no está en las cookies, hacer una petición para obtenerlo
        const response = await fetch('http://127.0.0.1:8000/api/auth/verificar-sesion/', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            // Intentar obtener el token de las cookies después de la petición
            const newCookies = document.cookie.split(';');
            for (let cookie of newCookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'csrftoken') {
                    return value;
                }
            }
        }
        
        return '';
    } catch (error) {
        console.error('Error obteniendo CSRF token:', error);
        return '';
    }
}

// Función para verificar sesión al cargar la página
async function checkSession() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/verificar-sesion/', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Resultado de verificar sesión:', result);
            
            if (result.success && result.autenticado) {
                currentUser = result.usuario;
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('currentUser', JSON.stringify(result.usuario));
                updateNavigation(true);
                
                // Iniciar renovación automática de sesión
                startSessionRenewal();
                
                await loadUserServices();
            } else {
                // Sesión no válida, limpiar datos locales
                currentUser = null;
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('currentUser');
                updateNavigation(false);
            }
        } else {
            console.error('Error en la respuesta del servidor:', response.status);
            // Limpiar datos locales en caso de error
            currentUser = null;
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            updateNavigation(false);
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
        // Limpiar datos locales en caso de error
        currentUser = null;
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        updateNavigation(false);
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        // Detener renovación de sesión
        stopSessionRenewal();
        
        const response = await fetch('http://127.0.0.1:8000/api/auth/logout/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': await getCSRFToken()
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = null;
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            updateNavigation(false);
            showSuccessMessage('Sesión cerrada exitosamente');
        }
    } catch (error) {
        console.error('Error cerrando sesión:', error);
    }
}

function updateNavigation(isLoggedIn) {
    const loginBtn = document.querySelector('.btn-login');
    const registerBtn = document.querySelector('.btn-register');
    
    if (isLoggedIn) {
        loginBtn.textContent = 'Mi Cuenta';
        loginBtn.onclick = showClientPanel;
        registerBtn.textContent = 'Cerrar Sesión';
        registerBtn.onclick = logout;
        registerBtn.style.display = 'inline-block';
    } else {
        loginBtn.textContent = 'Iniciar Sesión';
        loginBtn.onclick = showLogin;
        registerBtn.textContent = 'Registrarse';
        registerBtn.onclick = showRegister;
        registerBtn.style.display = 'inline-block';
    }
}

// Funciones de utilidad
function updateDateTime() {
    setInterval(() => {
        updateServiceStatus();
    }, 30000); // Actualizar cada 30 segundos
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showLoadingMessage(message) {
    const loading = document.createElement('div');
    loading.id = 'loadingMessage';
    loading.className = 'loading-message';
    loading.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(loading);
    
    // Agregar estilos CSS dinámicamente
    if (!document.getElementById('loadingStyles')) {
        const style = document.createElement('style');
        style.id = 'loadingStyles';
        style.textContent = `
            .loading-message {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 3000;
            }
            .loading-content {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                text-align: center;
            }
            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #2c7a7b;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

function hideLoadingMessage() {
    const loading = document.getElementById('loadingMessage');
    if (loading) {
        loading.remove();
    }
}

function showErrorMessage(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(error);
    
    // Agregar estilos CSS dinámicamente
    if (!document.getElementById('errorStyles')) {
        const style = document.createElement('style');
        style.id = 'errorStyles';
        style.textContent = `
            .error-message {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #e53e3e;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 3000;
                animation: slideIn 0.3s ease;
            }
            .error-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .error-content i {
                font-size: 1.2rem;
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        error.remove();
    }, 5000);
}

function showSuccessMessage(message) {
    const success = document.createElement('div');
    success.className = 'success-message';
    success.innerHTML = `
        <div class="success-content">
            <i class="fas fa-check-circle"></i>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(success);
    
    // Agregar estilos CSS dinámicamente
    if (!document.getElementById('successStyles')) {
        const style = document.createElement('style');
        style.id = 'successStyles';
        style.textContent = `
            .success-message {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #48bb78;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 3000;
                animation: slideIn 0.3s ease;
            }
            .success-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .success-content i {
                font-size: 1.2rem;
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        success.remove();
    }, 4000);
}

// Funciones de administración (para futuras implementaciones)
function showAdminPanel() {
    console.log('Panel administrativo - Próximamente');
}

function assignTeam(serviceId) {
    console.log('Asignando equipo al servicio:', serviceId);
}

function updateServiceStatus(serviceId, status) {
    const service = services.find(s => s.id === serviceId);
    if (service) {
        service.status = status;
        console.log('Estado actualizado:', service);
    }
}

// Funciones de geolocalización (simuladas)
function getCurrentLocation() {
    return new Promise((resolve) => {
        // Simular geolocalización
        setTimeout(() => {
            resolve({
                lat: 11.5444,
                lng: -72.9072,
                address: 'Riohacha, La Guajira'
            });
        }, 1000);
    });
}

function trackTeamLocation(teamId) {
    // Simular seguimiento de equipo
    return {
        lat: 11.5444 + (Math.random() - 0.5) * 0.01,
        lng: -72.9072 + (Math.random() - 0.5) * 0.01,
        timestamp: new Date(),
        teamId: teamId
    };
}

// Funciones de notificaciones
function sendNotification(message, type = 'info') {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Álamos J Clean', {
            body: message,
            icon: '/favicon.ico'
        });
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Inicializar notificaciones
requestNotificationPermission();

// Funciones de análisis y métricas (para futuras implementaciones)
function trackUserAction(action, data) {
    console.log('Acción del usuario:', action, data);
    // Aquí se enviarían los datos a un servicio de análisis
}

function calculateNPS(ratings) {
    // Calcular Net Promoter Score
    const promoters = ratings.filter(r => r >= 9).length;
    const detractors = ratings.filter(r => r <= 6).length;
    const total = ratings.length;
    
    return ((promoters - detractors) / total) * 100;
}

// Exportar funciones para uso global
window.alamosApp = {
    showBooking,
    showClientPanel,
    showLogin,
    showRegister,
    selectService,
    showTab,
    closeModal,
    rescheduleService,
    viewReport,
    showTracking,
    cancelService,
    logout
};