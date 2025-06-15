// conge.js - Version restructurée et optimisée

document.addEventListener('DOMContentLoaded', () => {
  // ===========================================
  // RÉFÉRENCES DOM
  // ===========================================
  const form = document.getElementById('congesForm');
  
  // Champs du formulaire
  const matriculeInput = document.getElementById('matricule');
  const nomInput = document.getElementById('nom');
  const prenomInput = document.getElementById('prenom');
  const posteInput = document.getElementById('poste');
  const departementInput = document.getElementById('departement');
  const typeCongeSelect = document.getElementById('typeConge');
  const dateDebutInput = document.getElementById('dateDebut');
  const dateFinInput = document.getElementById('dateFin');
  const dureeInput = document.getElementById('dureeConge');
  const commentairesInput = document.getElementById('commentaires');

  // Messages
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');

  // Filtres
  const filterTypeConge = document.getElementById('filterTypeConge');
  const filterPoste = document.getElementById('filterPoste');
  const filterDepartement = document.getElementById('filterDepartement');

  // Tableau
  const congesTableBody = document.querySelector('#congesTable tbody');

  // ===========================================
  // VARIABLES D'ÉTAT
  // ===========================================
  let congesList = [];
  let editingIndex = -1; // -1 = mode ajout, >= 0 = mode modification
  let filteredCongesList = []; // Liste filtrée pour l'affichage

  // ===========================================
  // FONCTIONS UTILITAIRES
  // ===========================================

  /**
   * Affiche un message temporaire
   */
  function showMessage(element, message, duration = 3000) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
      element.textContent = '';
      element.style.display = 'none';
    }, duration);
  }

  /**
   * Calcule la durée entre deux dates
   */
  function calculerDuree() {
    const debut = new Date(dateDebutInput.value);
    const fin = new Date(dateFinInput.value);
    
    if (!isNaN(debut) && !isNaN(fin) && fin >= debut) {
      const diffTime = fin.getTime() - debut.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      dureeInput.value = diffDays + " jours";
      return diffDays;
    } else {
      dureeInput.value = "";
      return 0;
    }
  }

  /**
   * Remet le formulaire à zéro
   */
  function resetForm() {
    form.reset();
    dureeInput.value = "";
    editingIndex = -1;
    
    // Changer le texte du bouton si nécessaire
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Enregistrer la demande';
    }
  }

  /**
   * Met à jour les options des filtres
   */
  function updateFilterOptions() {
    const postes = new Set();
    const departements = new Set();

    congesList.forEach(conge => {
      if (conge.poste) postes.add(conge.poste);
      if (conge.departement) departements.add(conge.departement);
    });

    // Fonction helper pour remplir un select
    function fillSelect(select, items) {
      const currentValue = select.value;
      const firstOption = select.options[0];
      
      select.innerHTML = '';
      select.appendChild(firstOption);
      
      Array.from(items).sort().forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
      });
      
      // Restaurer la valeur si elle existe encore
      if (currentValue && items.has(currentValue)) {
        select.value = currentValue;
      }
    }

    fillSelect(filterPoste, postes);
    fillSelect(filterDepartement, departements);
  }

  /**
   * Applique les filtres sur la liste des congés
   */
  function applyFilters() {
    const typeVal = filterTypeConge.value.toLowerCase();
    const posteVal = filterPoste.value.toLowerCase();
    const departVal = filterDepartement.value.toLowerCase();

    filteredCongesList = congesList.filter(conge => {
      const matchType = !typeVal || (conge.typeConge && conge.typeConge.toLowerCase() === typeVal);
      const matchPoste = !posteVal || (conge.poste && conge.poste.toLowerCase().includes(posteVal));
      const matchDepart = !departVal || (conge.departement && conge.departement.toLowerCase().includes(departVal));
      
      return matchType && matchPoste && matchDepart;
    });
  }

  /**
   * Affiche les congés dans le tableau
   */
  function afficherConges() {
    applyFilters();
    congesTableBody.innerHTML = '';

    if (filteredCongesList.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="11" style="text-align: center; color: #666;">Aucune demande de congé trouvée</td>';
      congesTableBody.appendChild(tr);
      return;
    }

    filteredCongesList.forEach((conge, filteredIndex) => {
      // Trouver l'index réel dans la liste complète
      const realIndex = congesList.findIndex(c => c.id === conge.id || 
        (c.matricule === conge.matricule && c.dateDebut === conge.dateDebut));
      
      // S'assurer que la durée est correctement affichée
      let dureeAffichage = '';
      if (conge.dureeConge !== null && conge.dureeConge !== undefined && conge.dureeConge > 0) {
        dureeAffichage = conge.dureeConge + ' jours';
      } else if (conge.dateDebut && conge.dateFin) {
        // Recalcul en cas de problème
        const debut = new Date(conge.dateDebut);
        const fin = new Date(conge.dateFin);
        if (!isNaN(debut) && !isNaN(fin) && fin >= debut) {
          const diffTime = fin.getTime() - debut.getTime();
          const dureeCalculee = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          dureeAffichage = dureeCalculee + ' jours';
          // Mettre à jour la donnée dans la liste
          conge.dureeConge = dureeCalculee;
        }
      }

       const statutInfo = calculerStatutConge(conge.dateDebut, conge.dateFin);

     
      const tr = document.createElement('tr');
       // Appliquer la classe de coloration
    if (statutInfo.classe) {
      tr.className = statutInfo.classe;
    }
    
    // Ajouter un titre (tooltip) à la ligne
    if (statutInfo.message) {
      tr.title = statutInfo.message;
    }



      tr.innerHTML = `
        <td>${conge.matricule || ''}</td>
        <td>${conge.nom || ''}</td>
        <td>${conge.prenom || ''}</td>
        <td>${conge.poste || ''}</td>
        <td>${conge.departement || ''}</td>
        <td>${conge.typeConge || ''}</td>
        ${statutInfo.badgeText ? `<span class="statut-badge ${statutInfo.badge}">${statutInfo.badgeText}</span>` : ''}

        <td>${conge.dateDebut || ''}</td>
        <td>${conge.dateFin || ''}</td>
        ${statutInfo.message ? `<br><small style="color: #666; font-style: italic;">${statutInfo.message}</small>` : ''}

        <td>${dureeAffichage}</td>
        <td>${conge.commentaires || 'aucun commentaire'}</td>
        <td>
          <button class="modifier-btn" data-real-index="${realIndex}" data-filtered-index="${filteredIndex}">
            Modifier
          </button>
          <button class="supprimer-btn" data-real-index="${realIndex}" data-filtered-index="${filteredIndex}">
            Supprimer
          </button>
          <button class="imprimer-btn" data-real-index="${realIndex} data-filtered-index="${filteredIndex} ">Imprimer</button>
          <button class="pdf-btn" data-real-index="${realIndex}  data-filtered-index="${filteredIndex}">PDF</button>

        </td>
      `;
      congesTableBody.appendChild(tr);
    });
    afficherStatistiques();
  }

  // Ajoutez ces styles CSS au début de votre fichier ou dans votre CSS
