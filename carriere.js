// In renderer.js
const affectationForm = document.getElementById('affectation-form');
const affectationIdInput = document.getElementById('affectation-id');
const matriculePersonnelSelect = document.getElementById('matricule-personnel');
const idPosteSelect = document.getElementById('id-poste');
const dateAffectationInput = document.getElementById('date-affectation');
const dateFinAffectationInput = document.getElementById('date-fin-affectation');
const descriptionAffectationInput = document.getElementById('description-affectation');
const saveAffectationBtn = document.getElementById('save-affectation-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const affectationsTableBody = document.querySelector('#affectations-table tbody');

let editingAffectationId = null;

// --- Load dropdowns and display affectations on page load ---
document.addEventListener('DOMContentLoaded', async () => {
    await populatePersonnelDropdown();
    await populatePostesDropdown();
    await loadAffectations();
});

async function populatePersonnelDropdown() {
    const personnel = await window.electronAPI.getAllPersonnel();
    if (personnel.error) {
        alert('Erreur lors du chargement du personnel: ' + personnel.error);
        return;
    }
    matriculePersonnelSelect.innerHTML = '<option value="">Sélectionner un personnel</option>';
    personnel.forEach(p => {
        const option = document.createElement('option');
        option.value = p.matricule;
        option.textContent = `${p.nom} ${p.prenom}`;
        matriculePersonnelSelect.appendChild(option);
    });
}

async function populatePostesDropdown() {
    const postes = await window.electronAPI.getAllPostes();
    if (postes.error) {
        alert('Erreur lors du chargement des postes: ' + postes.error);
        return;
    }
    idPosteSelect.innerHTML = '<option value="">Sélectionner un poste</option>';
    postes.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.intitule;
        idPosteSelect.appendChild(option);
    });
}


async function loadAffectations() {
    const affectations = await window.electronAPI.getAffectations();
    if (affectations.error) {
        alert('Erreur lors du chargement des affectations: ' + affectations.error);
        return;
    }
    affectationsTableBody.innerHTML = '';
    affectations.forEach(affectation => {
        const row = affectationsTableBody.insertRow();
        row.insertCell().textContent = `${affectation.nom} ${affectation.prenom}`;
        row.insertCell().textContent = affectation.poste_intitule;
        row.insertCell().textContent = affectation.date_affectation;
        row.insertCell().textContent = affectation.date_fin_affectation || 'Actuel';
        row.insertCell().textContent = affectation.description_affectation || '';

        const actionsCell = row.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = 'Modifier';
        editButton.onclick = () => editAffectation(affectation);
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Supprimer';
        deleteButton.onclick = () => deleteAffectation(affectation.id);
        actionsCell.appendChild(deleteButton);
    });
}

// --- Form Submission (Add/Update) ---
affectationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        matricule_personnel: matriculePersonnelSelect.value,
        id_poste: idPosteSelect.value,
        date_affectation: dateAffectationInput.value,
        date_fin_affectation: dateFinAffectationInput.value,
        description_affectation: descriptionAffectationInput.value,
    };

    let result;
    if (editingAffectationId) {
        data.id = editingAffectationId;
        result = await window.electronAPI.updateAffectation(data);
    } else {
        result = await window.electronAPI.addAffectation(data);
    }

    if (result.success) {
        alert(`Affectation ${editingAffectationId ? 'mise à jour' : 'ajoutée'} avec succès !`);
        resetForm();
        await loadAffectations();
    } else {
        alert('Erreur: ' + result.error);
    }
});

// --- Edit Functionality ---
function editAffectation(affectation) {
    editingAffectationId = affectation.id;
    affectationIdInput.value = affectation.id;
    matriculePersonnelSelect.value = affectation.matricule_personnel;
    idPosteSelect.value = affectation.id_poste;
    dateAffectationInput.value = affectation.date_affectation;
    dateFinAffectationInput.value = affectation.date_fin_affectation;
    descriptionAffectationInput.value = affectation.description_affectation;

    saveAffectationBtn.textContent = 'Mettre à jour';
    cancelEditBtn.style.display = 'inline-block';
}

cancelEditBtn.addEventListener('click', resetForm);

function resetForm() {
    editingAffectationId = null;
    affectationForm.reset();
    affectationIdInput.value = '';
    saveAffectationBtn.textContent = 'Enregistrer Affectation';
    cancelEditBtn.style.display = 'none';
}

// --- Delete Functionality ---
async function deleteAffectation(id) {
    if (confirm('Voulez-vous vraiment supprimer cette affectation ?')) {
        const result = await window.electronAPI.deleteAffectation(id);
        if (result.success) {
            alert('Affectation supprimée avec succès !');
            await loadAffectations();
        } else {
            alert('Erreur lors de la suppression: ' + result.error);
        }
    }
}