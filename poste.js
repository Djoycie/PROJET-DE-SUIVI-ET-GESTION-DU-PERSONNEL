document.addEventListener('DOMContentLoaded', async () => {
  // Configuration des éléments du DOM
  const addPosteForm = document.getElementById('add-poste-form');
  const posteIdInput = document.getElementById('poste-id');
  const searchInput = document.getElementById('search-postes');
  const tableBody = document.querySelector('#table-postes tbody');
  
  // Vérification des éléments requis
  if (!addPosteForm || !posteIdInput || !searchInput || !tableBody) {
    console.error('Éléments DOM requis manquants');
    return;
  }

  // État de l'application
  let isEditing = false;
  let editingPosteId = null;

  // Générateur d'ID unique
  function generatePosteId() {
    return 'POSTE'  + Math.floor(Math.random() * 1000);
  }

  // Initialisation de l'ID
  function initializePosteId() {
    if (!isEditing) {
      posteIdInput.value = generatePosteId();
    }
  }

  // Validation des données du formulaire
  function validateFormData(formData) {
    const errors = [];
    
    if (!formData.intitule || formData.intitule.length < 2) {
      errors.push('L\'intitulé du poste doit contenir au moins 2 caractères');
    }
    
    if (!formData.departement || formData.departement.length < 2) {
      errors.push('Le département doit contenir au moins 2 caractères');
    }
    
    if (isNaN(formData.places_desirees) || formData.places_desirees < 1) {
      errors.push('Le nombre de places désirées doit être un nombre positif');
    }
    
    return errors;
  }

  // Affichage des erreurs
  function showErrors(errors) {
    const errorMessage = errors.join('\n');
    alert('Erreurs de validation :\n' + errorMessage);
  }

  // Gestion des boutons d'action
  function setupActionButtons() {
    // Boutons Modifier
    document.querySelectorAll('.edit-poste').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const posteId = btn.dataset.id;
        if (!posteId) return;
        
        try {
          const postes = await window.electronAPI.getAllPostes();
          const poste = postes.find(p => p.id === posteId);
          
          if (!poste) {
            alert("Poste introuvable");
            return;
          }
          
          // Remplir le formulaire avec les données du poste
          fillFormForEditing(poste);
          
        } catch (error) {
          console.error('Erreur lors de la récupération du poste:', error);
          alert('Erreur lors de la récupération des données du poste');
        }
      });
    });

    // Boutons Supprimer
    document.querySelectorAll('.delete-poste').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const posteId = btn.dataset.id;
        if (!posteId) return;
        
        if (!confirm("Voulez-vous vraiment supprimer ce poste ? Cette action est irréversible.")) {
          return;
        }
        
        try {
          const result = await window.electronAPI.deletePoste(posteId);
          
          if (result.success) {
            alert("Poste supprimé avec succès !");
            await loadPostesTable();
          } else {
            alert("Erreur lors de la suppression : " + (result.message || 'Erreur inconnue'));
          }
        } catch (error) {
          console.error('Erreur lors de la suppression:', error);
          alert('Erreur lors de la suppression du poste');
        }
      });
    });
  }

  // Remplir le formulaire pour l'édition
  function fillFormForEditing(poste) {
    const elements = addPosteForm.elements;
    
    elements['poste-id'].value = poste.id;
    elements.intitule.value = poste.intitule || '';
    elements.departement.value = poste.departement || '';
    elements.places_desirees.value = poste.places_desirees || '';
    elements.description.value = poste.description || '';
    
    // Marquer comme édition
    isEditing = true;
    editingPosteId = poste.id;
    
    // Changer le texte du bouton submit
    const submitBtn = addPosteForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Modifier le poste';
    }
    
    // Rendre le champ ID en lecture seule pendant l'édition
    elements['poste-id'].readOnly = true;
    
    // Optionnel : faire défiler vers le formulaire
    addPosteForm.scrollIntoView({ behavior: 'smooth' });
  }

  // Réinitialiser le formulaire
  function resetForm() {
    addPosteForm.reset();
    isEditing = false;
    editingPosteId = null;
    
    // Restaurer le texte du bouton
    const submitBtn = addPosteForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Ajouter le poste';
    }
    
    // Réactiver le champ ID
    posteIdInput.readOnly = false;
    
    // Générer un nouvel ID
    initializePosteId();
  }

  // Chargement et affichage du tableau des postes
  async function loadPostesTable() {
    try {
      // Vider le tableau
      tableBody.innerHTML = '';
      
      // Récupérer les postes
      const postes = await window.electronAPI.getAllPostes();
      
      if (!postes || postes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Aucun poste trouvé</td></tr>';
        return;
      }
      
      // Créer les lignes du tableau
      for (const poste of postes) {
        try {
          const count = await window.electronAPI.countEmployeesByPoste(poste.id);
          const restantes = Math.max(0, (poste.places_desirees || 0) - count);
          
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${escapeHtml(poste.id || '')}</td>
            <td>${escapeHtml(poste.intitule || '')}</td>
            <td>${escapeHtml(poste.departement || '')}</td>
            <td>${poste.places_desirees || 0}</td>
            <td>${count}</td>
            <td>${restantes}</td>
            <td>
              <button class="edit-poste btn-action" data-id="${poste.id}" title="Modifier ce poste">
                Modifier
              </button>
              <button class="delete-poste btn-action btn-danger" data-id="${poste.id}" title="Supprimer ce poste">
                Supprimer
              </button>
            </td>
          `;
          tableBody.appendChild(tr);
        } catch (error) {
          console.error('Erreur lors du traitement du poste:', poste.id, error);
        }
      }
      
      // Configurer les boutons d'action
      setupActionButtons();
      
    } catch (error) {
      console.error('Erreur lors du chargement des postes:', error);
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Erreur lors du chargement des données</td></tr>';
    }
  }

  // Échapper le HTML pour éviter les injections
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Gestion de la soumission du formulaire
  addPosteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Désactiver le bouton de soumission pendant le traitement
    const submitBtn = addPosteForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Traitement...';
    
    try {
      // Récupérer les données du formulaire
      const formData = {
        id: addPosteForm.elements['poste-id'].value.trim(),
        intitule: addPosteForm.elements.intitule.value.trim(),
        description: addPosteForm.elements.description.value.trim(),
        places_desirees: parseInt(addPosteForm.elements.places_desirees.value, 10),
        departement: addPosteForm.elements.departement.value.trim()
      };
      
      // Valider les données
      const validationErrors = validateFormData(formData);
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
        const ficheInput = addPosteForm.elements.fiche;
        const ficheFile = ficheInput.files[0];
        
        if (!ficheFile) {
          alert("Veuillez sélectionner un fichier pour la fiche de poste.");
          return;
        }
        
        // Vérifier le type de fichier
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
        const fileExtension = ficheFile.name.toLowerCase().substring(ficheFile.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(fileExtension)) {
          alert("Type de fichier non autorisé. Formats acceptés : PDF, DOC, DOCX, TXT");
          return;
        }
        
        // Vérifier la taille du fichier (max 5MB)
        if (ficheFile.size > 5 * 1024 * 1024) {
          alert("Le fichier est trop volumineux. Taille maximale : 5MB");
          return;
        }
        
        // Lire le fichier
        const ficheBuffer = await readFileAsArrayBuffer(ficheFile);
        
        result = await window.electronAPI.addPoste(
          formData,
          ficheBuffer,
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
      console.error('Erreur lors de la soumission:', error);
      alert('Une erreur est survenue lors du traitement de votre demande');
    } finally {
      // Réactiver le bouton
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Fonction utilitaire pour lire un fichier
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Bouton d'annulation pour sortir du mode édition
  const cancelBtn = document.getElementById('cancel-edit');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (isEditing) {
        if (confirm('Voulez-vous vraiment annuler les modifications ?')) {
          resetForm();
        }
      }
    });
  }

  // Fonction de recherche améliorée
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const searchTerm = this.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#table-postes tbody tr');
        
        rows.forEach(tr => {
          if (tr.children.length === 1) return; // Ignorer les lignes de message
          
          const text = tr.textContent.toLowerCase();
          const shouldShow = searchTerm === '' || text.includes(searchTerm);
          tr.style.display = shouldShow ? '' : 'none';
        });
      }, 300); // Debounce de 300ms
    });
  }

  // Initialisation
  try {
    initializePosteId();
    await loadPostesTable();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    alert('Erreur lors de l\'initialisation de l\'application');
  }
});