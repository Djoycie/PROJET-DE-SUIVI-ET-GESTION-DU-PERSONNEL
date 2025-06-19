document.addEventListener('DOMContentLoaded', () => {
  // Cache pour optimiser les performances
  const cache = {
    departements: null,
    personnel: new Map(),
    stages: []
  };

  // Configuration des statuts possibles
  const STATUTS = ['En cours', 'Terminé', 'Suspendu', 'Annulé'];

  // Récupération des éléments du DOM avec validation
  const elements = initializeElements();
  
  let currentEditingStageId = null;
  let currentFilters = {};

  // --- INITIALISATION DES ÉLÉMENTS ---
  function initializeElements() {
    const elementIds = [
      'nom', 'prenom', 'dateNaissance', 'typeStage', 'dateDebut', 'dateFin', 'duree',
      'departement', 'encadreur', 'formStage', 'btnReset', 'totalStages', 'stagesEnCours',
      'filterDepartement', 'filterType', 'filterStatut', 'searchInput', 'btnSearch',
      'btnClearFilters', 'btnPrint', 'btnExportPDF', 'statusModal', 'stagiaireNom',
      'nouveauStatut', 'btnConfirmStatus', 'btnCancelStatus', 'notification'
    ];

    const elements = {};
    elementIds.forEach(id => {
      elements[id] = document.getElementById(id);
    });

    // Éléments spéciaux
    elements.stagesTableBody = document.querySelector('#stagesTable tbody');
    elements.closeModalBtn = document.querySelector('#statusModal .close');

    return elements;
  }

  // --- UTILITAIRES ---
  function showNotification(message, isError = false) {
    const { notification } = elements;
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
      notification.style.display = 'none';
    }, 4000);
  }

  function validateElectronAPI() {
    if (!window.electronAPI) {
      throw new Error('API Electron non disponible. Vérifiez la configuration preload.js');
    }
    return window.electronAPI;
  }

  function calculateDuration() {
    const { dateDebut, dateFin, duree } = elements;
    if (!dateDebut.value || !dateFin.value) {
      duree.value = '';
      return;
    }

    const debut = new Date(dateDebut.value);
    const fin = new Date(dateFin.value);
    
    if (fin >= debut) {
      const diffTime = fin - debut;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      duree.value = diffDays;
    } else {
      duree.value = '';
    }
  }

  function createOption(value, text, isDefault = false) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    if (isDefault) option.selected = true;
    return option;
  }

  function setSelectState(selectElement, options, placeholder, disabled = false) {
    selectElement.innerHTML = '';
    selectElement.appendChild(createOption('', placeholder, true));
    
    if (Array.isArray(options)) {
      options.forEach(option => {
        if (typeof option === 'string') {
          selectElement.appendChild(createOption(option, option));
        } else {
          selectElement.appendChild(createOption(option.value, option.text));
        }
      });
    }
    
    selectElement.disabled = disabled;
  }

  function formatDateFr(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('fr-FR');
  }

  // --- GESTION DES DONNÉES ---
  async function loadDepartements() {
    try {
      if (cache.departements) {
        populateDepartementSelects(cache.departements);
        return;
      }

      setSelectState(elements.departement, null, 'Chargement...', true);
      
      const electronAPI = validateElectronAPI();
      const departements = await electronAPI.getPostes();
      
      if (!Array.isArray(departements) || departements.length === 0) {
        throw new Error('Aucun département trouvé');
      }

      cache.departements = departements.sort();
      populateDepartementSelects(cache.departements);
      
    } catch (error) {
      console.error('Erreur chargement départements:', error);
      showNotification(`Erreur: ${error.message}`, true);
      setSelectState(elements.departement, null, 'Erreur de chargement', true);
      setSelectState(elements.filterDepartement, null, 'Erreur de chargement', true);
    }
  }

  function populateDepartementSelects(departements) {
    setSelectState(elements.departement, departements, '-- Sélectionnez un département --');
    setSelectState(elements.filterDepartement, departements, 'Tous les départements');
  }

  async function loadEncadreurs(departement) {
    try {
      if (!departement) {
        setSelectState(elements.encadreur, null, '-- Choisissez un département d\'abord --', true);
        return;
      }

      const cacheKey = `personnel-${departement}`;
      if (cache.personnel.has(cacheKey)) {
        populateEncadreurSelect(cache.personnel.get(cacheKey));
        return;
      }

      setSelectState(elements.encadreur, null, 'Chargement des encadreurs...', true);
      
      const electronAPI = validateElectronAPI();
      const personnel = await electronAPI.getPersonnelByDepartement(departement);
      
      if (!Array.isArray(personnel)) {
        throw new Error('Données du personnel invalides');
      }

      cache.personnel.set(cacheKey, personnel);
      populateEncadreurSelect(personnel);
      
    } catch (error) {
      console.error('Erreur chargement encadreurs:', error);
      showNotification(`Erreur: ${error.message}`, true);
      setSelectState(elements.encadreur, null, 'Erreur de chargement', true);
    }
  }

  function populateEncadreurSelect(personnel) {
    if (personnel.length === 0) {
      setSelectState(elements.encadreur, null, 'Aucun encadreur disponible', true);
      return;
    }

    const encadreurs = personnel.map(p => ({
      value: p.matricule,
      text: `${p.prenom || ''} ${p.nom || ''}${p.poste ? ` (${p.poste})` : ''}`.trim()
    }));

    setSelectState(elements.encadreur, encadreurs, '-- Sélectionnez un encadreur --');
  }

  async function loadStages(filters = {}) {
    try {
      const electronAPI = validateElectronAPI();
      
      // Nettoyer les filtres
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v && v.trim() !== '')
      );
      
      currentFilters = cleanFilters;
      cache.stages = await electronAPI.getStages(cleanFilters);
      
      renderStagesTable(cache.stages);
      updateStats();
      
    } catch (error) {
      console.error('Erreur chargement stages:', error);
      showNotification(`Erreur: ${error.message}`, true);
      renderStagesTable([]);
    }
  }

  function renderStagesTable(stages) {
    const tbody = elements.stagesTableBody;
    tbody.innerHTML = '';

    if (!Array.isArray(stages) || stages.length === 0) {
      tbody.innerHTML = '<tr class="no-data"><td colspan="10">Aucun stagiaire trouvé</td></tr>';
      return;
    }

    const fragment = document.createDocumentFragment();
    
    stages.forEach(stage => {
      const tr = document.createElement('tr');
      tr.innerHTML = createStageRow(stage);
      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
    attachTableEventListeners();
  }

  function createStageRow(stage) {
    const nomComplet = `${stage.nom_stagiaire || ''} ${stage.prenom_stagiaire || ''}.trim()`;
    const encadreur = stage.encadreur_nom && stage.encadreur_prenom 
      ? `${stage.encadreur_prenom} ${stage.encadreur_nom}` 
      : 'Non assigné';
    const periode = `${formatDateFr(stage.date_debut)} → ${formatDateFr(stage.date_fin)}`;
    
    return `
      <td>${stage.nom_stagiaire || ''}</td>
      <td>${stage.prenom_stagiaire || ''}</td>
      <td>${formatDateFr(stage.date_naissance)}</td>
      <td>${periode}</td>
      <td>${stage.duree || ''} jours</td>
      <td>${stage.poste_intitule || 'N/A'}</td>
      <td>${encadreur}</td>
      <td>${stage.type_stage || ''}</td>
      <td><span class="status-badge status-${(stage.statut || 'En cours').toLowerCase().replace(' ', '-')}">${stage.statut || 'En cours'}</span></td>
      <td class="actions">
        <button class="btn btn-edit" data-id="${stage.id}" title="Modifier">✏</button>
        <button class="btn btn-delete" data-id="${stage.id}" title="Supprimer">🗑</button>
        <button class="btn btn-status" data-id="${stage.id}" data-nom="${nomComplet}" title="Changer statut">⚙</button>
      </td>
    `;
  }

  function attachTableEventListeners() {
    // Suppression
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', handleDeleteStage);
    });

    // Changement de statut
    document.querySelectorAll('.btn-status').forEach(btn => {
      btn.addEventListener('click', handleOpenStatusModal);
    });

    // Édition (si nécessaire pour plus tard)
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', handleEditStage);
    });
  }

  function updateStats() {
    const total = cache.stages.length;
    const enCours = cache.stages.filter(stage => 
      (stage.statut || 'En cours') === 'En cours'
    ).length;

    elements.totalStages.textContent = total;
    elements.stagesEnCours.textContent = enCours;
  }

  // --- VALIDATION ET FORMULAIRE ---
  function validateForm() {
    const requiredFields = [
      { element: elements.nom, name: 'Nom' },
      { element: elements.prenom, name: 'Prénom' },
      { element: elements.dateNaissance, name: 'Date de naissance' },
      { element: elements.typeStage, name: 'Type de stage' },
      { element: elements.dateDebut, name: 'Date de début' },
      { element: elements.dateFin, name: 'Date de fin' },
      { element: elements.departement, name: 'Département' },
      { element: elements.encadreur, name: 'Encadreur' }
    ];

    for (const field of requiredFields) {
      if (!field.element.value.trim()) {
        showNotification(`Le champ "${field.name}" est obligatoire.`, true);
        field.element.focus();
        return false;
      }
    }

    // Validation des dates
    const dateDebut = new Date(elements.dateDebut.value);
    const dateFin = new Date(elements.dateFin.value);
    const dateNaissance = new Date(elements.dateNaissance.value);
    const now = new Date();

    if (dateNaissance >= now) {
      showNotification('La date de naissance doit être antérieure à aujourd\'hui.', true);
      elements.dateNaissance.focus();
      return false;
    }

    if (dateFin < dateDebut) {
      showNotification('La date de fin doit être postérieure à la date de début.', true);
      elements.dateFin.focus();
      return false;
    }

    return true;
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) return;

    try {
      const electronAPI = validateElectronAPI();
      
      // Récupération des informations de l'encadreur
      const departement = elements.departement.value;
      const encadreurMatricule = elements.encadreur.value;
      
      let posteId = null;
      const personnelCacheKey = `personnel-${departement}`;
      
      if (cache.personnel.has(personnelCacheKey)) {
        const personnel = cache.personnel.get(personnelCacheKey);
        const encadreur = personnel.find(p => p.matricule === encadreurMatricule);
        if (encadreur) {
          posteId = encadreur.poste_id || encadreur.poste || null;
        }
      }

      const stageData = {
        nom_stagiaire: elements.nom.value.trim(),
        prenom_stagiaire: elements.prenom.value.trim(),
        date_naissance: elements.dateNaissance.value,
        date_debut: elements.dateDebut.value,
        date_fin: elements.dateFin.value,
        duree: parseInt(elements.duree.value, 10) || null,
        poste_id: elements.departement.value,
        encadreur_id: encadreurMatricule, // L'encadreur est bien enregistré
        type_stage: elements.typeStage.value,
        statut: 'En cours'
      };

      await electronAPI.saveStage(stageData);
      showNotification('Stagiaire enregistré avec succès !');
      resetForm();
      await loadStages(currentFilters);
      
    } catch (error) {
      console.error('Erreur enregistrement:', error);
      showNotification(`Erreur: ${error.message}`, true);
    }
  }

  function resetForm() {
    elements.formStage.reset();
    elements.duree.value = '';
    setSelectState(elements.encadreur, null, '-- Choisissez un département d\'abord --', true);
  }

  // --- GESTION DES ÉVÉNEMENTS ---
  function handleSearch() {
    const filters = {};
    
    if (elements.searchInput.value.trim()) {
      filters.search = elements.searchInput.value.trim();
    }
    if (elements.filterType.value) {
      filters.typeStage = elements.filterType.value;
    }
    if (elements.filterDepartement.value) {
      filters.departement = elements.filterDepartement.value;
    }
    if (elements.filterStatut.value) {
      filters.statut = elements.filterStatut.value;
    }

    loadStages(filters);
  }

  function handleClearFilters() {
    elements.filterDepartement.value = '';
    elements.filterType.value = '';
    elements.filterStatut.value = '';
    elements.searchInput.value = '';
    loadStages();
  }

  async function handleDeleteStage(event) {
    const id = parseInt(event.currentTarget.dataset.id, 10);
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce stagiaire ? Cette action est irréversible.')) {
      return;
    }

    try {
      const electronAPI = validateElectronAPI();
      await electronAPI.deleteStage(id);
      showNotification('Stagiaire supprimé avec succès !');
      await loadStages(currentFilters);
      
    } catch (error) {
      console.error('Erreur suppression:', error);
      showNotification(`Erreur: ${error.message}`, true);
    }
  }

  function handleEditStage(event) {
    const id = parseInt(event.currentTarget.dataset.id, 10);
    const stage = cache.stages.find(s => s.id === id);
    
    if (!stage) {
      showNotification('Stagiaire non trouvé', true);
      return;
    }

    // Remplir le formulaire avec les données du stagiaire
    elements.nom.value = stage.nom_stagiaire || '';
    elements.prenom.value = stage.prenom_stagiaire || '';
    elements.dateNaissance.value = stage.date_naissance || '';
    elements.typeStage.value = stage.type_stage || '';
    elements.dateDebut.value = stage.date_debut || '';
    elements.dateFin.value = stage.date_fin || '';
    elements.duree.value = stage.duree || '';
    
    // Charger le département et l'encadreur
    if (stage.poste_intitule) {
      elements.departement.value = stage.poste_intitule;
      loadEncadreurs(stage.poste_intitule).then(() => {
        if (stage.encadreur_matricule) {
          elements.encadreur.value = stage.encadreur_matricule;
        }
      });
    }

    // Faire défiler vers le formulaire
    elements.formStage.scrollIntoView({ behavior: 'smooth' });
    elements.nom.focus();
  }

  function handleOpenStatusModal(event) {
    currentEditingStageId = parseInt(event.currentTarget.dataset.id, 10);
    const nom = event.currentTarget.dataset.nom;
    
    elements.stagiaireNom.textContent = nom;
    
    const currentStage = cache.stages.find(s => s.id === currentEditingStageId);
    elements.nouveauStatut.value = currentStage ? (currentStage.statut || 'En cours') : 'En cours';
    
    elements.statusModal.style.display = 'block';
  }

  async function handleConfirmStatus() {
    if (!currentEditingStageId) return;

    const newStatut = elements.nouveauStatut.value;
    
    try {
      const electronAPI = validateElectronAPI();
      await electronAPI.updateStageStatus(currentEditingStageId, newStatut);
      showNotification('Statut mis à jour avec succès !');
      elements.statusModal.style.display = 'none';
      await loadStages(currentFilters);
      
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      showNotification(`Erreur: ${error.message}`, true);
    }
  }

  function handleCancelStatus() {
    elements.statusModal.style.display = 'none';
    currentEditingStageId = null;
  }

  // --- ÉVÉNEMENTS ---
  function setupEventListeners() {
    // Calcul automatique de la durée
    elements.dateDebut.addEventListener('change', calculateDuration);
    elements.dateFin.addEventListener('change', calculateDuration);

    // Chargement des encadreurs selon le département
    elements.departement.addEventListener('change', () => {
      loadEncadreurs(elements.departement.value);
    });

    // Formulaire
    elements.formStage.addEventListener('submit', handleFormSubmit);
    elements.btnReset.addEventListener('click', resetForm);

    // Recherche et filtres
    elements.btnSearch.addEventListener('click', handleSearch);
    elements.btnClearFilters.addEventListener('click', handleClearFilters);
    
    // Recherche en temps réel
    elements.searchInput.addEventListener('input', debounce(handleSearch, 500));

    // Modal de statut
    elements.closeModalBtn?.addEventListener('click', handleCancelStatus);
    elements.btnCancelStatus.addEventListener('click', handleCancelStatus);
    elements.btnConfirmStatus.addEventListener('click', handleConfirmStatus);

    // Fermeture modal en cliquant à l'extérieur
    window.addEventListener('click', (e) => {
      if (e.target === elements.statusModal) {
        handleCancelStatus();
      }
    });
  }

  // Fonction de debounce pour la recherche
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // --- INITIALISATION ---
  function init() {
    setupEventListeners();
    loadDepartements();
    loadStages();
  }

  // Démarrage de l'application
  init();

  // Export pour tests (optionnel)
  window.StageManager = {
    loadStages,
    handleSearch,
    cache
  };
});