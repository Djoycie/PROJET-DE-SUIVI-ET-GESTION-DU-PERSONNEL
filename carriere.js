// Références aux éléments DOM du formulaire d'affectation
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

// Références aux éléments DOM de la section historique de carrière
const personnelHistorySelect = document.getElementById('personnel-history-select');
const viewHistoryBtn = document.getElementById('view-history-btn');
const historyPersonnelNameSpan = document.getElementById('history-personnel-name');
const careerHistoryTableBody = document.getElementById('career-history-table-body');
const careerHistoryDisplay = document.getElementById('career-history-display');

let editingAffectationId = null; // Variable pour stocker l'ID de l'affectation en cours de modification

// --- Initialisation au chargement de la page ---
document.addEventListener('DOMContentLoaded', async () => {
    await populatePersonnelDropdown();       // Peupler la liste déroulante du formulaire d'affectation
    await populatePostesDropdown();          // Peupler la liste déroulante des postes
    await populatePersonnelHistoryDropdown(); // Peupler la liste déroulante de sélection pour l'historique
    await loadAffectations();                // Charger et afficher toutes les affectations dans le tableau principal
});

// --- Fonctions de peuplement des listes déroulantes ---

/**
 * Peuple la liste déroulante du personnel dans le formulaire d'affectation.
 */
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

/**
 * Peuple la liste déroulante des postes.
 */
async function populatePostesDropdown() {
    const postes = await window.electronAPI.getAllPostes3();
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

/**
 * Peuple la liste déroulante du personnel pour la section d'historique de carrière.
 */
async function populatePersonnelHistoryDropdown() {
    const personnel = await window.electronAPI.getAllPersonnel(); // Réutilise la même API
    if (personnel.error) {
        alert('Erreur lors du chargement du personnel pour l\'historique: ' + personnel.error);
        return;
    }
    personnelHistorySelect.innerHTML = '<option value="">Sélectionner un personnel</option>';
    personnel.forEach(p => {
        const option = document.createElement('option');
        option.value = p.matricule;
        option.textContent = `${p.nom} ${p.prenom}`;
        personnelHistorySelect.appendChild(option);
    });
}

// --- Fonctions de chargement et d'affichage des affectations ---

/**
 * Charge et affiche toutes les affectations dans le tableau principal.
 */
async function loadAffectations() {
    const affectations = await window.electronAPI.getAffectations();
    if (affectations.error) {
        alert('Erreur lors du chargement des affectations: ' + affectations.error);
        return;
    }
    affectationsTableBody.innerHTML = ''; // Vider le tableau
    affectations.forEach(affectation => {
        const row = affectationsTableBody.insertRow();
        row.insertCell().textContent = `${affectation.nom} ${affectation.prenom}`;
        row.insertCell().textContent = affectation.poste_intitule;
        row.insertCell().textContent = affectation.date_affectation;
        row.insertCell().textContent = affectation.date_fin_affectation || 'Actuel'; // Afficher 'Actuel' si pas de date de fin
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

        // Ajout du bouton "Voir Carrière" pour chaque ligne
        const viewCareerButton = document.createElement('button');
        viewCareerButton.textContent = 'Voir Carrière';
        viewCareerButton.className = 'btn-view-career'; // Pour un style potentiel
        viewCareerButton.onclick = () => {
            // Sélectionne l'employé dans la liste déroulante d'historique et affiche directement son historique
            personnelHistorySelect.value = affectation.matricule_personnel;
            displayPersonnelCareerHistory(affectation.matricule_personnel);
            // Faire défiler vers la section d'historique
            if (careerHistoryDisplay) careerHistoryDisplay.scrollIntoView({ behavior: 'smooth' });
        };
        actionsCell.appendChild(viewCareerButton);
    });
}

// --- Logique de soumission du formulaire (Ajouter/Modifier) ---
affectationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        matricule_personnel: matriculePersonnelSelect.value,
        id_poste: idPosteSelect.value,
        date_affectation: dateAffectationInput.value,
        // Si la date de fin est vide, l'envoyer comme null pour la base de données
        date_fin_affectation: dateFinAffectationInput.value || null,
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
        resetForm(); // Réinitialiser le formulaire
        await loadAffectations(); // Recharger les affectations pour mettre à jour le tableau
    } else {
        alert('Erreur: ' + result.error);
    }
});

