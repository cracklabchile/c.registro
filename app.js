// Config
const API_URL = "https://script.google.com/macros/s/AKfycby2iwsHrM03pBKy_pyKZh44TzebdsPLJDiisIJh0-jOv4HuDNShCF5SEe6zoMMVP-lQ/exec";
const PASSWORD_ADMIN = "mantencioncermaq";

let appMode = "NORMAL";
let adminPassword = "";

// Element References
const form = document.getElementById('registroForm');
const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
const modalSummary = document.getElementById('modalSummary');
const btnFinalSend = document.getElementById('btnFinalSend');

// Map HTML IDs to the 29 columns expected by GAS (excluding Timestamp and Responsable which are fixed)
// The order MUST match the spreadsheet columns 3-29
const fieldIds = [
    // Oxígeno - Compresor (3 columns)
    'o2_comp_kw', 'o2_comp_m3', 'o2_comp_hrs',
    // Oxígeno - Gen 1 (2 columns)
    'o2_gen1_hrs', 'o2_gen1_m3',
    // Oxígeno - Gen 2 (2 columns)
    'o2_gen2_hrs', 'o2_gen2_m3',
    // Oxígeno - Consumo (2 columns)
    'o2_cons_fry', 'o2_cons_smolt',
    // Energía - Voltaje (3 columns)
    'red_v12', 'red_v23', 'red_v31',
    // Energía - Corriente (4 columns)
    'red_i1', 'red_i2', 'red_i3', 'red_in',
    // Energía - Potencia (2 columns)
    'red_sump_kw', 'red_ea_gw',
    // Diesel - Gen 1 (3 columns)
    'd_gen1_hrs', 'd_gen1_kw', 'd_gen1_lts',
    // Diesel - Gen 2 (3 columns)
    'd_gen2_hrs', 'd_gen2_kw', 'd_gen2_lts',
    // Diesel - Gen 3 (3 columns)
    'd_gen3_hrs', 'd_gen3_kw', 'd_gen3_lts'
];

window.onload = () => {
    checkLastSubmission();
};

function checkLastSubmission() {
    const lastSub = localStorage.getItem('lastSubmission');
    if (lastSub) {
        const date = new Date(parseInt(lastSub));
        const now = new Date();
        const diffHours = (now - date) / 1000 / 60 / 60;
        if (diffHours < 4 && appMode !== 'ADMIN') {
            // Optional: Logic to warn if submitting too frequently
        }
    }
}

function handleSubmit(event) {
    event.preventDefault();

    // Gather Data
    const responsable = document.getElementById('responsable').value;
    if (!responsable || !responsable.trim()) {
        alert("El nombre del Responsable es obligatorio.");
        return;
    }

    let summaryHtml = `<p><strong>Responsable:</strong> ${responsable}</p><hr>`;
    summaryHtml += '<div class="row">';

    // Simple summary builder
    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        const val = el ? el.value : "";
        if (val) {
            // beautify label
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

function sendData() {
    btnFinalSend.disabled = true;
    btnFinalSend.innerText = "Enviando...";

    const responsable = document.getElementById('responsable').value;

    // Map values safely. If element missing (like red_in), return empty string
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

    fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(() => {
            alert("Datos guardados exitosamente.");
            finishSubmission();
        })
        .catch(err => {
            console.error(err);
            alert("Error al enviar datos. Intente nuevamente.");
            btnFinalSend.disabled = false;
            btnFinalSend.innerText = "Enviar Registro";
        });
}

function finishSubmission() {
    confirmModal.hide();
    localStorage.setItem('lastSubmission', Date.now().toString());
    form.reset();
    btnFinalSend.disabled = false;
    btnFinalSend.innerText = "Enviar Registro";

    if (appMode !== 'ADMIN') {
        document.body.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center p-4">
            <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
            <h2 class="mt-3">Registro Exitoso</h2>
            <p class="text-muted">Registro del turno completado.</p>
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
        alert("Modo Administrador Habilitado. El próximo envío sobrescribirá el último registro.");
        document.querySelector('.app-header').innerHTML += '<span class="badge bg-warning text-dark mt-2">MODO ADMIN</span>';

        // Ensure form is visible if hidden by completion screen
        if (!document.getElementById('registroForm')) location.reload();
    } else {
        if (pass !== null) alert("Contraseña incorrecta.");
    }
}
