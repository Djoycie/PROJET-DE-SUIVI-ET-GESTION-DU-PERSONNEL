document.getElementById('download-filtered-pdf').onclick = async function() {
  // Récupère les valeurs des filtres
  const filterDept = document.getElementById('filter-departement').value;
  const filterPoste = document.getElementById('filter-poste').value;

  // Récupère la liste du personnel et des postes
  let personnel = await window.electronAPI.getAllEmployees();
  const postes = await window.electronAPI.getAllPostes();
  const posteMap = {};
  postes.forEach(p => posteMap[p.id] = p.intitule);

  // Applique les filtres
  if (filterDept) personnel = personnel.filter(e => e.departement === filterDept);
  if (filterPoste) personnel = personnel.filter(e => e.poste === filterPoste);
if (filterTypeContrat) 
    personnel = personnel.filter(e => e.type_contrat === filterTypeContrat);
  
  // Prépare les données pour le PDF
  const rows = personnel.map(emp => [
    emp.matricule,
    emp.nom,
    emp.prenom,
    posteMap[emp.poste] || emp.poste,
    emp.departement,
    emp.date_naissance,
    emp.age,
    emp.lieu_naissance,
    emp.sexe,
    emp.type_contrat,
    emp.date_embauche,
    emp.duree_contrat
  ]);

  // Génère le PDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });
  let titre = "Liste du personnel";
  if (filterDept) titre += " - Département : " + filterDept;
  if (filterPoste) titre += " - Poste : " + (posteMap[filterPoste] || filterPoste);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor("#1a77d2");
  doc.text(titre, 40, 40);

  // Tableau stylisé
  doc.autoTable({
    head: [[
      "Matricule", "Nom", "Prénom", "Poste", "Département",
      "Date de naissance", "Âge", "Lieu de naissance", "Sexe", "Type de contrat", "duree du contrat", "Date d'embauche"
    ]],
    body: rows,
    startY: 60,
    styles: {
      font: "helvetica",
      fontSize: 11,
      cellPadding: 6,
      valign: "middle"
    },
    headStyles: {
      fillColor: [26, 119, 210],
      textColor: 255,
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [240, 248, 255]
    },
    rowPageBreak: 'avoid'
  });

  // Pied de page
  doc.setFontSize(10);
  doc.setTextColor("#888");
  doc.text("Document généré le : " + new Date().toLocaleString(), 40, doc.internal.pageSize.height - 20);
  doc.save("liste_personnel.pdf");
};

document.getElementById('download-emp-pdf').onclick = function() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const contenu = document.getElementById('modal-emp-body').innerText;
  doc.text(contenu, 10, 10);
  doc.save("fiche_employe.pdf");
};

document.getElementById('print-emp').onclick = function() {
   const filterDept = document.getElementById('filter-departement').value;
  const filterPoste = document.getElementById('filter-poste').value;
  const typeContratSelect = document.getElementById('employee-type-contrat');
  const contenu = document.getElementById('modal-emp-body').innerHTML;
  const win = window.open('', '', 'width=800,height=600');
  // Applique le filtre
  if (filterDept) personnel = personnel.filter(e => e.departement === filterDept);
  if (filterPoste) personnel = personnel.filter(e => e.poste === filterPoste);
  win.document.write('<html><head><title>Impression fiche employé</title></head><body>');
  win.document.write(contenu);
  win.document.write('</body></html>');
  win.document.close();
  win.print();
};

