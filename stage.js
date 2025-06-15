document.addEventListener('DOMContentLoaded', () => {
  const nomInput = document.getElementById('nom');
  const prenomInput = document.getElementById('prenom');
  const dateNaissanceInput = document.getElementById('dateNaissance');
  const typeStageSelect = document.getElementById('typeStage');
  const dateDebutInput = document.getElementById('dateDebut');
  const dateFinInput = document.getElementById('dateFin');
  const dureeInput = document.getElementById('duree');
  const departementSelect = document.getElementById('departement');
  const encadreurSelect = document.getElementById('encadreur');
  const formStage = document.getElementById('formStage');
  const btnReset = document.getElementById('btnReset');
  const stagesTableBody = document.querySelector('#stagesTable tbody');
  const totalStagesSpan = document.getElementById('totalStages');
  const stagesEnCoursSpan = document.getElementById('stagesEnCours');

  const filterDepartement = document.getElementById('filterDepartement');
  const filterType = document.getElementById('filterType');
  const filterStatut = document.getElementById('filterStatut');
  const searchInput = document.getElementById('searchInput');
  const btnSearch = document.getElementById('btnSearch');
  const btnClearFilters = document.getElementById('btnClearFilters');

  const btnPrint = document.getElementById('btnPrint');
  const btnExportPDF = document.getElementById('btnExportPDF');

  const statusModal = document.getElementById('statusModal');
  const closeModalBtn = statusModal.querySelector('.close');
  const stagiaireNomSpan = document.getElementById('stagiaireNom');
  const nouveauStatutSelect = document.getElementById('nouveauStatut');
  const btnConfirmStatus = document.getElementById('btnConfirmStatus');
  const btnCancelStatus = document.getElementById('btnCancelStatus');

  const notification = document.getElementById('notification');

  let stagesData = [];
  let currentEditingStageId = null;

  function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.className = 'notification ' + (isError ? 'error' : 'success');
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 4000);
  }

  function calculateDuration() {
    const debut = new Date(dateDebutInput.value);
    const fin = new Date(dateFinInput.value);
    if (debut && fin && fin >= debut) {
      const diffTime = fin - debut;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      dureeInput.value = diffDays;
    } else {
      dureeInput.value = '';
    }
  }

  async function loadDepartements() {
    try {
      const postes = await window.api.getPostes();
      const departements = [...new Set(postes.map(p => p.departement))].sort();

      departementSelect.innerHTML = '<option value="">-- Sélectionnez --</option>';
      filterDepartement.innerHTML = '<option value="">Tous les départements</option>';
      departements.forEach(dep => {
        const opt1 = document.createElement('option');
        opt1.value = dep;
        opt1.textContent = dep;
        departementSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = dep;
        opt2.textContent = dep;
        filterDepartement.appendChild(opt2);
      });
    } catch (err) {
      showNotification('Erreur chargement départements: ' + err.message, true);
    }
  }

  async function loadEncadreurs(departement) {
    encadreurSelect.innerHTML = '<option value="">-- Chargement... --</option>';
    try {
      if (!departement) {
        encadreurSelect.innerHTML = '<option value="">-- Choisissez un département d\'abord --</option>';
        return;
      }
      const personnel = await window.api.getPersonnelByDepartement(departement);
      if (personnel.length === 0) {
        encadreurSelect.innerHTML = '<option value="">Aucun encadreur disponible</option>';
        return;
      }
      encadreurSelect.innerHTML = '<option value="">-- Sélectionnez --</option>';
      personnel.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.matricule;
        opt.textContent = `${p.nom} ${p.prenom} (${p.poste})`;
        encadreurSelect.appendChild(opt);
      });
    } catch (err) {
      showNotification('Erreur chargement encadreurs: ' + err.message, true);
    }
  }

  async function loadStages(filters = {}) {
    try {
      stagesData = await window.api.getStages(filters);
      renderStagesTable(stagesData);
      updateStats();
    } catch (err) {
      showNotification('Erreur chargement stages: ' + err.message, true);
     
    }
  }

  function renderStagesTable(stages) {
    stagesTableBody.innerHTML = '';
    if (stages.length === 0) {
      const tr = document.createElement('tr');
      tr.classList.add('no-data');
      tr.innerHTML = `<td colspan="10">Aucun stagiaire trouvé</td>`;
      stagesTableBody.appendChild(tr);
      return;
    }

    stages.forEach(stage => {
      const tr = document.createElement('tr');
      const periode = `${stage.date_debut} → ${stage.date_fin}`;
      const encadreur = stage.encadreur_nom && stage.encadreur_prenom ? `${stage.encadreur_nom} ${stage.encadreur_prenom}` : 'N/A';

      tr.innerHTML = `
        <td>${stage.nom}</td>
        <td>${stage.prenom}</td>
        <td>${stage.date_naissance}</td>
        <td>${periode}</td>
        <td>${stage.duree}</td>
        <td>${stage.poste_intitule || 'N/A'}</td>
        <td>${encadreur}</td>
        <td>${stage.type_stage}</td>
        <td>${stage.statut || 'En cours'}</td>
        <td>
          <button class="btn btn-edit" data-id="${stage.id}">✏</button>
          <button class="btn btn-delete" data-id="${stage.id}">🗑</button>
          <button class="btn btn-status" data-id="${stage.id}" data-nom="${stage.nom} ${stage.prenom}">⚙</button>
        </td>
      `;
      stagesTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', onDeleteStage);
    });
    document.querySelectorAll('.btn-status').forEach(btn => {
      btn.addEventListener('click', onOpenStatusModal);
    });
  }

  async function updateStats() {
    try {
      const stats = await window.api.getStageStats();
      totalStagesSpan.textContent = stats.total || 0;
      // Par exemple, calculer nombre en cours
      const enCoursCount = stagesData.filter(s => s.statut === 'En cours').length;
      stagesEnCoursSpan.textContent = enCoursCount;
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  }

  dateDebutInput.addEventListener('change', calculateDuration);
  dateFinInput.addEventListener('change', calculateDuration);

  departementSelect.addEventListener('change', () => {
    loadEncadreurs(departementSelect.value);
  });

  formStage.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!nomInput.value.trim() || !prenomInput.value.trim() || !dateNaissanceInput.value || !typeStageSelect.value || !dateDebutInput.value || !dateFinInput.value || !departementSelect.value || !encadreurSelect.value) {
      showNotification('Veuillez remplir tous les champs obligatoires (*)', true);
      return;
    }
    if (new Date(dateFinInput.value) < new Date(dateDebutInput.value)) {
      showNotification('La date de fin doit être postérieure ou égale à la date de début', true);
      return;
    }

    const stageData = {
      nom_stagiaire: nomInput.value.trim(),
      prenom_stagiaire: prenomInput.value.trim(),
      date_naissance: dateNaissanceInput.value,
      date_debut: dateDebutInput.value,
      date_fin: dateFinInput.value,
      duree: parseInt(dureeInput.value, 10),
      poste_id: null,
      encadreur_id: encadreurSelect.value,
      type_stage: typeStageSelect.value,
      statut: 'En cours'
    };

    try {
      const personnel = await window.api.getPersonnelByDepartement(departementSelect.value);
      const encadreur = personnel.find(p => p.matricule === encadreurSelect.value);
      if (encadreur) {
        stageData.poste_id = encadreur.poste;
      }
    } catch (err) {
      console.warn('Erreur récupération poste encadreur:', err);
    }

    try {
      await window.api.saveStage(stageData);
      showNotification('Stagiaire enregistré avec succès');
      formStage.reset();
      dureeInput.value = '';
      encadreurSelect.innerHTML = '<option value="">-- Choisissez un département d\'abord --</option>';
      loadStages();
    } catch (err) {
      showNotification('Erreur enregistrement stagiaire: ' + err.message, true);
    }
  });

  btnReset.addEventListener('click', () => {
    formStage.reset();
    dureeInput.value = '';
    encadreurSelect.innerHTML = '<option value="">-- Choisissez un département d\'abord --</option>';
  });

  btnSearch.addEventListener('click', () => {
    const filters = {
      search: searchInput.value.trim() || undefined,
      typeStage: filterType.value || undefined,
      departement: filterDepartement.value || undefined,
      statut: filterStatut.value || undefined
    };
    loadStages(filters);
  });

  btnClearFilters.addEventListener('click', () => {
    filterDepartement.value = '';
    filterType.value = '';
    filterStatut.value = '';
    searchInput.value = '';
    loadStages();
  });

  async function onDeleteStage(e) {
    if (!confirm('Voulez-vous vraiment supprimer ce stagiaire ?')) return;
    const id = e.currentTarget.dataset.id;
    try {
      await window.api.deleteStage(parseInt(id, 10));
      showNotification('Stagiaire supprimé');
      loadStages();
    } catch (err) {
      showNotification('Erreur suppression: ' + err.message, true);
    }
  }

  function onOpenStatusModal(e) {
    currentEditingStageId = parseInt(e.currentTarget.dataset.id, 10);
    stagiaireNomSpan.textContent = e.currentTarget.dataset.nom;
    nouveauStatutSelect.value = 'En cours';
    statusModal.style.display = 'block';
  }

  btnConfirmStatus.addEventListener('click', async () => {
    const newStatut = nouveauStatutSelect.value;
    if (!currentEditingStageId) return;

    try {
      await window.api.updateStageStatus(currentEditingStageId, newStatut);
      showNotification('Statut mis à jour');
      statusModal.style.display = 'none';
      loadStages();
    } catch (err) {
      showNotification('Erreur mise à jour statut: ' + err.message, true);
    }
  });

  btnCancelStatus.addEventListener('click', () => {
    statusModal.style.display = 'none';
  });

  closeModalBtn.addEventListener('click', () => {
    statusModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === statusModal) {
      statusModal.style.display = 'none';
    }
  });

  // Export PDF et impression restent identiques, en utilisant window.api si besoin

  // Initialisation
  loadDepartements();
  loadStages();
});