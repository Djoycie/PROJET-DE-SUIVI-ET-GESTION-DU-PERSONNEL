document.addEventListener('DOMContentLoaded', async () => {
  // Générateur de matricule
  function generateMatricule() {
    return 'UFC' + Math.floor(1000 + Math.random() * 9000);
  }

  const addEmployeeForm = document.getElementById('add-employee-form');
  const employeeMatriculeInput = document.getElementById('employee-matricule');
  const employeePosteSelect = document.getElementById('employee-poste');
  const typeContratSelect = document.getElementById('employee-type-contrat');
  const dureeContratContainer = document.getElementById('duree-contrat-container');
  const dureeContratInput = document.getElementById('duree_contrat');

  // Afficher/masquer le champ durée du contrat selon le type de contrat
  typeContratSelect.addEventListener('change', function() {
    if (this.value === 'CDD') {
      dureeContratContainer.style.display = 'block';
      dureeContratInput.required = true;
    } else {
      dureeContratContainer.style.display = 'none';
      dureeContratInput.value = '';
      dureeContratInput.required = false;
    }
  });

  // Remplir la liste des postes dans le select
  async function loadPostesOptions() {
    employeePosteSelect.innerHTML = '';
    const postes = await window.electronAPI.getAllPostes();
    postes.forEach(poste => {
      const option = document.createElement('option');
      option.value = poste.id;
      option.textContent = poste.intitule;
      option.dataset.departement = poste.departement;
      employeePosteSelect.appendChild(option);
    });
    if (postes.length > 0) {
      document.getElementById('employee-departement').value = postes[0].departement;
    }
  }

  // Mettre à jour le département lors du changement de poste
  employeePosteSelect.addEventListener('change', async function() {
    const selectedId = this.value;
    const postes = await window.electronAPI.getAllPostes();
    const poste = postes.find(p => p.id === selectedId);
    document.getElementById('employee-departement').value = poste ? poste.departement : '';
  });

  // Fonction pour formater une date au format jj-mm-aaaa
  function formatDateFr(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  function formatDateForInput(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d)) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0'); // Mois de 0 à 11, donc +1
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

  // Affichage du tableau du personnel
  async function loadPersonnelTable(filterDept = '', filterPoste = '', filterTypeContrat = '', filterAgence = '') {
    const tableBody = document.querySelector('#table-personnel tbody');
    tableBody.innerHTML = '';
    const postes = await window.electronAPI.getAllPostes();
    const posteMap = {};
    postes.forEach(p => posteMap[p.id] = p.intitule);

    let personnel = await window.electronAPI.getAllEmployees();
    if (filterDept) personnel = personnel.filter(e => e.departement === filterDept);
    if (filterPoste) personnel = personnel.filter(e => e.poste === filterPoste);
    if (filterTypeContrat) personnel = personnel.filter(e => e.type_contrat === filterTypeContrat);
    if (filterAgence) personnel = personnel.filter(e => e.agence === filterAgence);

    for (const emp of personnel) {
      const posteIntitule = posteMap[emp.poste] || emp.poste;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${emp.matricule}</td>
        <td>${emp.nom}</td>
        <td>${emp.prenom}</td>
        <td>${formatDateFr(emp.date_naissance)}</td>
        <td>${emp.lieu_naissance}</td>
        <td>${emp.adresse}</td>
        <td>${emp.telephone}</td>
        <td>${emp.sexe}</td>
        <td>${emp.age}</td>
        <td>${posteIntitule}</td>
        <td>${emp.departement}</td>
        <td>${emp.agence}</td>
        <td>${emp.type_contrat}</td>
        <td>${emp.type_contrat === 'CDD' && emp.duree_contrat ? emp.duree_contrat + ' mois' : 'indeterminé'}</td>
        <td>${formatDateFr(emp.date_embauche)}</td>
        <td>
          <button class="edit-emp" data-id="${emp.matricule}">Modifier</button>
          <button class="delete-emp" data-id="${emp.matricule}">Supprimer</button>
        </td>
      `;
      // Ouvre la modale au clic sur la ligne (hors boutons)
      tr.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-emp') || e.target.classList.contains('delete-emp')) return;
        afficherModaleEmploye(emp, posteIntitule);
      });

      tableBody.appendChild(tr);
    }

    // Bouton Modifier
    document.querySelectorAll('.edit-emp').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const matricule = btn.dataset.id;
        const personnel = await window.electronAPI.getAllEmployees();
        const emp = personnel.find(e => e.matricule === matricule);
        if (!emp) return alert("Employé introuvable");

        addEmployeeForm.elements['employee-matricule'].value = emp.matricule;
        addEmployeeForm.elements.nom.value = emp.nom;
        addEmployeeForm.elements.prenom.value = emp.prenom;

        // Date au format yyyy-mm-dd pour input type="date"
        document.getElementById('employee-naissance').value =formatDateForInput(emp.date_naissance);
        addEmployeeForm.elements.age.value = emp.age;
        addEmployeeForm.elements.lieu_naissance.value = emp.lieu_naissance;
        addEmployeeForm.elements.adresse.value = emp.adresse;
        addEmployeeForm.elements.telephone.value = emp.telephone;
        addEmployeeForm.elements.sexe.value = emp.sexe;
        addEmployeeForm.elements.type_contrat.value = emp.type_contrat;

        if (emp.type_contrat === 'CDD') {
          dureeContratContainer.style.display = 'block';
          dureeContratInput.value = emp.duree_contrat || '';
          dureeContratInput.required = true;
        } else {
          dureeContratContainer.style.display = 'none';
          dureeContratInput.value = '';
          dureeContratInput.required = false;
        }

        addEmployeeForm.elements.poste.value = emp.poste;
        addEmployeeForm.elements.agence.value = emp.agence;
        addEmployeeForm.elements.departement.value = emp.departement;

        document.getElementById('employee-embauche').value = formatDateForInput(emp.date_embauche);

        addEmployeeForm.dataset.editing = "true";
      };
    });

    // Bouton Supprimer
    document.querySelectorAll('.delete-emp').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Voulez-vous vraiment supprimer cet employé ?")) return;
        const matricule = btn.dataset.id;
        const result = await window.electronAPI.deleteEmployee(matricule);
        if (result.success) {
          alert("Employé supprimé avec succès !");
          await loadPersonnelTable();
        } else {
          alert("Erreur : " + result.message);
        }
      };
    });
  }

  // Soumission du formulaire d’ajout/modification d’employé
  addEmployeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const posteId = addEmployeeForm.elements.poste.value;
    const typeContrat = addEmployeeForm.elements.type_contrat.value;
    const dureeContrat = typeContrat === 'CDD' ? addEmployeeForm.elements.duree_contrat.value : null;

    // Avant d'ajouter l'employé (dans le submit du formulaire)
    const nouveauMatricule = addEmployeeForm.elements['employee-matricule'].value;
    const allEmployees = await window.electronAPI.getAllEmployees();
    const existe = allEmployees.some(emp => emp.matricule === nouveauMatricule);

    // Si tu es en mode édition, autorise le matricule courant
    if (addEmployeeForm.dataset.editing !== "true" && existe) {
      alert("Ce matricule existe déjà. Veuillez en générer un autre.");
      return;
    }

    // Récupérer le poste sélectionné pour connaître le nombre de places restantes
    const postes = await window.electronAPI.getAllPostes();
    const poste = postes.find(p => p.id === posteId);

    // Compter le nombre d'employés déjà affectés à ce poste
    const count = await window.electronAPI.countEmployeesByPoste(posteId);
    const restantes = poste.places_desirees - count;

    const employee = {
      matricule: addEmployeeForm.elements['employee-matricule'].value,
      nom: addEmployeeForm.elements.nom.value.trim(),
      prenom: addEmployeeForm.elements.prenom.value.trim(),
      date_naissance: addEmployeeForm.elements['employee-naissance'].value,
      age: parseInt(addEmployeeForm.elements.age.value, 10),
      lieu_naissance: addEmployeeForm.elements.lieu_naissance.value.trim(),
      adresse: addEmployeeForm.elements.adresse.value.trim(), 
      telephone: addEmployeeForm.elements.telephone.value.trim(),
      sexe: addEmployeeForm.elements.sexe.value,
      type_contrat: typeContrat,
      duree_contrat: dureeContrat,
      poste: posteId,
      agence: addEmployeeForm.elements.agence.value.trim(),
      departement: addEmployeeForm.elements.departement.value.trim(),
      date_embauche: addEmployeeForm.elements['employee-embauche'].value
    };

    if (addEmployeeForm.dataset.editing === "true") {
      const result = await window.electronAPI.updateEmployee(employee);
      if (result.success) {
        alert("Employé modifié avec succès !");
        addEmployeeForm.reset();
        addEmployeeForm.dataset.editing = "";
        employeeMatriculeInput.value = generateMatricule();
        dureeContratContainer.style.display = 'none';
        dureeContratInput.required = false;
        await loadPersonnelTable();
      } else {
        alert("Erreur : " + result.message);
      }
      return;
    }

    if (restantes <= 0) {
      alert("Ce poste est déjà complet. Impossible d'ajouter un employé.");
      return;
    }

    const result = await window.electronAPI.addEmployee(employee);
    if (result.success) {
      alert("Employé ajouté !");
      addEmployeeForm.reset();
      employeeMatriculeInput.value = generateMatricule();
      dureeContratContainer.style.display = 'none';
      dureeContratInput.required = false;
      await loadPersonnelTable();
    } else {
      alert("Erreur : " + result.message);
    }
  });

  // Générer le matricule au chargement du formulaire
  employeeMatriculeInput.value = generateMatricule();

  // Recherche sur le personnel (si tu as un champ de recherche)
  if (document.getElementById('search-personnel')) {
    document.getElementById('search-personnel').addEventListener('input', function() {
      const val = this.value.toLowerCase();
      document.querySelectorAll('#table-personnel tbody tr').forEach(tr => {
        // On prend le contenu de la première cellule (matricule)
        const matricule = tr.querySelector('td') ? tr.querySelector('td').textContent.toLowerCase() : '';
        tr.style.display = matricule.includes(val) ? '' : 'none';
      });
    });
  }

  // Charger dynamiquement les options de filtre
  async function loadFilterOptions() {
    const departementSelect = document.getElementById('filter-departement');
    const posteSelect = document.getElementById('filter-poste');
    departementSelect.innerHTML = '<option value="">-- Tous les départements --</option>';
    posteSelect.innerHTML = '<option value="">-- Tous les postes --</option>';

    const postes = await window.electronAPI.getAllPostes();
    const depts = [...new Set(postes.map(p => p.departement))];
    depts.forEach(dep => {
      const opt = document.createElement('option');
      opt.value = dep;
      opt.textContent = dep;
      departementSelect.appendChild(opt);
    });
    postes.forEach(poste => {
      const opt = document.createElement('option');
      opt.value = poste.id;
      opt.textContent = poste.intitule;
      posteSelect.appendChild(opt);
    });

    // Ajout des options pour le type de contrat
    const typesContrat = ['CDI', 'CDD'];
    const selectTypeContrat = document.getElementById('filter-type-contrat');
    selectTypeContrat.innerHTML = '<option value="">Tous les types de contrat</option>';
    typesContrat.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      selectTypeContrat.appendChild(option);
    });

    const agenceSelect = document.getElementById('filter-agence');
    agenceSelect.innerHTML = '<option value="">-- Toutes les agences --</option>';
    const employees = await window.electronAPI.getAllEmployees();
    const agences = [...new Set(employees.map(e => e.agence))];
    agences.forEach(ag => {
      const option = document.createElement('option');
      option.value = ag;
      option.textContent = ag;
      agenceSelect.appendChild(option);
    });
  }

  // Listeners pour filtrer
  document.getElementById('filter-departement').addEventListener('change', async function() {
    await loadPersonnelTable(this.value, document.getElementById('filter-poste').value, document.getElementById('filter-type-contrat').value, document.getElementById('filter-agence').value);
  });
  document.getElementById('filter-poste').addEventListener('change', async function() {
    await loadPersonnelTable(document.getElementById('filter-departement').value, this.value, document.getElementById('filter-type-contrat').value, document.getElementById('filter-agence').value);
  });
  document.getElementById('filter-type-contrat').addEventListener('change', async function() {
    await loadPersonnelTable(document.getElementById('filter-departement').value, document.getElementById('filter-poste').value, this.value, document.getElementById('filter-agence').value);
  });
  document.getElementById('filter-agence').addEventListener('change', async function() {
    await loadPersonnelTable(document.getElementById('filter-departement').value, document.getElementById('filter-poste').value, document.getElementById('filter-type-contrat').value, this.value);
  });
  document.getElementById('reset-filters').addEventListener('click', async function() {
    document.getElementById('filter-departement').value = '';
    document.getElementById('filter-poste').value = '';
    document.getElementById('filter-type-contrat').value = '';
    document.getElementById('filter-agence').value = '';
    await loadPersonnelTable();
  });

  function afficherModaleEmploye(emp, posteIntitule) {
    const dateNaissance = formatDateFr(emp.date_naissance);
    const dateEmbauche = formatDateFr(emp.date_embauche);
    const html = `
      <h3>Détails de l'employé</h3>
      <div><b>Matricule :</b> ${emp.matricule}</div>
      <div><b>Nom :</b> ${emp.nom}</div>
      <div><b>Prénom :</b> ${emp.prenom}</div>
      <div><b>Date de naissance :</b> ${dateNaissance}</div>
      <div><b>Âge :</b> ${emp.age}</div>
      <div><b>Lieu de naissance :</b> ${emp.lieu_naissance}</div>
      <div><b>Adresse :</b> ${emp.adresse}</div>
      <div><b>Téléphone :</b> ${emp.telephone}</div>
      <div><b>Sexe :</b> ${emp.sexe}</div>
      <div><b>Type de contrat :</b> ${emp.type_contrat}</div>
      ${emp.type_contrat === 'CDD' && emp.duree_contrat ?
        `<div><b>Durée du contrat :</b> ${emp.duree_contrat} mois</div>` : ''}
      <div><b>Poste :</b> ${posteIntitule}</div>
      <div><b>Département :</b> ${emp.departement}</div>
      <div><b>Agence :</b> ${emp.agence}</div>
      <div><b>Date d'embauche :</b> ${dateEmbauche}</div>
    `;
    document.getElementById('modal-emp-body').innerHTML = html;
    document.getElementById('modal-emp-details').style.display = 'flex';
  }
 
  // Fermer la modale
  document.getElementById('close-modal-emp').onclick = function() {
    document.getElementById('modal-emp-details').style.display = 'none';
  };

  // Calcul de l'âge à partir de la date de naissance
  function calculerAge(dateNaissance) {
    const today = new Date();
    const naissance = new Date(dateNaissance);
    let age = today.getFullYear() - naissance.getFullYear();
    const m = today.getMonth() - naissance.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < naissance.getDate())) {
      age--;
    }
    return age < 0 ? 0 : age;
  }

  // Écouteur pour mettre à jour l'âge automatiquement lors du changement de date de naissance
  document.getElementById('employee-naissance').addEventListener('change', function() {
    const dateNaissance = this.value;
    if (dateNaissance) {
      const age = calculerAge(dateNaissance);
      document.getElementById('employee-age').value = age;
    } else {
      document.getElementById('employee-age').value = '';
    }
  });

  // Chargement initial
  await loadPostesOptions();
  await loadFilterOptions();
  await loadPersonnelTable();
});