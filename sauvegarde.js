document.addEventListener('DOMContentLoaded', () => {
  const selectTable = document.getElementById('table-select');
  const container = document.getElementById('table-data-container');
  const searchInput = document.getElementById('search-input');
  const applyFilterBtn = document.getElementById('apply-filter-btn');
  const resetFilterBtn = document.getElementById('reset-filter-btn');

  let currentData = []; // données chargées actuellement
  let currentColumns = []; // colonnes affichées

  // Fonction pour afficher un message dans le container
  function afficherMessage(msg) {
    container.innerHTML = <p class="placeholder-text">${msg}</p>;
  }

 // Fonction utilitaire pour convertir une date ISO en jj/mm/aa
function formatDateJJMMAA(dateStr) {
  if (!dateStr) return '';
  // Tenter de parser la date
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr; // Si ce n’est pas une date valide, retourner tel quel
  const jour = String(d.getDate()).padStart(2, '0');
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const annee = String(d.getFullYear()).slice(-2);
  return `${jour}/${mois}/${annee}`;
}

function afficherTableau(data) {
  if (!data || data.length === 0) {
    afficherMessage('Aucune donnée à afficher.');
    return;
  }

  currentColumns = Object.keys(data[0]);
  const table = document.createElement('table');
  table.classList.add('data-table');

  // En-tête
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  currentColumns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  // Corps
  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');
    currentColumns.forEach(col => {
      const td = document.createElement('td');
      let val = row[col];

      // Conversion si la valeur ressemble à une date ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val)) {
        val = formatDateJJMMAA(val);
      }
      td.textContent = val !== null ? val : '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  // Remplacer le contenu du container
  container.innerHTML = '';
  container.appendChild(table);
}


  // Fonction pour charger les données d’une table via electronAPI
 async function chargerDonneesTable(tableName) {
    if (!tableName) {
        afficherMessage('Veuillez sélectionner une table.');
        return;
    }
    afficherMessage('Chargement des données...');
    try {
        const result = await window.electronAPI.getTableData(tableName);
        if (result.error) {
            // FIX: Use backticks (`) for template literals
            afficherMessage(`Erreur : ${result.error}`);
            return;
        }
        currentData = result;
        afficherTableau(currentData);
    } catch (err) {
        // FIX: Use backticks (`) for template literals
        afficherMessage(`Erreur inattendue : ${err.message}`);
    }
}

  // Gestion changement de sélection
  selectTable.addEventListener('change', () => {
    const tableName = selectTable.value;
    chargerDonneesTable(tableName);
    searchInput.value = '';
  });

  // Filtrer les données affichées selon la recherche
  applyFilterBtn.addEventListener('click', () => {
    const terme = searchInput.value.trim().toLowerCase();
    if (!terme) {
      afficherTableau(currentData);
      return;
    }
    const filtered = currentData.filter(row => {
      return currentColumns.some(col => {
        const val = row[col];
        return val !== null && val.toString().toLowerCase().includes(terme);
      });
    });
    afficherTableau(filtered);
  });

  // Réinitialiser le filtre
  resetFilterBtn.addEventListener('click', () => {
    searchInput.value = '';
    afficherTableau(currentData);
  });

  // Message initial
  afficherMessage('Veuillez sélectionner une table pour afficher ses données.');
});