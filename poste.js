document.addEventListener('DOMContentLoaded', async () => {
  // Configuration des éléments du DOM
  const addPosteForm = document.getElementById('add-poste-form');
  const posteIdInput = document.getElementById('poste-id');
  const searchInput = document.getElementById('search-postes');
  const tableBody = document.querySelector('#table-postes tbody');
  const submitBtn = document.getElementById('submit-btn'); // Get the submit button
  const cancelBtn = document.getElementById('cancel-btn'); // Get the cancel button
  const formModeIndicator = document.getElementById('form-mode-indicator'); // Get the form mode indicator
  const ficheInput = document.getElementById('fiche'); // Get the file input
  const fileInfoDiv = document.getElementById('file-info'); // For new file selection
  const currentFileInfoDiv = document.getElementById('current-file-info'); // For existing file

  // Vérification des éléments requis
  if (!addPosteForm || !posteIdInput || !searchInput || !tableBody || !submitBtn || !cancelBtn || !formModeIndicator || !ficheInput || !fileInfoDiv || !currentFileInfoDiv) {
    console.error('Éléments DOM requis manquants. Assurez-vous que tous les IDs existent.');
    return;
  }

  // État de l'application
  let isEditing = false;
  let editingPosteId = null;
  let currentFichePath = ''; // Pour stocker le chemin de la fiche existante pour l'édition

  // Générateur d'ID unique
  function generatePosteId() {
    return 'POSTE' + Math.floor(Math.random() * 10000); // Plage augmentée pour moins de collisions
  }

  // Initialisation de l'ID et de l'affichage du formulaire
  function initializeForm() {
    if (!isEditing) {
      posteIdInput.value = generatePosteId();
      formModeIndicator.textContent = 'Mode: Ajout d\'un nouveau poste';
      formModeIndicator.classList.remove('mode-edit');
      formModeIndicator.classList.add('mode-add');
      submitBtn.textContent = '➕ Ajouter le Poste';
      cancelBtn.style.display = 'none';
      ficheInput.required = true; // La fiche est requise pour les nouveaux postes
      fileInfoDiv.style.display = 'none'; // Cacher les infos pour le nouveau fichier lorsqu'il n'est pas sélectionné
      currentFileInfoDiv.style.display = 'none'; // Cacher les infos du fichier actuel
      currentFichePath = ''; // Effacer le chemin de la fiche actuelle
    } else {
      formModeIndicator.textContent = 'Mode: Modification d\'un poste';
      formModeIndicator.classList.remove('mode-add');
      formModeIndicator.classList.add('mode-edit');
      submitBtn.textContent = '💾 Modifier le Poste';
      cancelBtn.style.display = 'inline-block'; // Afficher le bouton d'annulation en mode édition
      ficheInput.required = false; // La fiche n'est pas requise pour l'édition
    }
    // Effacer tout fichier précédemment sélectionné dans l'input
    ficheInput.value = '';
    // Réinitialiser l'affichage des informations sur les fichiers
    fileInfoDiv.textContent = '';
  }

  // Validation des données du formulaire
  function validateFormData(formData, isAddingNew) {
    const errors = [];

    if (!formData.intitule || formData.intitule.length < 2) {
      errors.push('L\'intitulé du poste doit contenir au moins 2 caractères.');
    }

    if (!formData.departement || formData.departement.length < 2) {
      errors.push('Le département doit contenir au moins 2 caractères.');
    }

    if (isNaN(formData.places_desirees) || formData.places_desirees < 1) {
      errors.push('Le nombre de places désirées doit être un nombre positif.');
    }

    if (isAddingNew && !ficheInput.files[0]) {
      errors.push('Veuillez sélectionner un fichier pour la fiche de poste.');
    }

    return errors;
  }

  // Affichage des erreurs
  function showErrors(errors) {
    alert('Erreurs de validation :\n' + errors.join('\n'));
  }

  // Gestion des boutons d'action
  function setupActionButtons() {
    // Boutons Modifier
    document.querySelectorAll('.edit-poste').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const posteId = btn.dataset.id;
        if (!posteId) return;

        try {
          const postes = await window.electronAPI.getAllPostes();
          const poste = postes.find(p => p.id === posteId);

          if (!poste) {
            alert("Poste introuvable.");
            return;
          }

          // Remplir le formulaire avec les données du poste
          fillFormForEditing(poste);

        } catch (error) {
          console.error('Erreur lors de la récupération du poste pour édition :', error);
          alert('Erreur lors de la récupération des données du poste pour modification.');
        }
      };
    });

    // Boutons Supprimer
    document.querySelectorAll('.delete-poste').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const posteId = btn.dataset.id;
        if (!posteId) return;

        if (!confirm("Voulez-vous vraiment supprimer ce poste ? Cette action est irréversible et retirera le poste de tous les employés associés.")) {
          return;
        }

        try {
          // Vous pourriez vouloir annuler le poste pour les employés associés à ce poste
          // avant de supprimer le poste lui-même dans votre processus principal ou ajouter une contrainte de clé étrangère avec CASCADE DELETE
          const result = await window.electronAPI.deletePoste(posteId);

          if (result.success) {
            alert("Poste supprimé avec succès !");
            await loadPostesTable();
          } else {
            alert("Erreur lors de la suppression : " + (result.message || 'Erreur inconnue'));
          }
        } catch (error) {
          console.error('Erreur lors de la suppression du poste :', error);
          alert('Une erreur est survenue lors de la suppression du poste.');
        }
      };
    });

    // Boutons Voir Détails
    document.querySelectorAll('.view-details-poste').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const posteId = btn.dataset.id;
        if (!posteId) return;

        try {
          const postes = await window.electronAPI.getAllPostes();
          const poste = postes.find(p => p.id === posteId);
          if (poste) {
            showPosteDetailsModal(poste);
          } else {
            alert("Détails du poste introuvables.");
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des détails du poste :', error);
          alert('Erreur lors du chargement des détails du poste.');
        }
      };
    });
  }

  // Remplir le formulaire pour l'édition
  function fillFormForEditing(poste) {
    const elements = addPosteForm.elements;

    elements['poste-id'].value = poste.id || '';
    elements.intitule.value = poste.intitule || '';
    elements.departement.value = poste.departement || '';
    elements.places_desirees.value = poste.places_desirees || ''; // S'assurer que c'est un nombre
    elements.description.value = poste.description || '';

    // Stocker le chemin de la fiche existante
    currentFichePath = poste.fiche_poste || '';
    if (currentFichePath) {
      currentFileInfoDiv.textContent = `Fichier actuel : ${currentFichePath.split(/[\\/]/).pop()}`; // Afficher seulement le nom du fichier
      currentFileInfoDiv.style.display = 'block';
    } else {
      currentFileInfoDiv.textContent = 'Aucun fichier attaché.';
      currentFileInfoDiv.style.display = 'block';
    }
    fileInfoDiv.style.display = 'none'; // Cacher les infos du nouveau fichier jusqu'à ce qu'un nouveau fichier soit sélectionné

    // Marquer comme édition
    isEditing = true;
    editingPosteId = poste.id;
    initializeForm(); // Mettre à jour le texte du bouton et l'indicateur de mode

    // Rendre le champ ID en lecture seule pendant l'édition
    elements['poste-id'].readOnly = true;

    // Optionnel : faire défiler jusqu'au formulaire
    addPosteForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Réinitialiser le formulaire
  function resetForm() {
    addPosteForm.reset();
    isEditing = false;
    editingPosteId = null;
    currentFichePath = '';
    initializeForm(); // Réinitialiser l'état du formulaire
    posteIdInput.readOnly = false; // Rendre l'ID modifiable à nouveau
  }

  
      // Chargement et affichage du tableau des postes - VERSION CORRIGÉE
async function loadPostesTable() {
  try {
    tableBody.innerHTML = '<tr><td colspan="7" class="loading">Chargement des données...</td></tr>';

    const postes = await window.electronAPI.getAllPostes();
    
    // AJOUT DE LOGS POUR DÉBUGGER
    console.log('Postes récupérés:', postes);

    if (!postes || postes.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Aucun poste trouvé.</td></tr>';
      return;
    }

    tableBody.innerHTML = ''; // Effacer le message de chargement

    for (const poste of postes) {
      // AJOUT DE LOGS POUR DÉBUGGER CHAQUE POSTE
      console.log('Poste actuel:', poste);
      console.log('Département:', poste.departement);
      console.log('Places désirées:', poste.places_desirees);
      
      let count = 0;
      try {
        count = await window.electronAPI.countEmployeesByPoste(poste.id);
      } catch (error) {
        console.error(`Erreur lors du comptage des employés pour le poste ${poste.id}:`, error);
      }
      
      // CORRECTION: Assurez-vous que places_desirees est bien un nombre
      const desiredPlaces = parseInt(poste.places_desirees, 10) || 0;
      const restantes = Math.max(0, desiredPlaces - count);

      // AJOUT DE LOGS POUR VÉRIFIER LES VALEURS CALCULÉES
      console.log(`Poste ${poste.id}: places_desirees=${poste.places_desirees}, desiredPlaces=${desiredPlaces}, count=${count}, restantes=${restantes}`);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(poste.id || '')}</td>
        <td>${escapeHtml(poste.intitule || '')}</td>
        <td>${escapeHtml(poste.departement || 'N/A')}</td>
        <td>${desiredPlaces}</td>
        <td>${count}</td>
        <td>${restantes}</td>
        <td>
          <button class="view-details-poste btn-action" data-id="${poste.id}" title="Voir les détails">
            Détails
          </button>
          <button class="edit-poste btn-action" data-id="${poste.id}" title="Modifier ce poste">
            Modifier
          </button>
          <button class="delete-poste btn-action btn-danger" data-id="${poste.id}" title="Supprimer ce poste">
            Supprimer
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    }
    setupActionButtons();

  } catch (error) {
    console.error('Erreur lors du chargement des postes :', error);
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Erreur lors du chargement des données. Veuillez recharger la page.</td></tr>';
  }
}

  // Échapper le HTML pour éviter les injections XSS
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Gestion de la soumission du formulaire
  addPosteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Traitement...';

    try {
      const formData = {
        id: addPosteForm.elements['poste-id'].value.trim(),
        intitule: addPosteForm.elements.intitule.value.trim(),
        description: addPosteForm.elements.description.value.trim(),
        places_desirees: parseInt(addPosteForm.elements.places_desirees.value, 10),
        departement: addPosteForm.elements.departement.value.trim()
      };

      const validationErrors = validateFormData(formData, !isEditing); // Passer un indicateur pour nouveau vs. édition
      if (validationErrors.length > 0) {
        showErrors(validationErrors);
        return;
      }

      let result;

      if (isEditing) {
        // MODIFICATION
        result = await window.electronAPI.updatePoste(formData);

        if (result.success) {
          alert("Poste modifié avec succès !");
          resetForm();
          await loadPostesTable();
        } else {
          alert("Erreur lors de la modification : " + (result.message || 'Erreur inconnue'));
        }
      } else {
        // AJOUT
        const ficheFile = ficheInput.files[0];

        // Validation du fichier côté client (redondante avec validateFormData mais bonne pour l'UX)
        if (!ficheFile) { // Ce cas devrait déjà être intercepté par validateFormData
            alert("Veuillez sélectionner un fichier pour la fiche de poste.");
            return;
        }

        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
        const fileExtension = ficheFile.name.toLowerCase().substring(ficheFile.name.lastIndexOf('.'));

        if (!allowedTypes.includes(fileExtension)) {
          alert("Type de fichier non autorisé. Formats acceptés : PDF, DOC, DOCX, TXT.");
          return;
        }

        if (ficheFile.size > 5 * 1024 * 1024) { // Max 5MB
          alert("Le fichier est trop volumineux. Taille maximale : 5MB.");
          return;
        }

        const ficheBuffer = await readFileAsArrayBuffer(ficheFile);

        result = await window.electronAPI.addPoste(
          formData,
          Array.from(ficheBuffer), // Convertir Uint8Array en tableau normal pour IPC
          ficheFile.name
        );

        if (result.success) {
          alert("Poste ajouté avec succès !");
          resetForm();
          await loadPostesTable();
        } else {
          alert("Erreur lors de l'ajout : " + (result.message || 'Erreur inconnue'));
        }
      }

    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire :', error);
      alert('Une erreur est survenue lors du traitement de votre demande.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Fonction utilitaire pour lire un fichier
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier.'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Gérer le changement d'input de fichier pour l'affichage
  ficheInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      fileInfoDiv.textContent = `Fichier sélectionné : ${this.files[0].name}`;
      fileInfoDiv.style.display = 'block';
      currentFileInfoDiv.style.display = 'none'; // Cacher les infos du fichier actuel lorsqu'un nouveau est sélectionné
    } else {
      fileInfoDiv.textContent = '';
      fileInfoDiv.style.display = 'none';
      if (currentFichePath) { // Afficher les infos du fichier actuel si en mode édition et aucun nouveau fichier sélectionné
        currentFileInfoDiv.style.display = 'block';
      }
    }
  });

  // Bouton d'annulation pour sortir du mode édition
  cancelBtn.addEventListener('click', () => {
    if (isEditing) {
      if (confirm('Voulez-vous vraiment annuler les modifications ?')) {
        resetForm();
      }
    }
  });

  // Fonction de recherche améliorée
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const searchTerm = this.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#table-postes tbody tr');

        rows.forEach(tr => {
          if (tr.children.length === 1) return; // Ignorer les lignes de message (ex. "Chargement...")

          const text = tr.textContent.toLowerCase();
          const shouldShow = searchTerm === '' || text.includes(searchTerm);
          tr.style.display = shouldShow ? '' : 'none';
        });
      }, 300); // Debounce de 300ms
    });
  }

  // Logique du modal pour les détails du poste (nouvel ajout)
  const modalPosteDetails = document.getElementById('modal-poste-details');
  const closeModalPosteBtn = document.getElementById('close-modal-poste');
  const modalPosteBody = document.getElementById('modal-poste-body');
  const voirFichePosteModalBtn = document.getElementById('voir-fiche-poste-modal');
  let currentPosteFichePath = ''; // Pour stocker le chemin de la fiche pour le modal

  function showPosteDetailsModal(poste) {
    modalPosteBody.innerHTML = `
      <h3>Détails du Poste : ${escapeHtml(poste.intitule || 'N/A')}</h3>
      <p><strong>ID :</strong> ${escapeHtml(poste.id || 'N/A')}</p>
      <p><strong>Département :</strong> ${escapeHtml(poste.departement || 'N/A')}</p>
      <p><strong>Places Désirées :</strong> ${poste.places_desirees || 0}</p>
      <p><strong>Description :</strong> ${escapeHtml(poste.description || 'Aucune description.')}</p>
      <p><strong>Fiche de Poste :</strong> ${poste.fiche_poste ? poste.fiche_poste.split(/[\\/]/).pop() : 'Non attachée'}</p>
    `;
    currentPosteFichePath = poste.fiche_poste; // Stocker le chemin de la fiche

    if (currentPosteFichePath) {
      voirFichePosteModalBtn.style.display = 'block';
    } else {
      voirFichePosteModalBtn.style.display = 'none';
    }

    modalPosteDetails.style.display = 'block';
  }

  closeModalPosteBtn.onclick = () => {
    modalPosteDetails.style.display = 'none';
    currentPosteFichePath = ''; // Effacer le chemin à la fermeture
  };

  voirFichePosteModalBtn.onclick = async () => {
    if (currentPosteFichePath) {
      try {
        const result = await window.electronAPI.openFile1(currentPosteFichePath);
        if (!result.success) {
          alert('Impossible d\'ouvrir la fiche de poste : ' + (result.message || 'Erreur inconnue.'));
        }
      } catch (error) {
        console.error('Erreur lors de l\'ouverture de la fiche de poste :', error);
        alert('Une erreur est survenue lors de l\'ouverture de la fiche de poste.');
      }
    } else {
      alert('Aucune fiche de poste disponible pour ce poste.');
    }
  };

  window.onclick = (event) => {
    if (event.target == modalPosteDetails) {
      modalPosteDetails.style.display = 'none';
      currentPosteFichePath = ''; // Effacer le chemin à la fermeture
    }
  };


  // Initialisation
  try {
    initializeForm(); // Appeler ceci pour définir l'état initial
    await loadPostesTable();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de l\'application :', error);
    alert('Erreur lors de l\'initialisation de l\'application. Veuillez vérifier la console pour plus de détails.');
  }
});