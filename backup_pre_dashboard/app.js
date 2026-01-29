// Final Production Build v5.1
const API_URL = "https://script.google.com/macros/s/AKfycbzJtjEkaHqGmJI3finbeJKiDbZAIccqmW05epE7A1To-A1isJMJoG6zmBwAqtEmn78/exec";
const PASSWORD_ADMIN = "mantencioncermaq";

// Service Worker Update Handling
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}

let appMode = "NORMAL";
let adminPassword = "";

// Element References
const form = document.getElementById('registroForm');
const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
const modalSummary = document.getElementById('modalSummary');
const btnFinalSend = document.getElementById('btnFinalSend');

// Column Mapping (Must match Google Sheet Headers exactly)
const fieldIds = [
    'o2_comp_kw', 'o2_comp_m3', 'o2_comp_hrs',
    'o2_gen1_hrs', 'o2_gen1_m3',
    'o2_gen2_hrs', 'o2_gen2_m3',
    'o2_cons_fry', 'o2_cons_smolt',
    'red_v12', 'red_v23', 'red_v31',
    'red_i1', 'red_i2', 'red_i3', 'red_in',
    'red_sump_kw', 'red_ea_gw',
    'd_gen1_hrs', 'd_gen1_kw', 'd_gen1_lts',
    'd_gen2_hrs', 'd_gen2_kw', 'd_gen2_lts',
    'd_gen3_hrs', 'd_gen3_kw', 'd_gen3_lts'
];

window.onload = () => {
    checkLastSubmission();
    setupNetworkListener();

    // Load cached Responsable
    const savedName = localStorage.getItem('savedResponsable');
    if (savedName) {
        document.getElementById('responsable').value = savedName;
    }
};

// Robust Network Status (Pill)
function setupNetworkListener() {
    const pill = document.getElementById('networkPill');
    const text = document.getElementById('networkText');

    if (!pill || !text) return;

    async function checkConnection() {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 6000); // 6s timeout

            // 'no-cors' here is fine for just checking connectivity (ping)
            await fetch(API_URL, {
                method: 'GET',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(id);

            pill.classList.remove('offline');
            pill.classList.add('online');
            text.textContent = "Online";

        } catch (error) {
            pill.classList.remove('online');
            pill.classList.add('offline');
            text.textContent = "Offline";
        }
    }

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', () => {
        pill.classList.remove('online');
        pill.classList.add('offline');
        text.textContent = "Offline";
    });

    setInterval(checkConnection, 15000); // Check every 15s
    checkConnection();
}

function checkLastSubmission() {
    const lastSub = localStorage.getItem('lastSubmission');
    if (lastSub) {
        const date = new Date(parseInt(lastSub));
        const now = new Date();
        const diffHours = (now - date) / 1000 / 60 / 60;
        // Logic reserved for future warnings
    }
}

function handleSubmit(event) {
    event.preventDefault();

    const responsable = document.getElementById('responsable').value;
    if (!responsable || !responsable.trim()) {
        alert("El nombre del Responsable es obligatorio.");
        return;
    }

    localStorage.setItem('savedResponsable', responsable);

    let summaryHtml = `<p><strong>Responsable:</strong> ${responsable}</p><hr>`;
    summaryHtml += '<div class="row">';

    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        const val = el ? el.value : "";
        if (val) {
            const label = id.replace(/_/g, ' ').toUpperCase();
            summaryHtml += `<div class="col-6 mb-1"><small class="text-muted">${label}:</small> <strong>${val}</strong></div>`;
        }
    });
    summaryHtml += '</div>';

    if (appMode === "ADMIN") {
        summaryHtml += `<div class="alert alert-warning mt-2"><i class="bi bi-exclamation-triangle"></i> MODO EDICIÓN ADMINISTRADOR ACTIVADO</div>`;
    }

    modalSummary.innerHTML = summaryHtml;
    confirmModal.show();
}

// Data Submission with Server Validation
function sendData() {
    if (!navigator.onLine) {
        alert("Estás offline. Conéctate a internet para enviar los datos.");
        return;
    }

    btnFinalSend.disabled = true;
    btnFinalSend.innerText = "Enviando y Verificando...";

    const responsable = document.getElementById('responsable').value;

    const valores = fieldIds.map(id => {
        const el = document.getElementById(id);
        return el ? (el.value || "") : "";
    });

    const payload = {
        modo: appMode,
        password: adminPassword,
        responsable: responsable,
        valores: valores
    };

    console.log("Payload:", payload);

    // CRITICAL: Removed 'no-cors' to allow reading the response.
    // This requires the Backend to be properly deployed as a Web App (Exec).
    fetch(API_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain" }, // Standard hack for GAS Simple Request
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) throw new Error("Error en respuesta HTTP: " + response.status);
            return response.json();
        })
        .then(data => {
            if (data.result === "success") {
                alert("✅ Confirmado: " + data.message);
                finishSubmission();
            } else {
                throw new Error("El servidor rechazó los datos: " + (data.message || "Razón desconocida"));
            }
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            let msg = "⚠️ Error de Verificación.\n\n";

            if (window.location.protocol === 'file:') {
                msg += "Estás probando en LOCAL. Es normal que falle por seguridad del navegador (CORS).\n\nPosiblemente los datos SÍ se guardaron. Revisa la planilla.";
            } else {
                msg += "No pimos confirmar si se guardó. Revisa tu conexión y la planilla antes de intentar de nuevo.";
            }

            alert(msg);
            btnFinalSend.disabled = false;
            btnFinalSend.innerText = "Reintentar";
        });
}

function finishSubmission() {
    confirmModal.hide();
    localStorage.setItem('lastSubmission', Date.now().toString());
    form.reset();
    btnFinalSend.disabled = false;
    btnFinalSend.innerText = "Confirmar y Enviar";

    if (appMode !== 'ADMIN') {
        document.body.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center p-4">
            <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
            <h2 class="mt-3">Registro Exitoso</h2>
            <p class="text-muted">Registro verificado y guardado.</p>
            <button class="btn btn-outline-primary mt-4" onclick="location.reload()">Nuevo Registro (Admin)</button>
        </div>
        `;
    }
}

function toggleAdmin() {
    const pass = prompt("Ingrese contraseña de Administrador:");
    if (pass === PASSWORD_ADMIN) {
        appMode = "ADMIN";
        adminPassword = pass;
        alert("Modo Administrador Habilitado");
        document.querySelector('.app-header').innerHTML += '<span class="badge bg-warning text-dark mt-2">MODO ADMIN</span>';
        if (!document.getElementById('registroForm')) location.reload();
    } else {
        if (pass !== null) alert("Contraseña incorrecta.");
    }
}