const styles = `
<style>
  /* Styles pour la coloration des lignes selon les dates de congé */
  .conge-expire {
    background-color: #ffebee !important; /* Rouge clair pour congés expirés */
    border-left: 4px solid #f44336;
  }
  
  .conge-bientot-expire {
    background-color: #fff3e0 !important; /* Orange clair pour congés qui se terminent bientôt */
    border-left: 4px solid #ff9800;
  }
  
  .conge-aujourd-hui {
    background-color: #e8f5e8 !important; /* Vert clair pour congés qui se terminent aujourd'hui */
    border-left: 4px solid #4caf50;
    animation: pulse 2s infinite;
  }
  
  .conge-en-cours {
    background-color: #e3f2fd !important; /* Bleu clair pour congés en cours */
    border-left: 4px solid #2196f3;
  }
  
  .conge-futur {
    background-color: #f3e5f5 !important; /* Violet clair pour congés futurs */
    border-left: 4px solid #9c27b0;
  }

  /* Animation pour les congés qui se terminent aujourd'hui */
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }

  /* Styles pour les badges de statut */
  .statut-badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    display: inline-block;
    margin-left: 5px;
  }

  .statut-expire {
    background-color: #f44336;
    color: white;
  }

  .statut-bientot {
    background-color: #ff9800;
    color: white;
  }

  .statut-aujourd-hui {
    background-color: #4caf50;
    color: white;
  }

  .statut-en-cours {
    background-color: #2196f3;
    color: white;
  }

  .statut-futur {
    background-color: #9c27b0;
    color: white;
  }
</style>
`;

