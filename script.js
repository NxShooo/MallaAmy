// Configuración de Firebase (asegúrate de que estas sean tus credenciales reales)
const firebaseConfig = {
    apiKey: "AIzaSyAyldvni7pL8L51pqgR1qowldofziCgBFI",
    authDomain: "matriculaperiodismouwu.firebaseapp.com",
    projectId: "matriculaperiodismouwu",
    storageBucket: "matriculaperiodismouwu.firebasestorage.app",
    messagingSenderId: "565445140641",
    appId: "1:565445140641:web:152dfcd7e300994503d0e0"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null; // Variable para almacenar el usuario actual, declarada globalmente

// Este es el envoltorio principal: espera a que el HTML esté completamente cargado.
document.addEventListener('DOMContentLoaded', () => {

    // Referencias a elementos del DOM
    const loginContainer = document.getElementById('login-container');
    const appContent = document.getElementById('app-content');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    // logoutButton ya no se busca aquí directamente, se gestiona dinámicamente.
    // const logoutButton = document.getElementById('logout-button'); // <<-- REMOVIDO/MANEJADO ABAJO
    const loginErrorMessage = document.getElementById('login-error-message');
    const toastNotification = document.getElementById('toast-notification');

    const semestreFiltros = document.querySelectorAll('.semestre-filtro');
    const radioButtons = document.querySelectorAll('.sidebar input[type="radio"]');
    const mallaRamos = document.querySelectorAll('.contenedor-malla .ramo');

    const miHorarioBoton = document.querySelector('.mi-horario-boton');
    const horarioModal = document.getElementById('horario-modal');
    const closeModalButton = document.querySelector('.close-button');

    // Nuevas referencias para el horario en tabla
    const horarioDisplay = document.getElementById('horario-display'); // Contenedor de la tabla
    const horarioJsonInput = document.getElementById('horario-json-input'); // Textarea para el JSON
    const saveHorarioButton = document.getElementById('save-horario'); // Botón de guardar (JSON)
    const toggleEditHorarioButton = document.getElementById('toggle-edit-horario'); // Botón para alternar vista
    const editJsonButton = document.getElementById('edit-json-button'); // Botón para ir al editor JSON

    // --- Funciones de Utilidad ---

    function showToast(message, type = 'info') {
        if (toastNotification) {
            toastNotification.textContent = message;
            toastNotification.className = `toast-message ${type} show`;
            setTimeout(() => {
                toastNotification.className = toastNotification.className.replace('show', '');
            }, 3000);
        } else {
            console.warn("Elemento toast-notification no encontrado.");
        }
    }

    function updateRamoColor(ramoElement, status) {
        ramoElement.classList.remove('aprobado', 'reprobado', 'cursando', 'pendiente');
        if (status) {
            ramoElement.classList.add(status);
            ramoElement.setAttribute('data-estado', status);
        } else {
            ramoElement.removeAttribute('data-estado');
        }
    }

    function saveRamoState(ramoId, status) {
        if (currentUser) {
            // MANTENEMOS 'users' aquí, según tu JS que funcionaba
            db.collection('users').doc(currentUser.uid).collection('ramos').doc(ramoId).set({
                status: status
            })
            .then(() => {
                console.log(`Estado de ${ramoId} guardado: ${status}`);
            })
            .catch(error => {
                console.error("Error al guardar estado del ramo:", error);
                showToast("Error al guardar el estado del ramo.", "error");
            });
        } else {
             showToast("Debes iniciar sesión para guardar el estado del ramo.", "info");
        }
    }

    function loadRamoStates() {
        if (currentUser) {
            // MANTENEMOS 'users' aquí, según tu JS que funcionaba
            db.collection('users').doc(currentUser.uid).collection('ramos').get()
                .then(snapshot => {
                    snapshot.forEach(doc => {
                        const ramoId = doc.id;
                        const status = doc.data().status;
                        const ramoElement = document.querySelector(`.ramo[data-ramo="${ramoId}"]`);
                        if (ramoElement) {
                            updateRamoColor(ramoElement, status);
                            const radioButton = document.querySelector(`input[name="${ramoId}"][value="${status}"]`);
                            if (radioButton) {
                                radioButton.checked = true;
                            }
                        }
                    });
                    console.log("Estados de ramos cargados.");
                    showToast('Tu malla ha sido cargada desde la nube.', 'info');
                })
                .catch(error => {
                    console.error("Error al cargar estados de los ramos:", error);
                    showToast("Error al cargar los estados de los ramos. (" + error.message + ")", "error");
                });
        }
    }

    // Nueva función para renderizar la tabla del horario
    function renderScheduleTable(scheduleData) {
        if (!horarioDisplay) {
            console.error("Elemento horario-display no encontrado.");
            return;
        }

        horarioDisplay.innerHTML = ''; // Limpiar contenido anterior

        if (!scheduleData || Object.keys(scheduleData).length === 0) {
            horarioDisplay.innerHTML = '<p>No hay horario guardado. Haz clic en "Editar JSON" para añadir uno.</p>';
            return;
        }

        // Crear la tabla
        const table = document.createElement('table');
        table.classList.add('horario-table'); // Añadir clase para estilos CSS

        // Crear encabezado de la tabla
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Hora', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Crear cuerpo de la tabla
        const tbody = document.createElement('tbody');
        
        // Obtener todas las horas de forma ordenada
        const hours = Object.keys(scheduleData).sort((a, b) => {
            return a.localeCompare(b);
        });

        hours.forEach(hour => {
            const row = document.createElement('tr');
            const hourCell = document.createElement('td');
            hourCell.textContent = hour;
            row.appendChild(hourCell);

            const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
            days.forEach(day => {
                const dayCell = document.createElement('td');
                const daySchedule = scheduleData[hour] ? scheduleData[hour][day] : '';
                if (daySchedule) {
                    dayCell.innerHTML = Array.isArray(daySchedule) ? daySchedule.join('<br>') : daySchedule;
                } else {
                    dayCell.textContent = '';
                }
                row.appendChild(dayCell);
            });
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        horarioDisplay.appendChild(table);
    }

    // Función para guardar el horario (ahora espera JSON)
    function saveHorario() {
        if (currentUser) {
            try {
                const scheduleJson = horarioJsonInput.value;
                const parsedSchedule = JSON.parse(scheduleJson);

                // MANTENEMOS 'users' aquí, según tu JS que funcionaba
                db.collection('users').doc(currentUser.uid).collection('horario').doc('miHorario').set({
                    content: parsedSchedule
                })
                .then(() => {
                    showToast("Horario guardado exitosamente.", "success");
                    renderScheduleTable(parsedSchedule);
                    // Ocultar el editor JSON y mostrar la tabla
                    horarioJsonInput.style.display = 'none';
                    horarioDisplay.style.display = 'block';
                    saveHorarioButton.style.display = 'none';
                    toggleEditHorarioButton.classList.add('active');
                    editJsonButton.classList.remove('active');
                })
                .catch(error => {
                    console.error("Error al guardar el horario:", error);
                    showToast("Error al guardar el horario. (" + error.message + ")", "error");
                });
            } catch (e) {
                console.error("Error al parsear JSON del horario:", e);
                showToast("Error: El formato del horario no es JSON válido. " + e.message, "error");
            }
        } else {
             showToast("Debes iniciar sesión para guardar tu horario.", "info");
        }
    }

    // Función para cargar el horario (ahora espera JSON)
    function loadHorario() {
        if (currentUser) {
            // MANTENEMOS 'users' aquí, según tu JS que funcionaba
            db.collection('users').doc(currentUser.uid).collection('horario').doc('miHorario').get()
                .then(doc => {
                    if (doc.exists && doc.data().content) {
                        const scheduleData = doc.data().content;
                        horarioJsonInput.value = JSON.stringify(scheduleData, null, 2);
                        renderScheduleTable(scheduleData);
                    } else {
                        horarioJsonInput.value = JSON.stringify({}, null, 2);
                        renderScheduleTable({});
                    }
                    console.log("Horario cargado.");
                })
                .catch(error => {
                    console.error("Error al cargar el horario:", error);
                    showToast("Error al cargar el horario.", "error");
                });
        }
    }

    // --- Manejo de Eventos ---

    semestreFiltros.forEach(semestreFiltro => {
        const toggleButton = semestreFiltro.querySelector('.toggle-semestre');
        const ramosContainer = semestreFiltro.querySelector('.ramos-semestre-filtro');
        if (toggleButton && ramosContainer) {
            toggleButton.addEventListener('click', () => {
                ramosContainer.classList.toggle('show');
                toggleButton.classList.toggle('active');
            });
        } else {
            console.warn("Elementos para semestre-filtro no encontrados:", semestreFiltro);
        }
    });

    radioButtons.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const ramoId = event.target.name;
            const status = event.target.value;
            const ramoElement = document.querySelector(`.ramo[data-ramo="${ramoId}"]`);
            if (ramoElement) {
                updateRamoColor(ramoElement, status);
            }
            saveRamoState(ramoId, status);
        });
    });

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;
            if (!email || !password) {
                loginErrorMessage.textContent = "Por favor, ingresa correo y contraseña.";
                return;
            }
            
            // *** AÑADE ESTA LÍNEA AQUÍ ***
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => {
                    // Una vez que la persistencia está configurada, procedemos con el inicio de sesión
                    return auth.signInWithEmailAndPassword(email, password);
                })
                .then(userCredential => {
                    currentUser = userCredential.user;
                    loginErrorMessage.textContent = "";
                    showToast("Inicio de sesión exitoso.", "success");
                    loadMallaAndHorarioForUser(); // Esto debería mostrar la malla
                })
                .catch(error => {
                    // Mensaje de error personalizado para el login
                    // Si el error es por configuración de persistencia o por login fallido.
                    if (error.code === 'auth/auth-domain-config-required') {
                        loginErrorMessage.textContent = "Error de configuración de dominio de autenticación.";
                        showToast("Error de configuración de dominio de autenticación.", "error");
                    } else {
                        loginErrorMessage.textContent = "Amor, te equivocaste en tu cuenta.";
                        showToast("Amor, te equivocaste en tu cuenta.", "error");
                    }
                    console.error("Error de login o persistencia:", error);
                });
        });
    }

    // **IMPORTANTE:** Se mantiene esta función para gestionar el logoutButton de forma robusta.
    // Esto asegura que el botón de cerrar sesión se maneje correctamente, exista o no en el DOM
    // en el momento de carga inicial, previniendo errores de "null".
    function setupLogoutButton() {
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton && !logoutButton.dataset.listenerAttached) { // Evita adjuntar múltiples listeners
            logoutButton.addEventListener('click', () => {
                auth.signOut()
                    .then(() => {
                        currentUser = null;
                        showToast("Sesión cerrada.", "info");
                        showLoginScreen();
                    })
                    .catch(error => {
                        console.error("Error al cerrar sesión:", error);
                        showToast("Error al cerrar sesión.", "error");
                    });
            });
            logoutButton.dataset.listenerAttached = 'true'; // Marca que el listener ya fue adjuntado
        }
    }


    if (miHorarioBoton) {
        miHorarioBoton.addEventListener('click', () => {
            if (currentUser) {
                loadHorario(); // Cargar el horario guardado y renderizar la tabla
                // Usamos classList para el modal, que es la forma moderna y recomendada
                horarioModal.classList.add('show-modal'); 
                // Asegurarse de que la vista inicial sea la tabla
                horarioJsonInput.style.display = 'none';
                horarioDisplay.style.display = 'block';
                saveHorarioButton.style.display = 'none';
                toggleEditHorarioButton.classList.add('active');
                editJsonButton.classList.remove('active');
            } else {
                showToast("Debes iniciar sesión para ver tu horario.", "info");
            }
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            // Usamos classList para el modal, que es la forma moderna y recomendada
            horarioModal.classList.remove('show-modal'); 
        });
    }

    if (horarioModal) {
        window.addEventListener('click', (event) => {
            if (event.target === horarioModal) {
                // Usamos classList para el modal, que es la forma moderna y recomendada
                horarioModal.classList.remove('show-modal'); 
            }
        });
    }

    if (saveHorarioButton) {
        saveHorarioButton.addEventListener('click', saveHorario);
    }

    // Event listener para alternar entre vista de tabla y editor JSON
    if (toggleEditHorarioButton && editJsonButton) {
        // CORRECCIÓN DE TYPO: Aseguramos que sea 'toggleEditHorarioButton' y no 'toggleEditEditHorarioButton'
        toggleEditHorarioButton.addEventListener('click', () => { 
            horarioJsonInput.style.display = 'none';
            horarioDisplay.style.display = 'block';
            saveHorarioButton.style.display = 'none';
            toggleEditHorarioButton.classList.add('active');
            editJsonButton.classList.remove('active');
            // Re-renderizar la tabla por si se modificó el JSON y no se guardó
            try {
                const currentJson = horarioJsonInput.value;
                const parsedData = JSON.parse(currentJson);
                renderScheduleTable(parsedData);
            } catch (e) {
                showToast("Error al previsualizar el horario: JSON inválido.", "error");
                console.error("Error previsualizando JSON:", e);
            }
        });

        editJsonButton.addEventListener('click', () => {
            horarioJsonInput.style.display = 'block';
            horarioDisplay.style.display = 'none';
            saveHorarioButton.style.display = 'inline-block';
            toggleEditHorarioButton.classList.remove('active');
            editJsonButton.classList.add('active');
        });
    }

    // --- Manejo de la Interfaz de Usuario según el estado de autenticación ---

    function showLoginScreen() {
        if (loginContainer && appContent) {
            loginContainer.style.display = 'flex';
            appContent.style.display = 'none';
            // Manipular logoutButton solo si existe
            const logoutButton = document.getElementById('logout-button');
            if (logoutButton) {
                logoutButton.style.display = 'none';
            }
            // Limpiar el editor JSON y la tabla al desloguearse
            if (horarioJsonInput) {
                horarioJsonInput.value = JSON.stringify({}, null, 2);
            }
            if (horarioDisplay) {
                horarioDisplay.innerHTML = '';
            }
        }
    }

    function showAppContent() {
        if (loginContainer && appContent) {
            loginContainer.style.display = 'none';
            appContent.style.display = 'flex';
            // Manipular logoutButton solo si existe
            const logoutButton = document.getElementById('logout-button');
            if (logoutButton) {
                logoutButton.style.display = 'inline-block';
            }
        }
    }

    function loadMallaAndHorarioForUser() {
        showAppContent();
        // Asegurarse de que el botón de logout tenga su listener adjunto
        setupLogoutButton(); // Llama a la función para adjuntar el listener
        setTimeout(() => {
            loadRamoStates();
        }, 300);
    }

    // Observar el estado de autenticación de Firebase
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            console.log("Usuario logueado:", currentUser.email);
            loadMallaAndHorarioForUser();
        } else {
            currentUser = null;
            console.log("Ningún usuario logueado.");
            showLoginScreen();
        }
    });

    // Asegurar que la pantalla correcta se muestre al cargar por primera vez
    setTimeout(() => {
        if (!auth.currentUser) {
            showLoginScreen();
        }
    }, 100);

}); // Cierre de DOMContentLoaded