document.getElementById('print-emp2').onclick = async function() {
  // Récupère la valeur du filtre (exemple : département)
  const filterDept = document.getElementById('filter-departement').value;
  const filterPoste = document.getElementById('filter-poste').value;
  const filterTypeContrat = document.getElementById('employee-type-contrat');

  // Récupère la liste du personnel et des postes
  let personnel = await window.electronAPI.getAllEmployees();
  const postes = await window.electronAPI.getAllPostes();
  const posteMap = {};
  postes.forEach(p => posteMap[p.id] = p.intitule);

  // Applique le filtre
  if (filterDept) personnel = personnel.filter(e => e.departement === filterDept);
  if (filterPoste) personnel = personnel.filter(e => e.poste === filterPoste);
  
  // Génère le tableau HTML structuré
  let contenu = `
    <h2 style="text-align:center;">Liste du personnel${filterDept ? ' - Département : ' + filterDept : '' }  </h2>
    <table style="width:100%;border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="border:1px solid #ccc;padding:8px;">Matricule</th>
          <th style="border:1px solid #ccc;padding:8px;">Nom</th>
          <th style="border:1px solid #ccc;padding:8px;">Prénom</th>
          <th style="border:1px solid #ccc;padding:8px;">date de naissance</th>
          <th style="border:1px solid #ccc;padding:8px;">lieu de naissance</th>
          <th style="border:1px solid #ccc;padding:8px;">sexe</th>
          <th style="border:1px solid #ccc;padding:8px;">age</th>
          <th style="border:1px solid #ccc;padding:8px;">type de contrat</th>
          <th style="border:1px solid #ccc;padding:8px;">duree du contrat</th>
          <th style="border:1px solid #ccc;padding:8px;">Poste</th>
          <th style="border:1px solid #ccc;padding:8px;">Département</th>
          <th style="border:1px solid #ccc;padding:8px;">Date d'embauche</th>
        </tr>
      </thead>
      <tbody>
  `;

  personnel.forEach(emp => {
    contenu += `
      <tr>
        <td style="border:1px solid #ccc;padding:8px;">${emp.matricule}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.nom}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.prenom}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.date_naissance}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.lieu_naissance}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.sexe}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.age}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.type_contrat}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.type_contrat === 'CDD' && emp.duree_contrat ? emp.duree_contrat + ' mois' : 'indeterminé'}</td>
        <td style="border:1px solid #ccc;padding:8px;">${posteMap[emp.poste] || emp.poste}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.departement}</td>
        <td style="border:1px solid #ccc;padding:8px;">${emp.date_embauche}</td>

      </tr>
    `;
  });

  contenu += `
      </tbody>
    </table>
  `;

  // Ouvre une nouvelle fenêtre pour impression
  const win = window.open('', '', 'width=900,height=700');
  win.document.write('<html><head><title>Liste du personnel</title></head><body>');
  win.document.write(contenu);
  win.document.write('</body></html>');
  win.document.close();
  win.print();
};


function genererFicheCongePDF(conge) {
  // Utilisation de jsPDF
  const { jsPDF } = window.jspdf; // ou import { jsPDF } from "jspdf" en module
  const doc = new jsPDF();

  // Titre
  doc.setFontSize(18);
  doc.text("Fiche de Demande de Congé", 105, 20, { align: "center" });

  doc.setFontSize(12);
  let y = 35;

  // Infos employé
  doc.text(`Matricule : ${conge.matricule || ''}`, 20, y);
  y += 8;
  doc.text(`Nom : ${conge.nom || ''}`, 20, y);
  y += 8;
  doc.text(`Prénom : ${conge.prenom || ''}`, 20, y);
  y += 8;
  doc.text(`Poste : ${conge.poste || ''}`, 20, y);
  y += 8;
  doc.text(`Département : ${conge.departement || ''}`, 20, y);
  y += 8;
  doc.text(`Type de congé : ${conge.typeConge || ''}`, 20, y);
  y += 8;
  doc.text(`Date début : ${conge.dateDebut || ''}`, 20, y);
  y += 8;
  doc.text(`Date fin : ${conge.dateFin || ''}`, 20, y);
  y += 8;
  doc.text(`Durée : ${conge.dureeConge || ''} jours`, 20, y);
  y += 8;
  doc.text(`Commentaires : ${conge.commentaires || ''}`, 20, y);
  y += 16;

  // Signatures
  const today = new Date().toLocaleDateString('fr-FR');
  doc.setFontSize(12);
  doc.text("Signature de l'employé", 20, y);
  doc.text("Signature du chef de département", 80, y);
  doc.text("Signature de la DRH", 150, y);
  y += 25;
  doc.setFontSize(10);
  doc.text(`Date : ${today}`, 20, y);
  doc.text(`Date : ${today}`, 80, y);
  doc.text(`Date : ${today}`, 150, y);

  // Sauvegarde
  doc.save(`fiche_conge_${conge.matricule || 'employe'}.pdf`);
}
