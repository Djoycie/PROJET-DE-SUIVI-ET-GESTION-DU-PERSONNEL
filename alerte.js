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
// Convertit une date ISO (YYYY-MM-DD) en format jj/mm/aa
function formatDateJJMMAA(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const jour = String(d.getDate()).padStart(2, '0');
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const annee = String(d.getFullYear());
  return `${jour}/${mois}/${annee}`;
}

window.addEventListener('DOMContentLoaded', () => {
  chargerAlertes();

  // Rafraîchissement automatique toutes les 24h
  setInterval(chargerAlertes, 86400000);
});

function chargerAlertes() {
  window.electronAPI.getAlertes().then((alertes) => {
    afficherAnniversaires(alertes.anniversaires);
    afficherContratsCDD(alertes.contratsCDD);
    afficherPostes(alertes.postes);
    afficherStages(alertes.stagesFinissants);
    afficherNotification(alertes);
  }).catch(err => {
    console.error("Erreur récupération alertes :", err);
  });
}

function afficherAnniversaires(anniversaires) {
  const ul = document.getElementById('anniversaires-list');
  if (anniversaires.length === 0) {
    ul.innerHTML = '<li>Aucun anniversaire aujourd\'hui.</li>';
    return;
  }
  ul.innerHTML = '';
  anniversaires.forEach(emp => {
    ul.innerHTML += <li>${emp.prenom} ${emp.nom} - Né(e) le ${formatDateJJMMAA(emp.date_naissance)}</li>;
  });
}

function afficherContratsCDD(contrats) {
  const ul = document.getElementById('contrats-cdd-list');
  if (contrats.length === 0) {
    ul.innerHTML = '<li>Aucun contrat CDD proche d\'expiration.</li>';
    return;
  }
  ul.innerHTML = '';
  contrats.forEach(emp => {
    ul.innerHTML += <li class="alert-expiring">${emp.prenom} ${emp.nom} - Contrat expire le ${formatDateJJMMAA(emp.date_fin)}</li>;
  });
}

function afficherPostes(postes) {
  const ul = document.getElementById('postes-list');
  if (postes.length === 0) {
    ul.innerHTML = '<li>Tous les postes sont pleins.</li>';
    return;
  }
  ul.innerHTML = '';
  postes.forEach(poste => {
    ul.innerHTML += <li>${poste.intitule} - Places désirées : ${poste.places_desirees}</li>;
  });
}




function afficherStages(stages) {
  const ul = document.getElementById('stages-list');
  if (stages.length === 0) {
    ul.innerHTML = '<li>Aucun stage ne se termine dans les 7 prochains jours.</li>';
    return;
  }
  ul.innerHTML = '';
  stages.forEach(stage => {
    ul.innerHTML += <li class="alert-expiring">${stage.prenom_stagiaire} ${stage.nom_stagiaire} - Stage se termine le ${formatDateJJMMAA(stage.date_fin)}</li>;
  });
}

function afficherNotification(alertes) {
  const nbAlertes = alertes.anniversairesDemain.length + alertes.contratsCDD.length + alertes.stagesFinissants.length;

  // Supprimer ancienne notification s’il y en a
  const oldNotif = document.getElementById('notification-badge');
  if (oldNotif) oldNotif.remove();

  if (nbAlertes > 0) {
    const notif = document.createElement('div');
    notif.id = 'notification-badge';
    notif.textContent = nbAlertes;
    document.body.appendChild(notif);
  }
}