const firebaseConfig = {
  apiKey: "AIzaSyAyldvni7pL8L51pqgR1qowldofziCgBFI",
  authDomain: "matriculaperiodismouwu.firebaseapp.com",
  projectId: "matriculaperiodismouwu",
  storageBucket: "matriculaperiodismouwu.firebasestorage.app",
  messagingSenderId: "565445140641",
  appId: "1:565445140641:web:152dfcd7e300994503d0e0"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const userId = "malla_principal_compartida";

const toastNotification = document.getElementById('toast-notification');

function showToast(message, type = 'success', duration = 3000) {
    toastNotification.textContent = message;
    toastNotification.className = `toast-message show ${type}`;

    setTimeout(() => {
        toastNotification.classList.remove('show');
        setTimeout(() => {
            toastNotification.className = 'toast-message';
        }, 500);
    }, duration);
}

const radios = document.querySelectorAll('.sidebar input[type="radio"]');
const mallaRamos = document.querySelectorAll('.contenedor-malla .ramo');

async function guardarEstadoRamo(ramoName, estado) {
    try {
        await db.collection("usuarios").doc(userId).collection("ramos").doc(ramoName).set({
            estado: estado,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Estado de ${ramoName} guardado en Firebase: ${estado}`);
        const ramoText = document.querySelector(`.ramo[data-ramo="${ramoName}"]`).textContent;
        let estadoLegible = '';
        if (estado === 'aprobado') estadoLegible = 'APROBADO';
        else if (estado === 'reprobado') estadoLegible = 'REPROBADO';
        else if (estado === 'cursando') estadoLegible = 'CURSANDO';

        showToast(`'${ramoText}' marcado como ${estadoLegible}. ¡Guardado!`, 'success');

    } catch (e) {
        console.error("Error al guardar en Firestore: ", e);
        showToast(`Error al guardar '${ramoName}': ${e.message}`, 'error');
    }
}

async function cargarEstadoRamos() {
    try {
        const querySnapshot = await db.collection("usuarios").doc(userId).collection("ramos").get();
        const estadosGuardados = {};
        querySnapshot.forEach((doc) => {
            estadosGuardados[doc.id] = doc.data().estado;
        });

        radios.forEach(radio => {
            const ramoName = radio.name;
            const estado = estadosGuardados[ramoName];
            if (estado && radio.value === estado) {
                radio.checked = true;
            } else if (estado === undefined) {
                radio.checked = false;
            }
        });

        mallaRamos.forEach(ramoMalla => {
            const ramoName = ramoMalla.dataset.ramo;
            const estado = estadosGuardados[ramoName];
            if (estado) {
                ramoMalla.setAttribute('data-estado', estado);
            } else {
                ramoMalla.removeAttribute('data-estado');
            }
        });
        console.log("Estados de ramos cargados desde Firebase.");
        showToast('Malla cargada desde la nube.', 'info', 2000); 

    } catch (e) {
        console.error("Error al cargar desde Firestore: ", e);
        showToast(`Error al cargar la malla: ${e.message}`, 'error', 5000);
    }
}

radios.forEach(radio => {
  radio.addEventListener('change', (event) => {
    const name = event.target.name;
    const estado = event.target.value;
    
    const ramoEnMalla = document.querySelector(`.ramo[data-ramo="${name}"]`);
    if (ramoEnMalla) {
      ramoEnMalla.setAttribute('data-estado', estado);
    }

    guardarEstadoRamo(name, estado);
  });
});

const toggleButtons = document.querySelectorAll('.toggle-semestre');

toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        const ramosContainer = button.nextElementSibling;
        
        toggleButtons.forEach(otherButton => {
            if (otherButton !== button) {
                otherButton.classList.remove('active');
                otherButton.nextElementSibling.classList.remove('show');
            }
        });

        button.classList.toggle('active');
        ramosContainer.classList.toggle('show');
    });
});

const miHorarioBoton = document.querySelector('.mi-horario-boton');
const horarioModal = document.querySelector('.horario-modal');
const cerrarModal = document.querySelector('.cerrar-modal');

if (miHorarioBoton && horarioModal && cerrarModal) {
    miHorarioBoton.addEventListener('click', () => {
        horarioModal.style.display = "block";
    });

    cerrarModal.addEventListener('click', () => {
        horarioModal.style.display = "none";
    });

    window.addEventListener('click', (event) => {
        if (event.target === horarioModal) {
            horarioModal.style.display = "none";
        }
    });
}

document.addEventListener('DOMContentLoaded', cargarEstadoRamos);