// --- Fonctionnalité de modification ---
function editAffectation(affectation) {
    editingAffectationId = affectation.id;
    affectationIdInput.value = affectation.id;
    matriculePersonnelSelect.value = affectation.matricule_personnel;
    idPosteSelect.value = affectation.id_poste;
    dateAffectationInput.value = affectation.date_affectation;
    // Gérer le cas où date_fin_affectation est null dans la DB (affiché comme 'Actuel')
    dateFinAffectationInput.value = affectation.date_fin_affectation || '';
    descriptionAffectationInput.value = affectation.description_affectation || ''; // Gérer null pour description

    saveAffectationBtn.textContent = 'Mettre à jour';
    cancelEditBtn.style.display = 'inline-block';
}

// --- Annuler la modification ---
cancelEditBtn.addEventListener('click', resetForm);

/**
 * Réinitialise le formulaire d'affectation.
 */
function resetForm() {
    editingAffectationId = null;
    affectationForm.reset();
    affectationIdInput.value = '';
    saveAffectationBtn.textContent = 'Enregistrer Affectation';
    cancelEditBtn.style.display = 'none';
    // Assurer que les selects reviennent à leur option par défaut si nécessaire
    matriculePersonnelSelect.value = '';
    idPosteSelect.value = '';
}

// --- Fonctionnalité de suppression ---
async function deleteAffectation(id) {
    if (confirm('Voulez-vous vraiment supprimer cette affectation ?')) {
        const result = await window.electronAPI.deleteAffectation(id);
        if (result.success) {
            alert('Affectation supprimée avec succès !');
            await loadAffectations(); // Recharger les affectations après suppression
        } else {
            alert('Erreur lors de la suppression: ' + result.error);
        }
    }
}

// --- Logique d'affichage de l'historique de carrière ---

// Écouteur d'événement pour le bouton "Voir l'Historique"
if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener('click', async () => {
        const selectedMatricule = personnelHistorySelect.value;
        if (!selectedMatricule) {
            alert('Veuillez sélectionner un personnel pour voir son historique.');
            return;
        }
        await displayPersonnelCareerHistory(selectedMatricule);
    });
}


/**
 * Affiche l'historique de carrière pour un personnel donné,
 * en montrant les transitions entre ancien et nouveau poste.
 * @param {string} matricule - Le matricule du personnel dont on veut voir l'historique.
 */
async function displayPersonnelCareerHistory(matricule) {
    const history = await window.electronAPI.getPersonnelCareerHistory(matricule);
    if (history.error) {
        alert('Erreur lors du chargement de l\'historique de carrière: ' + history.error);
        return;
    }

    const selectedPersonnelOption = personnelHistorySelect.options[personnelHistorySelect.selectedIndex];
    historyPersonnelNameSpan.textContent = selectedPersonnelOption.textContent;

    careerHistoryTableBody.innerHTML = ''; // Vider le tableau d'historique

    if (history.length === 0) {
        const row = careerHistoryTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4; // Fusionner les colonnes
        cell.textContent = 'Aucune affectation trouvée pour cet employé.';
        cell.style.textAlign = 'center';
    } else {
        // Pour afficher "ancien poste" et "nouveau poste", nous allons itérer sur l'historique.
        // Puisque history est déjà trié par date_affectation ASC (du plus ancien au plus récent)
        let previousPoste = "Début de Carrière"; // Poste initial fictif pour la première affectation

        history.forEach((currentAffectation, index) => {
            const row = careerHistoryTableBody.insertRow();

            // Période (Date début - Date fin du NOUVEAU poste)
            const startDate = currentAffectation.date_affectation;
            const endDate = currentAffectation.date_fin_affectation || 'Actuel';
            row.insertCell().textContent = `${startDate} à ${endDate}`;

            // Ancien Poste (le poste précédent celui-ci)
            row.insertCell().textContent = previousPoste;

            // Nouveau Poste (le poste de l'affectation actuelle)
            row.insertCell().textContent = currentAffectation.poste_intitule;

            // Description du Changement (description de l'affectation actuelle)
            row.insertCell().textContent = currentAffectation.description_affectation || '';

            // Mettre à jour l'ancien poste pour la prochaine itération
            // Si l'affectation actuelle n'a pas de date de fin ou est la plus récente, c'est le "poste actuel"
            // qu'on considérera comme "ancien poste" pour le prochain changement.
            previousPoste = currentAffectation.poste_intitule;
        });
    }

    // Afficher la section d'historique de carrière
    if (careerHistoryDisplay) {
        careerHistoryDisplay.style.display = 'block';
    }
}

// ... (le reste de votre fichier carriere.js) ...