// Injecter les styles dans le document
if (!document.getElementById('conge-coloration-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'conge-coloration-styles';
  styleElement.innerHTML = styles.replace(/<\/?style>/g, '');
  document.head.appendChild(styleElement);
}

/**
 * Calcule le statut d'un congé basé sur les dates
 * @param {string} dateDebut - Date de début au format YYYY-MM-DD
 * @param {string} dateFin - Date de fin au format YYYY-MM-DD
 * @returns {Object} - Objet contenant le statut et les informations
 */
function calculerStatutConge(dateDebut, dateFin) {
  if (!dateDebut || !dateFin) {
    return { statut: 'inconnu', classe: '', badge: '', message: '' };
  }

  const aujourd_hui = new Date();
  aujourd_hui.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparer seulement les dates

  const debut = new Date(dateDebut);
  debut.setHours(0, 0, 0, 0);

  const fin = new Date(dateFin);
  fin.setHours(0, 0, 0, 0);

  // Calculer la différence en jours
  const diffDebut = Math.ceil((debut.getTime() - aujourd_hui.getTime()) / (1000 * 60 * 60 * 24));
  const diffFin = Math.ceil((fin.getTime() - aujourd_hui.getTime()) / (1000 * 60 * 60 * 24));

  if (diffFin < 0) {
    // Congé déjà terminé (expiré)
    const joursExpires = Math.abs(diffFin);
    return {
      statut: 'expire',
      classe: 'conge-expire',
      badge: 'statut-expire',
      message: `Terminé depuis ${joursExpires} jour${joursExpires > 1 ? 's' : ''}`,
      badgeText: 'TERMINÉ'
    };
  } else if (diffFin === 0) {
    // Congé se termine aujourd'hui
    return {
      statut: 'aujourd_hui',
      classe: 'conge-aujourd-hui',
      badge: 'statut-aujourd-hui',
      message: 'Se termine aujourd\'hui',
      badgeText: 'AUJOURD\'HUI'
    };
  } else if (diffFin === 1) {
    // Congé se termine demain
    return {
      statut: 'bientot_expire',
      classe: 'conge-bientot-expire',
      badge: 'statut-bientot',
      message: 'Se termine demain',
      badgeText: 'DEMAIN'
    };
  } else if (diffDebut <= 0 && diffFin > 0) {
    // Congé en cours
    return {
      statut: 'en_cours',
      classe: 'conge-en-cours',
      badge: 'statut-en-cours',
      message: `En cours (${diffFin} jour${diffFin > 1 ? 's' : ''} restant${diffFin > 1 ? 's' : ''})`,
      badgeText: 'EN COURS'
    };
  } else if (diffDebut > 0) {
    // Congé futur
    return {
      statut: 'futur',
      classe: 'conge-futur',
      badge: 'statut-futur',
      message: `Commence dans ${diffDebut} jour${diffDebut > 1 ? 's' : ''}`,
      badgeText: 'PLANIFIÉ'
    };
  }

  return { statut: 'inconnu', classe: '', badge: '', message: '', badgeText: '' };
}

/**
 * Fonction améliorée pour afficher les congés avec coloration
 */


/**
 * Affiche les statistiques des congés par statut
 */
function afficherStatistiques() {
  const stats = {
    expire: 0,
    aujourd_hui: 0,
    bientot_expire: 0,
    en_cours: 0,
    futur: 0,
    total: filteredCongesList.length
  };

  // Calculer les statistiques
  filteredCongesList.forEach(conge => {
    const statutInfo = calculerStatutConge(conge.dateDebut, conge.dateFin);
    if (stats.hasOwnProperty(statutInfo.statut)) {
      stats[statutInfo.statut]++;
    }
  });

  // Créer ou mettre à jour le panneau de statistiques
  let statsPanel = document.getElementById('conges-statistics');
  if (!statsPanel) {
    statsPanel = document.createElement('div');
    statsPanel.id = 'conges-statistics';
    statsPanel.style.cssText = `
      margin: 10px 0;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      align-items: center;
    `;
    
    // Insérer avant le tableau
    const table = document.getElementById('congesTable');
    if (table && table.parentNode) {
      table.parentNode.insertBefore(statsPanel, table);
    }
  }

  statsPanel.innerHTML = `
    <div style="font-weight: bold; margin-right: 15px;">📊 Statistiques des congés :</div>
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      ${stats.expire > 0 ? `<span style="background: #f44336; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
        Terminés: ${stats.expire}
      </span>` : ''}
      ${stats.aujourd_hui > 0 ? `<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
        Aujourd'hui: ${stats.aujourd_hui}
      </span>` : ''}
      ${stats.bientot_expire > 0 ? `<span style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
        Demain: ${stats.bientot_expire}
      </span>` : ''}
      ${stats.en_cours > 0 ? `<span style="background: #2196f3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
        En cours: ${stats.en_cours}
      </span>` : ''}
      ${stats.futur > 0 ? `<span style="background: #9c27b0; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
        Planifiés: ${stats.futur}
      </span>` : ''}
      <span style="background: #666; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
        Total: ${stats.total}
      </span>
    </div>
  `;
}

/**
 * Fonction pour afficher des notifications pour les congés critiques
 */
function verifierCongesCritiques() {
  const congesCritiques = congesList.filter(conge => {
    const statutInfo = calculerStatutConge(conge.dateDebut, conge.dateFin);
    return statutInfo.statut === 'aujourd_hui' || statutInfo.statut === 'bientot_expire';
  });

  if (congesCritiques.length > 0) {
    const messages = congesCritiques.map(conge => {
      const statutInfo = calculerStatutConge(conge.dateDebut, conge.dateFin);
      return `• ${conge.nom} ${conge.prenom} (${conge.poste}) - ${statutInfo.message}`;
    });

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-left: 4px solid #f39c12;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;

    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <strong style="color: #d68910;">⚠ Congés à surveiller</strong>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
      </div>
      <div style="font-size: 14px; color: #856404;">
        ${messages.join('<br>')}
      </div>
    `;

    document.body.appendChild(notification);

    // Supprimer automatiquement après 10 secondes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }
}

// Modifier le DOMContentLoaded pour inclure la vérification des congés critiques
document.addEventListener('DOMContentLoaded', () => {
  // ... votre code existant ...
  
  // Ajouter après le chargement des congés
  setTimeout(() => {
    verifierCongesCritiques();
  }, 1000);
});

// Fonction utilitaire pour forcer la mise à jour de l'affichage
function rafraichirAffichage() {
  afficherConges();
  verifierCongesCritiques();
}

// Optionnel : Mise à jour automatique toutes les heures
setInterval(() => {
  rafraichirAffichage();
}, 3600000); // 1 heure = 3600000 ms

  /**
   * Remplit le formulaire avec les données d'un congé
   */
  function remplirFormulaire(conge) {
    matriculeInput.value = conge.matricule || '';
    nomInput.value = conge.nom || '';
    prenomInput.value = conge.prenom || '';
    posteInput.value = conge.poste || '';
    departementInput.value = conge.departement || '';
    typeCongeSelect.value = conge.typeConge || '';
    dateDebutInput.value = conge.dateDebut || '';
    dateFinInput.value = conge.dateFin || '';
    dureeInput.value = conge.dureeConge !== undefined ? conge.dureeConge + " jours" : '';
    commentairesInput.value = conge.commentaires || 'aucun commentaire';
    
    // Changer le texte du bouton
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Modifier la demande';
    }
  }

  /**
   * Normalise les données reçues de la base de données (DB -> JS)
   */
  function normalizeCongeData(rawConge) {
    const normalized = {
      id: rawConge.id,
      matricule: rawConge.matricule,
      nom: rawConge.nom,
      prenom: rawConge.prenom,
      poste: rawConge.poste,
      departement: rawConge.departement,
      typeConge: rawConge.type_conge || rawConge.typeConge,
      dateDebut: rawConge.date_debut || rawConge.dateDebut,
      dateFin: rawConge.date_fin || rawConge.dateFin,
      dureeConge: rawConge.duree_conge || rawConge.dureeConge,
      commentaires: rawConge.commentaires || 'aucun commentaire'
    };

    // Recalculer la durée si elle n'existe pas ou est nulle/undefined
    if ((normalized.dureeConge === null || normalized.dureeConge === undefined) && 
        normalized.dateDebut && normalized.dateFin) {
      const debut = new Date(normalized.dateDebut);
      const fin = new Date(normalized.dateFin);
      
      if (!isNaN(debut) && !isNaN(fin) && fin >= debut) {
        const diffTime = fin.getTime() - debut.getTime();
        normalized.dureeConge = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    return normalized;
  }

  /**
   * Convertit les données JS vers le format base de données (JS -> DB)
   */
  function prepareCongeForDB(congeData) {
    return {
      id: congeData.id,
      matricule: congeData.matricule,
      nom: congeData.nom,
      prenom: congeData.prenom,
      poste: congeData.poste,
      departement: congeData.departement,
      type_conge: congeData.typeConge,      // Conversion vers le format DB
      date_debut: congeData.dateDebut,      // Conversion vers le format DB
      date_fin: congeData.dateFin,          // Conversion vers le format DB
      duree_conge: congeData.dureeConge,    // Conversion vers le format DB
      commentaires: congeData.commentaires
    };
  }

  // ===========================================
  // GESTION DES ÉVÉNEMENTS
  // ===========================================

  /**
   * Récupération automatique des données personnel par matricule
   */
  matriculeInput.addEventListener('blur', async () => {
    const matricule = matriculeInput.value.trim();
    if (!matricule) return;

    try {
      const personnel = await window.electronAPI.getPersonnelByMatricule(matricule);
      if (personnel) {
        nomInput.value = personnel.nom || '';
        prenomInput.value = personnel.prenom || '';
        posteInput.value = personnel.poste || '';
        departementInput.value = personnel.departement || '';
        errorMessage.style.display = 'none';
      } else {
        // Vider les champs si le matricule n'existe pas
        if (editingIndex === -1) { // Seulement en mode ajout
          nomInput.value = '';
          prenomInput.value = '';
          posteInput.value = '';
          departementInput.value = '';
        }
        showMessage(errorMessage, "Matricule non trouvé dans la base de données.");
      }
    } catch (error) {
      showMessage(errorMessage, "Erreur lors de la récupération du personnel.");
      console.error('Erreur récupération personnel:', error);
    }
  });

  /**
   * Calcul automatique de la durée
   */
  dateDebutInput.addEventListener('change', calculerDuree);
  dateFinInput.addEventListener('change', calculerDuree);

  /**
   * Soumission du formulaire
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const duree = calculerDuree();
    if (duree === 0) {
      alert( "Veuillez saisir des dates valides.");
      showMessage(errorMessage, "Veuillez saisir des dates valides.");
      return;
    }

    // Validation des champs obligatoires
    if (!matriculeInput.value.trim()) {
      showMessage(errorMessage, "Le matricule est obligatoire.");
      return;
    }

    const congeData = {
      matricule: matriculeInput.value.trim(),
      nom: nomInput.value.trim(),
      prenom: prenomInput.value.trim(),
      poste: posteInput.value.trim(),
      departement: departementInput.value.trim(),
      typeConge: typeCongeSelect.value,
      dateDebut: dateDebutInput.value,
      dateFin: dateFinInput.value,
      dureeConge: duree,
      commentaires: commentairesInput.value.trim()
    };

    try {
      let result;
      
      if (editingIndex !== -1) {
        // Mode modification
        const congeAModifier = congesList[editingIndex];
        if (congeAModifier.id) {
          congeData.id = congeAModifier.id;
        }

        result = await window.electronAPI.updateConge(congeData);
        if (result.success) {
          // Mettre à jour l'élément dans la liste
          congesList[editingIndex] = { ...congeData, id: congeAModifier.id };
          alert( "✅ Modification réussie !");
          showMessage(successMessage, "✅ Modification réussie !");
        } else {
          showMessage(errorMessage, "❌ Échec de la modification: " + (result.message || ''));
          return;
        }
      } else {
        // Mode ajout
        result = await window.electronAPI.saveConge(congeData);
        if (result.success) {
          // Ajouter le nouvel élément à la liste
          if (result.id) {
            congeData.id = result.id;
          }
          congesList.push(congeData);
          alert( "✅ Demande enregistrée avec succès.");
          showMessage(successMessage, "✅ Demande enregistrée avec succès !");
        } else {
          showMessage(errorMessage, "❌ Échec de l'enregistrement: " + (result.message || ''));
          return;
        }
      }

      // Réinitialiser et mettre à jour l'affichage
      resetForm();
      updateFilterOptions();
      afficherConges();
      
    } catch (error) {
      showMessage(errorMessage, "Erreur lors de la sauvegarde: " + error.message);
      console.error('Erreur sauvegarde:', error);
    }
  });

  /**
   * Gestion des filtres
   */
  filterTypeConge.addEventListener('change', afficherConges);
  filterPoste.addEventListener('change', afficherConges);
  filterDepartement.addEventListener('change', afficherConges);

  /**
   * Gestion des boutons Modifier/Supprimer
   */
  congesTableBody.addEventListener('click', async (e) => {
    const realIndex = parseInt(e.target.dataset.realIndex);
    
    if (e.target.classList.contains('modifier-btn')) {
      if (realIndex >= 0 && realIndex < congesList.length) {
        const conge = congesList[realIndex];
        remplirFormulaire(conge);
        editingIndex = realIndex;
        
        // Scroll vers le formulaire
        form.scrollIntoView({ behavior: 'smooth' });
      }
    } 
    else if (e.target.classList.contains('supprimer-btn')) {
      if (realIndex >= 0 && realIndex < congesList.length) {
        const conge = congesList[realIndex];
        const nomComplet = `${conge.nom} ${conge.prenom}`.trim();
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer la demande de congé de ${nomComplet} ?`)) {
          try {
            if (conge.id) {
              const result = await window.electronAPI.deleteConge(conge.id);
              if (!result.success) {
                showMessage(errorMessage, "❌ Échec de la suppression: " + (result.message || ''));
                return;
              }
            }
            
            // Supprimer de la liste locale
            congesList.splice(realIndex, 1);
            
            // Si on était en train de modifier cet élément, réinitialiser
            if (editingIndex === realIndex) {
              resetForm();
            } else if (editingIndex > realIndex) {
              // Ajuster l'index si nécessaire
              editingIndex--;
            }
            
            updateFilterOptions();
            afficherConges();
            alert( "✅ Demande supprimée avec succès.");
            showMessage(successMessage, "✅ Demande supprimée avec succès.");
            
          } catch (error) {
            showMessage(errorMessage, "Erreur lors de la suppression: " + error.message);
            console.error('Erreur suppression:', error);
          }
        }
      }
    }
else if (e.target.classList.contains('imprimer-btn')) {
     if (realIndex >= 0 && realIndex < congesList.length) {
      genererFicheConge(congesList[realIndex], 'print');
      }
     }
    else if (e.target.classList.contains('pdf-btn')) {
    if (realIndex >= 0 && realIndex < congesList.length) {
      genererFicheCongePDF(congesList[realIndex], 'pdf');
    }
  }


  });

// Remplacez votre fonction genererFicheCongePDF par celle-ci :

function genererFicheCongePDF(conge) {
  // Vérifier que l'objet conge existe
  if (!conge) {
    console.error('Aucune donnée de congé fournie');
    alert('Erreur : Aucune donnée de congé à exporter');
    return;
  }

  // Vérifier que jsPDF est disponible
  if (!window.jspdf || !window.jspdf.jsPDF) {
    console.error('jsPDF n\'est pas chargé');
    alert('Erreur : Bibliothèque PDF non disponible');
    return;
  }

  try {
    // Utilisation de jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Titre
    doc.setFontSize(18);
    doc.text("Fiche de Demande de Congé", 105, 20, { align: "center" });

    doc.setFontSize(12);
    let y = 35;

    // Infos employé
    doc.text(`Matricule : ${conge.matricule || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`Nom : ${conge.nom || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`Prénom : ${conge.prenom || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`Poste : ${conge.poste || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`Département : ${conge.departement || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`Type de congé : ${conge.typeConge || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`Date début : ${conge.dateDebut || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`Date fin : ${conge.dateFin || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`Durée : ${conge.dureeConge || 'N/A'} jours`, 20, y);
    y += 8;
    
    // Gérer les commentaires longs
    const commentaires = conge.commentaires || 'Aucun commentaire';
    if (commentaires.length > 50) {
      const lines = doc.splitTextToSize(`Commentaires : ${commentaires}`, 170);
      doc.text(lines, 20, y);
      y += (lines.length * 5);
    } else {
      doc.text(`Commentaires : ${commentaires}`, 20, y);
      y += 8;
    }
    
    y += 16;

    // Signatures
    const today = new Date().toLocaleDateString('fr-FR');
    doc.setFontSize(12);
    doc.text("Signature de l'employé", 20, y);
    doc.text("Signature du chef de", 80, y);
    doc.text("Signature de la DRH", 150, y);
    y += 25;
    
    doc.setFontSize(10);
    doc.text(`Date : ${today}`, 20, y);
    doc.text(`Cachet de l'entreprise`, 80, y);

    // Sauvegarde
    const fileName = `fiche_conge_${conge.nom || 'employe'}_${conge.matricule || new Date().getTime()}.pdf`;
    doc.save(fileName);
    alert('PDF généré avec succès');
    console.log('PDF généré avec succès');
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    alert('Erreur lors de la génération du PDF : ' + error.message);
  }
}

function genererFicheConge(conge, mode) {
  const today = new Date().toLocaleDateString('fr-FR');
  const ficheHTML = `
    <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 700px; margin: auto;">
      <h2 style="text-align: center; color: #2c3e50;">Fiche de Demande de Congé</h2>
      <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
        <tr><td><strong>Matricule :</strong></td><td>${conge.matricule || ''}</td></tr>
        <tr><td><strong>Nom :</strong></td><td>${conge.nom || ''}</td></tr>
        <tr><td><strong>Prénom :</strong></td><td>${conge.prenom || ''}</td></tr>
        <tr><td><strong>Poste :</strong></td><td>${conge.poste || ''}</td></tr>
        <tr><td><strong>Département :</strong></td><td>${conge.departement || ''}</td></tr>
        <tr><td><strong>Type de congé :</strong></td><td>${conge.typeConge || ''}</td></tr>
        <tr><td><strong>Date début :</strong></td><td>${conge.dateDebut || ''}</td></tr>
        <tr><td><strong>Date fin :</strong></td><td>${conge.dateFin || ''}</td></tr>
        <tr><td><strong>Durée :</strong></td><td>${conge.dureeConge || ''} jours</td></tr>
        <tr><td><strong>Commentaires :</strong></td><td>${conge.commentaires || 'aucun commentaire'}</td></tr>
      </table>
      <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div style="text-align: center;">
          <strong>Signature de l'employé</strong><br>
          <span style="display:block; height:40px;"></span>
          <span>Date : ${today}</span>
        </div>
        <div style="text-align: center;">
          <strong>Signature du chef de département</strong><br>
          <span style="display:block; height:40px;"></span>
          <span>Cachet de l'entreprise</span>
        </div>
        <div style="text-align: center;">
          <strong>Signature de la DRH</strong><br>
          <span style="display:block; height:40px;"></span>
          
        </div>
      </div>
    </div>
  `;

  

  if (mode === 'print') {
    // Ouvre une nouvelle fenêtre avec juste la fiche et lance l'impression
    const printWindow = window.open('', '', 'width=800,height=900');
    printWindow.document.write(`
      <html>
        <head>
          <title>Fiche de Congé</title>
          <style>
            @media print {
              body { margin: 0;  }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${ficheHTML}
          <script>
            window.onload = function() {
              window.print();
              
            }
          <\/script>
        </body>
      </html>
    `);

    
    printWindow.document.close();
  } else if (mode === 'pdf') {
    genererFicheConge(conge);
  }
}


  

  // ===========================================
  // FONCTIONS DE CHARGEMENT
  // ===========================================

  /**
   * Charge tous les congés depuis la base de données
   */
  async function chargerConges() {
    try {
      const allConges = await window.electronAPI.getAllConges();
      
      if (Array.isArray(allConges)) {
        congesList = allConges.map(normalizeCongeData);
        
        // Vérification supplémentaire et recalcul des durées manquantes
        congesList.forEach((conge, index) => {
          if ((conge.dureeConge === null || conge.dureeConge === undefined || conge.dureeConge === 0) && 
              conge.dateDebut && conge.dateFin) {
            const debut = new Date(conge.dateDebut);
            const fin = new Date(conge.dateFin);
            
            if (!isNaN(debut) && !isNaN(fin) && fin >= debut) {
              const diffTime = fin.getTime() - debut.getTime();
              congesList[index].dureeConge = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              
              // Optionnel : Mettre à jour en base de données si nécessaire
              // await window.electronAPI.updateConge(congesList[index]);
            }
          }
        });
      } else {
        congesList = [];
      }
      
      updateFilterOptions();
      afficherConges();
      
    } catch (error) {
      showMessage(errorMessage, "Erreur lors du chargement des congés: " + error.message);
      console.error('Erreur chargement congés:', error);
      congesList = [];
    }
  }

  // ===========================================
  // INITIALISATION
  // ===========================================
  
  // Charger les données au démarrage
  chargerConges();
  
  // Ajouter un bouton pour annuler la modification
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Annuler';
  cancelBtn.style.display = 'none';
  cancelBtn.style.marginLeft = '10px';
  cancelBtn.addEventListener('click', resetForm);
  
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn && submitBtn.parentNode) {
    submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
  }
  
  // Montrer/cacher le bouton annuler selon le mode
  const originalReset = resetForm;
  resetForm = function() {
    originalReset();
    cancelBtn.style.display = 'none';
  };
  
  // Modifier la fonction remplirFormulaire pour montrer le bouton annuler
  const originalRemplir = remplirFormulaire;
  remplirFormulaire = function(conge) {
    originalRemplir(conge);
    cancelBtn.style.display = 'inline-block';
  };
});