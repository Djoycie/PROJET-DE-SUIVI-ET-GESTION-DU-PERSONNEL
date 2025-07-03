// paie.js - Client-side logic for payroll management

document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;

async function initCurrentUser() {
    currentUser = await window.electronAPI.getCurrentUser();
    if (!currentUser) {
        alert("Session expirée, veuillez vous reconnecter.");
        window.location.href = "login.html";
    }
}
initCurrentUser();
    const paieForm = document.getElementById('paie-form');
    const matriculeSelect = document.getElementById('matricule');
    const displaySalaireBaseInput = document.getElementById('display_salaire_base'); // Champ pour afficher le salaire de base
    const periodeInput = document.getElementById('periode');
    const heuresSupInput = document.getElementById('heures_sup');
    const tauxMajorationSupInput = document.getElementById('taux_majoration_sup');
    const primesInput = document.getElementById('primes');
    const commissionsInput = document.getElementById('commissions');
    const avantagesNatureInput = document.getElementById('avantages_nature');
    const heuresAbsencesInput = document.getElementById('heures_absences');
    const maladieInput = document.getElementById('maladie');
    const retenuesInput = document.getElementById('retenues');
    const nombreDependantsInput = document.getElementById('nombre_dependants');
    const paieIdInput = document.getElementById('paie_id'); // Champ caché pour l'ID de paie

    const submitBtn = document.getElementById('submit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    const resultatPaieDiv = document.getElementById('resultat-paie');
    const historiqueTableBody = document.querySelector('#historique-table tbody');
    const searchMatriculeInput = document.getElementById('search-matricule');
    const filterPeriodeInput = document.getElementById('filter-periode');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const exportPdfBtn = document.getElementById('export-pdf');
    const noDataMessage = document.getElementById('no-data-message');

    let currentPaieHistory = []; // To store the currently displayed data for PDF export
    let allEmployees = []; // To store all loaded employees
    let editingPaieId = null; // To track the ID of the payroll entry being edited

    // --- Utility Functions ---

    /**
     * This function is deprecated as custom modal is removed.
     * It now acts as a fallback to Electron's native dialogs or browser alert.
     * @param {string} title - The title of the modal/alert.
     * @param {string} message - The message to display.
     * @param {string} type - 'alert' or 'confirm'.
     * @returns {Promise<boolean>} Resolves to true for 'confirm' if confirmed, false if cancelled/closed.
     */
    /**
 * This function is deprecated as custom modal is removed.
 * It now acts as a fallback to Electron's native dialogs or browser alert.
 * @param {string} title - The title of the modal/alert.
 * @param {string} message - The message to display.
 * @param {string} type - 'alert' or 'confirm'.
 * @returns {Promise<boolean>} Resolves to true for 'confirm' if confirmed, false if cancelled/closed.
 */
function showCustomModal(title, message, type = 'alert') {
    console.warn('showCustomModal is deprecated. Using Electron\'s native dialogs or browser alert.');
    if (window.electronAPI && typeof window.electronAPI.showMessageBox === 'function') {
        return window.electronAPI.showMessageBox({
            type: type === 'confirm' ? 'question' : 'info',
            title: title,
            message: message,
            buttons: type === 'confirm' ? ['OK', 'Annuler'] : ['OK']
        }).then(response => {
            return type === 'confirm' ? response.response === 0 : true; // 0 is 'OK'
        });
    } else {
        // Fallback for non-Electron environments or if API is not loaded
        if (type === 'confirm') {
            return Promise.resolve(confirm(`${title}\n\n${message}`));
        } else {
            alert(`${title}\n\n${message}`);
            return Promise.resolve(true);
        }
    }
}

/**
 * Displays a message in the result div.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'info'.
 */
function displayMessage(message, type) {
    if (resultatPaieDiv) {
        resultatPaieDiv.textContent = message;
        resultatPaieDiv.className = `message-box show ${type}`; // Add 'show' class to trigger animation
        // Hide after 5 seconds
        setTimeout(() => {
            resultatPaieDiv.classList.remove('show');
            resultatPaieDiv.textContent = '';
        }, 5000);
    } else {
        console.error("Element with ID 'resultat-paie' not found. Message: " + message);
        // Fallback to native alert if the display div is not found
        if (window.electronAPI && typeof window.electronAPI.showMessageBox === 'function') {
            window.electronAPI.showMessageBox({
                type: type === 'error' ? 'error' : 'info',
                title: 'Notification',
                message: message,
                buttons: ['OK']
            });
        } else {
            alert(message);
        }
    }
}

/**
 * Populates the employee dropdown from the database.
 */
async function populateEmployeeDropdown() {
    if (!window.electronAPI || typeof window.electronAPI.loadEmployees !== 'function') {
        console.error('Electron API (window.electronAPI) not available or loadEmployees not defined.');
        displayMessage('Erreur: L\'API Electron n\'est pas chargée correctement. Vérifiez preload.js et main.js.', 'error');
        return;
    }

    try {
        const employees = await window.electronAPI.loadEmployees();
        allEmployees = employees; // Store loaded employees
        if (matriculeSelect) {
            matriculeSelect.innerHTML = '<option value="">Sélectionner un employé</option>'; // Reset options
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.matricule;
                option.textContent = `${emp.matricule} - ${emp.nom} ${emp.prenom} (Salaire: ${(emp.salaire || 0).toLocaleString('fr-CM')} FCFA)`;
                matriculeSelect.appendChild(option);
            });
        } else {
            console.error("Element with ID 'matricule' not found.");
        }
    } catch (error) {
        console.error('Erreur lors du chargement des employés:', error);
        displayMessage('Impossible de charger la liste des employés.', 'error');
    }
}

/**
 * Loads and displays payroll history based on filters.
 */
async function loadPaieHistory() {
    if (!window.electronAPI || typeof window.electronAPI.loadPaieHistory !== 'function') {
        console.error('Electron API (window.electronAPI) not available or loadPaieHistory not defined.');
        displayMessage('Erreur: L\'API Electron n\'est pas chargée correctement. Vérifiez preload.js et main.js.', 'error');
        return;
    }

    function formatDateJJMMAA(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    }

    const filters = {
        searchQuery: searchMatriculeInput ? searchMatriculeInput.value.trim() : '',
        periode: filterPeriodeInput ? filterPeriodeInput.value : ''
    };

    try {
        const history = await window.electronAPI.loadPaieHistory(filters);
        currentPaieHistory = history; // Store for PDF export
        if (historiqueTableBody) {
            historiqueTableBody.innerHTML = ''; // Clear existing rows
        } else {
            console.error("Element with selector '#historique-table tbody' not found.");
            return;
        }

        if (history.length === 0) {
            if (noDataMessage) noDataMessage.style.display = 'block';
            return;
        } else {
            if (noDataMessage) noDataMessage.style.display = 'none';
        }

        history.forEach(entry => {
            const row = historiqueTableBody.insertRow();
            row.dataset.id = entry.id; // Store ID for deletion

            // Format numbers to FCFA
            const formatFCFA = (num) => num ? num.toLocaleString('fr-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }) : '0 FCFA';

            row.innerHTML = `
                <td>${entry.periode}</td>
                <td>${entry.matricule}</td>
                <td>${entry.nom} ${entry.prenom}</td>
                <td>${formatFCFA(entry.salaire_base)}</td>
                <td>${formatFCFA(entry.montant_heures_sup)}</td>
                <td>${formatFCFA(entry.primes)}</td>
                <td>${formatFCFA(entry.commissions)}</td>
                <td>${formatFCFA(entry.avantages_nature)}</td>
                <td>${formatFCFA(entry.absences)}</td>
                <td>${formatFCFA(entry.maladie)}</td>
                <td>${formatFCFA(entry.retenues_diverses)}</td>
                <td>${formatFCFA(entry.cnps_employee)}</td>
                <td>${formatFCFA(entry.irpp)}</td>
                <td>${formatFCFA(entry.taxe_communale)}</td>
                <td>${formatFCFA(entry.salaire_brut)}</td>
                <td>${formatFCFA(entry.salaire_net)}</td>
                <td>${formatDateJJMMAA(entry.date_paiement)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-info btn-sm print-payslip-btn" data-id="${entry.id}">Imprimer</button>
                        <button class="btn btn-success btn-sm download-payslip-pdf-btn" data-id="${entry.id}">Télécharger PDF</button>
                        <button class="btn btn-warning btn-sm edit-btn" data-id="${entry.id}">Modifier</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${entry.id}">Supprimer</button>
                    </div>
                </td>
            `;
        });
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique de paie:', error);
        displayMessage('Impossible de charger l\'historique des paiements.', 'error');
    }
}

/**
 * Generates the styled HTML content for a single payslip.
 * This HTML will be used by html2canvas and jspdf.
 * @param {Object} payslipData - The payslip data.
 * @returns {string} The HTML content.
 */
function generatePayslipHtml(payslipData) {
    const formatFCFA = (num) => num ? num.toLocaleString('fr-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }) : '0 FCFA';

    function formatDateJJMMAA(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    }
    // Note: The style is embedded directly for html2canvas to capture it.
    return `
        <div id="payslip-content" style="
            font-family: 'Inter', sans-serif; margin: 20px; font-size: 12px; line-height: 1.6; color: #333;
            width: 750px; /* Fixed width for A4 portrait export */
            padding: 20px;
            border: 1px solid #ccc;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            background-color: #fff;
        ">
            <h1 style="text-align: center; color: #2c3e50;">BULLETIN DE PAIE</h1>
            <h2 style="text-align: center; color: #2c3e50;">Période : ${payslipData.periode}</h2>

            <div style="margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
                <p style="margin: 5px 0;"><strong>Employeur :</strong> UFC SA</p>
                <p style="margin: 5px 0;"><strong>Adresse :</strong> Siege WARDA</p>
                <p style="margin: 5px 0;"><strong>N° Contribuable :</strong> [N° Contribuable]</p>
                <p style="margin: 5px 0;"><strong>N° CNPS :</strong> [N° CNPS Employeur]</p>
            </div>

            <div style="margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
                <p style="margin: 5px 0;"><strong>Matricule :</strong> ${payslipData.matricule}</p>
                <p style="margin: 5px 0;"><strong>Nom Complet :</strong> ${payslipData.nom} ${payslipData.prenom}</p>
                <p style="margin: 5px 0;"><strong>Poste :</strong> [Poste de l'employé]</p>
                <p style="margin: 5px 0;"><strong>Date de paiement :</strong> ${formatDateJJMMAA(payslipData.date_paiement)}</p>
            </div>

            <div style="margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
                <h3 style="margin-top: 0;">Éléments de Rémunération</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f8f8f8; font-weight: bold;">Désignation</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f8f8f8; font-weight: bold;">Montant (FCFA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Salaire de Base</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.salaire_base)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Heures Supplémentaires</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.montant_heures_sup)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Primes</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.primes)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Commissions</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.commissions)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Avantages en Nature</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.avantages_nature)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;"><strong>SALAIRE BRUT</strong></td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;"><strong>${formatFCFA(payslipData.salaire_brut)}</strong></td></tr>
                    </tbody>
                </table>
            </div>

            <div style="margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
                <h3 style="margin-top: 0;">Déductions et Retenues</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f8f8f8; font-weight: bold;">Désignation</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f8f8f8; font-weight: bold;">Montant (FCFA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Absences non rémunérées</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.absences)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Maladie</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.maladie)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Retenues diverses</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.retenues_diverses)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Cotisations CNPS (Salarié)</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.cnps_employee)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">IRPP</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.irpp)}</td></tr>
                        <tr><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Taxe Communale</td><td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${formatFCFA(payslipData.taxe_communale)}</td></tr>
                    </tbody>
                </table>
            </div>

            <div style="background-color: #e8f5e9; font-size: 1.2em; font-weight: bold; text-align: center; padding: 15px; border: 2px solid #4CAF50;">
                <p><strong>SALAIRE NET À PAYER : <span style="color: #2e7d32;">${formatFCFA(payslipData.salaire_net)}</span></strong></p>
            </div>

            <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #777;">
                Ce bulletin de paie est généré automatiquement .
                <br>
                Généré le ${new Date().toLocaleDateString('fr-CM')} à ${new Date().toLocaleTimeString('fr-CM')}
            </div>
        `;
}

/**
 * Generates and downloads a single payslip PDF using jspdf.
 * @param {Object} payslipData - The payslip data.
 */
async function downloadPayslipPdfWithJsPDF(payslipData) {
    displayMessage('Génération du PDF du bulletin de paie...', 'info');
    try {
        const htmlContent = generatePayslipHtml(payslipData);
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px'; // Hide it off-screen
        tempDiv.innerHTML = htmlContent;
        document.body.appendChild(tempDiv);

        const canvas = await html2canvas(tempDiv.querySelector('#payslip-content'), {
            scale: 2, // Increase scale for better quality
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4'); // Portrait, millimeters, A4 size
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const defaultFileName = `bulletin_paie_${payslipData.matricule}_${payslipData.periode}.pdf`;
        pdf.save(defaultFileName); // This triggers the download directly

        // Changed from alert to displayMessage for consistency
        displayMessage('Bulletin de paie PDF téléchargé avec succès !', 'success');
        document.body.removeChild(tempDiv); // Clean up temp div

    } catch (error) {
        console.error('Erreur lors du téléchargement du bulletin de paie PDF (jspdf):', error);
        // Changed from alert to displayMessage for consistency
        displayMessage(`Erreur lors du téléchargement du bulletin de paie PDF: ${error.message}`, 'error');
    }
}

/**
 * Generates and prints a single payslip using jspdf.
 * Opens a new window with the PDF content for printing.
 * @param {Object} payslipData - The payslip data.
 */
async function printPayslipWithJsPDF(payslipData) {
    displayMessage('Préparation de l\'impression du bulletin de paie...', 'info');
    try {
        const htmlContent = generatePayslipHtml(payslipData);
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px'; // Hide it off-screen
        tempDiv.innerHTML = htmlContent;
        document.body.appendChild(tempDiv);

        const canvas = await html2canvas(tempDiv.querySelector('#payslip-content'), {
            scale: 2, // Increase scale for better quality
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4'); // Portrait, millimeters, A4 size
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // Open the PDF in a new window/tab for printing
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl);
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
                URL.revokeObjectURL(pdfUrl); // Clean up the URL
            };
        } else {
            throw new Error("Impossible d'ouvrir la fenêtre d'impression. Veuillez autoriser les pop-ups.");
        }

        // Changed from alert to displayMessage for consistency
        displayMessage('Impression lancée avec succès.', 'success');
        document.body.removeChild(tempDiv); // Clean up temp div

    } catch (error) {
        console.error('Erreur lors de l\'impression du bulletin de paie (jspdf):', error);
        displayMessage(`Erreur lors de l\'impression du bulletin de paie: ${error.message}`, 'error');
    }
}
    /**
     * Generates and exports the full payroll history to PDF using jspdf.
     */
    async function exportFullReportPdfWithJsPDF() {
        displayMessage('Génération du PDF du rapport complet...', 'info');
        if (currentPaieHistory.length === 0) {
            displayMessage('Aucune donnée à exporter en PDF. Veuillez charger l\'historique d\'abord.', 'info');
            return;
        }

        try {
            const pdf = new jspdf.jsPDF('landscape', 'mm', 'a4'); // Landscape for full report
            const imgWidth = 297; // A4 landscape width in mm
            const pageHeight = 210; // A4 landscape height in mm

            // Create a temporary div to render the table for html2canvas
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px'; // Hide it off-screen
            tempDiv.style.width = '1100px'; // Give it enough width for landscape table
            tempDiv.innerHTML = `
                <h1 style="text-align: center; color: #2c3e50;">Rapport de Paie</h1>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 9px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Période</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Matricule</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Nom Complet</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Salaire Base</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Heures Sup (Montant)</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Primes</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Commissions</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Avantages Nature</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Absences</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Maladie</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Retenues</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">CNPS (Salarié)</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">IRPP</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Taxe Communale</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Salaire Brut</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Salaire Net</th>
                            <th style="border: 1px solid #ddd; padding: 4px; text-align: left; background-color: #f2f2f2;">Date Paiement</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${currentPaieHistory.map(entry => `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.periode}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.matricule}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.nom} ${entry.prenom}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.salaire_base.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.montant_heures_sup.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.primes.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.commissions.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.avantages_nature.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.absences.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.maladie.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.retenues_diverses.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.cnps_employee.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.irpp.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.taxe_communale.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.salaire_brut.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.salaire_net.toLocaleString('fr-CM')}</td>
                                <td style="border: 1px solid #ddd; padding: 4px; text-align: left;">${entry.date_paiement}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #555;">
                    Généré le ${new Date().toLocaleDateString('fr-CM')} à ${new Date().toLocaleTimeString('fr-CM')}
                </div>
            `;
            document.body.appendChild(tempDiv);

          const canvas = await html2canvas(tempDiv, { // Assuming tempDiv directly contains the report content
                scale: 1, // Full report might need lower scale for large tables
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const defaultFileName = `rapport_paie_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(defaultFileName); // This triggers the download directly

            displayMessage('Rapport PDF exporté avec succès !', 'success'); // Keep this, remove the alert() below
            document.body.removeChild(tempDiv); // Clean up temp div

        } catch (error) {
            console.error('Erreur lors de l\'exportation PDF du rapport complet (jspdf):', error);
            displayMessage(`Erreur lors de l\'exportation PDF du rapport complet: ${error.message}`, 'error'); // Use displayMessage
        }
    }


    // --- Event Listeners ---

    // Initial check for window.electronAPI availability before setting up all API-dependent listeners
    if (!window.electronAPI) {
        console.error('Electron API (window.electronAPI) is not available at DOMContentLoaded. Please ensure preload.js is correctly configured and loaded in main.js.'); // Removed 'error' as a separate argument to console.error, it's just part of the message.
        displayMessage('Erreur critique: L\'API Electron n\'est pas chargée. Certaines fonctionnalités de la paie seront indisponibles.', 'error'); // Use displayMessage
        // We do not return here, as some UI elements (like form inputs) might still be usable,
        // but any interaction requiring window.electronAPI will fail.
    }


    // Event listener for matricule selection change
    if (matriculeSelect) {
        matriculeSelect.addEventListener('change', () => {
            const selectedMatricule = matriculeSelect.value;
            if (selectedMatricule) {
                const selectedEmployee = allEmployees.find(emp => emp.matricule === selectedMatricule);
                if (selectedEmployee && displaySalaireBaseInput) {
                    // Use || 0 to ensure the value is a number
                    displaySalaireBaseInput.value = selectedEmployee.salaire || 0;
                } else if (displaySalaireBaseInput) {
                    displaySalaireBaseInput.value = ''; // Clear if employee not found (shouldn't happen)
                }
            } else if (displaySalaireBaseInput) {
                displaySalaireBaseInput.value = ''; // Clear if no employee is selected
            }
        });
    } else {
        console.error("Element with ID 'matricule' not found for event listener.");
    }


    // Form submission for calculating and saving payroll
    if (paieForm) {
        paieForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Check if Electron API is available
            if (!window.electronAPI || typeof window.electronAPI.calculateAndSavePaie !== 'function' || typeof window.electronAPI.updatePaieEntry !== 'function') {

                console.error('Electron API (window.electronAPI) not available or calculateAndSavePaie/updatePaieEntry not defined.');
                displayMessage('Erreur: L\'API Electron n\'est pas chargée correctement. Vérifiez preload.js et main.js.', 'error'); // Use displayMessage
                return;
            }

            const paieData = {
                matricule: matriculeSelect ? matriculeSelect.value : '',
                periode: periodeInput ? periodeInput.value : '',
                heures_sup: parseFloat(heuresSupInput ? heuresSupInput.value : '0') || 0,
                taux_majoration_sup: parseFloat(tauxMajorationSupInput ? tauxMajorationSupInput.value : '0') || 0,
                primes: parseFloat(primesInput ? primesInput.value : '0') || 0,
                commissions: parseFloat(commissionsInput ? commissionsInput.value : '0') || 0,
                avantages_nature: parseFloat(avantagesNatureInput ? avantagesNatureInput.value : '0') || 0,
                heures_absences: parseFloat(heuresAbsencesInput ? heuresAbsencesInput.value : '0') || 0, // Hours of absence
                maladie: parseFloat(maladieInput ? maladieInput.value : '0') || 0,
                retenues: parseFloat(retenuesInput ? retenuesInput.value : '0') || 0,
                nombre_dependants: parseFloat(nombreDependantsInput ? nombreDependantsInput.value : '0') || 0, // Number of dependents
            };

            if (!paieData.matricule || !paieData.periode) {
                displayMessage('Veuillez remplir tous les champs obligatoires (Matricule, Période).', 'error'); // Use displayMessage
                return;
            }

            let result;
            try {
                if (editingPaieId) {
                    // Update existing entry
                    paieData.id = editingPaieId; // Add ID for update
                    result = await window.electronAPI.updatePaieEntry(paieData);

                    let currentUser = window.currentUser;
                    if (!currentUser) {
                        currentUser = await window.electronAPI.getCurrentUser();
                    }
                    await window.electronAPI.logAuditEvent({
                        userId: currentUser.username,
                        actionType: 'UPDATE',
                        module: 'Paie',
                        targetId: paieData.id.toString(),
                        details: `Modification paie id ${paieData.id}`
                    });

                } else {
                    // Save new entry
                    result = await window.electronAPI.calculateAndSavePaie(paieData);

                    let currentUser = window.currentUser;
                    if (!currentUser) {
                        currentUser = await window.electronAPI.getCurrentUser();
                    }
                    await window.electronAPI.logAuditEvent({
                        userId: currentUser.username, // Ajoute userId dans paieData côté frontend
                        actionType: 'CREATE',
                        targetId: result.insertId,
                        module: 'Paie',
                        details: `Ajout paie pour ${paieData.matricule} période ${paieData.periode}`
                    });

                }

                if (result.success) {
                    displayMessage(result.message, 'success');
                    resetFormAndEditMode(); // Reset form and exit edit mode
                    loadPaieHistory(); // Refresh history table
                } else {
                    displayMessage(result.message, 'error');
                }
            } catch (error) {
                console.error('Erreur lors de la soumission du formulaire de paie:', error);
                displayMessage('Une erreur inattendue est survenue lors du calcul/mise à jour de la paie.', 'error');
            }
        });
    } else {
        console.error("Element with ID 'paie-form' not found for event listener.");
    }

    /**
     * Resets the form and exits edit mode.
     */
    function resetFormAndEditMode() {
        paieForm.reset();
        if (displaySalaireBaseInput) displaySalaireBaseInput.value = '';
        editingPaieId = null;
        if (paieIdInput) paieIdInput.value = ''; // Clear hidden ID field
        if (submitBtn) submitBtn.textContent = 'Calculer & Enregistrer';
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';
        // Scroll to top of the page after reset
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Event listener for "Annuler Modification" button
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetFormAndEditMode);
    }


    // Event delegation for delete, print, download, and edit buttons in the history table
    // This listener is attached ONCE, outside of loadPaieHistory()
    if (historiqueTableBody) {
        historiqueTableBody.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (!id) {
                return; // Not a button with an ID
            }

            const payslipData = currentPaieHistory.find(entry => entry.id === parseInt(id));
            if (!payslipData) {
                displayMessage('Données du bulletin de paie introuvables.', 'error'); // Use displayMessage
                return;
            }

            if (e.target.classList.contains('delete-btn')) {
                // Check if Electron API is available
                if (!window.electronAPI || typeof window.electronAPI.deletePaieEntry !== 'function' || typeof window.electronAPI.confirmDeletion !== 'function') {
                    console.error('Electron API (window.electronAPI) not available or delete functions not defined.');
                    displayMessage('Erreur: L\'API Electron n\'est pas chargée correctement. Impossible de supprimer.', 'error');
                    return;
                }

                const confirmed = await window.electronAPI.confirmDeletion(
                    `Êtes-vous sûr de vouloir supprimer l'entrée de paie ID ${id} pour ${payslipData.nom} ${payslipData.prenom} (${payslipData.periode}) ? Cette action est irréversible.`
                );

                if (confirmed) {
                    try {
                        const result = await window.electronAPI.deletePaieEntry(parseInt(id));
                        if (result.success) {
                            let currentUser = window.currentUser;
                            if (!currentUser) {
                                currentUser = await window.electronAPI.getCurrentUser();
                            }
                            await window.electronAPI.logAuditEvent({
                                userId: currentUser.username, // Ajoute userId dans paieData côté frontend
                                actionType: 'DELETE',
                                targetId: id.toString(),
                                module: 'Paie',
                                details: `Suppression paie id ${id}`
                            });

                            displayMessage(result.message, 'success');
                            loadPaieHistory(); // Refresh history table
                        } else {
                            displayMessage(result.message, 'error');
                        }
                    } catch (error) {
                        console.error('Erreur lors de la suppression de l\'entrée de paie:', error);
                        displayMessage('Une erreur inattendue est survenue lors de la suppression.', 'error');
                    }
                } else {
                    displayMessage('Suppression annulée.', 'info'); // Use displayMessage
                }
            } else if (e.target.classList.contains('print-payslip-btn')) {
                // Use jspdf for printing
                printPayslipWithJsPDF(payslipData);
            } else if (e.target.classList.contains('download-payslip-pdf-btn')) {
                // Use jspdf for downloading
                downloadPayslipPdfWithJsPDF(payslipData);
            } else if (e.target.classList.contains('edit-btn')) {
                // Handle edit button click
                editingPaieId = parseInt(id);
                if (paieIdInput) paieIdInput.value = editingPaieId; // Set hidden ID field

                // Populate the form with payslipData
                if (matriculeSelect) matriculeSelect.value = payslipData.matricule;
                if (displaySalaireBaseInput) displaySalaireBaseInput.value = payslipData.salaire_base; // Display the base salary from the entry
                if (periodeInput) periodeInput.value = payslipData.periode;
                if (heuresSupInput) heuresSupInput.value = payslipData.heures_sup;
                if (tauxMajorationSupInput) tauxMajorationSupInput.value = payslipData.taux_majoration_sup;
                if (primesInput) primesInput.value = payslipData.primes;
                if (commissionsInput) commissionsInput.value = payslipData.commissions;
                if (avantagesNatureInput) avantagesNatureInput.value = payslipData.avantages_nature;
                // Convert amount back to hours for 'heures_absences'
                const tauxHoraire = payslipData.salaire_base / 173.33;
                if (heuresAbsencesInput) heuresAbsencesInput.value = payslipData.absences / (tauxHoraire || 1); // Avoid division by zero
                if (maladieInput) maladieInput.value = payslipData.maladie;
                if (retenuesInput) retenuesInput.value = payslipData.retenues_diverses;
                // Note: nombre_dependants is not stored in DB, so it won't be pre-filled from DB.
                // It will revert to default 0 unless you store it in the 'paie' table.
                if (nombreDependantsInput) nombreDependantsInput.value = 0; // Or fetch from personnel table if available

                // Change submit button text and show cancel button
                if (submitBtn) submitBtn.textContent = 'Mettre à jour';
                if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';

                // Scroll to the form section for easier editing
                if (paieForm) paieForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    } else {
        console.error("Element with selector '#historique-table tbody' not found for event listener.");
    }


    // Filter and search event listeners
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', loadPaieHistory);
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (searchMatriculeInput) searchMatriculeInput.value = '';
            if (filterPeriodeInput) filterPeriodeInput.value = '';
            loadPaieHistory(); // Reload with no filters
        });
    }


    // Export PDF button (for full history)
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async () => {
            // Use jspdf for full report export
            exportFullReportPdfWithJsPDF();
        });
    } else {
        console.error("Element with ID 'export-pdf' not found for event listener.");
    }


    // Remove old listeners for PDF export completion or error from main process
    // These are no longer needed as jspdf handles it client-side
    // try {
    //      if (window.electronAPI && typeof window.electronAPI.onPdfExportComplete === 'function') {
    //          window.electronAPI.onPdfExportComplete((filePath) => {
    //              displayMessage(`Rapport PDF exporté avec succès vers : ${filePath}`, 'success');
    //          });
    //      } else {
    //          console.error('Electron API (window.electronAPI.onPdfExportComplete) not available or not a function.');
    //      }

    //      if (window.electronAPI && typeof window.electronAPI.onPdfExportError === 'function') {
    //          window.electronAPI.onPdfExportError((error) => {
    //              displayMessage(`Erreur lors de l'exportation PDF : ${error}`, 'error');
    //          });
    //      } else {
    //          console.error('Electron API (window.electronAPI.onPdfExportError) not available or not a function.');
    //      }

    //      if (window.electronAPI && typeof window.electronAPI.onPrintPayslipComplete === 'function') {
    //          window.electronAPI.onPrintPayslipComplete((message) => {
    //              displayMessage(message, 'success');
    //          });
    //      }
    //      if (window.electronAPI && typeof window.electronAPI.onPrintPayslipError === 'function') {
    //          window.electronAPI.onPrintPayslipError((error) => {
    //              displayMessage(error, 'error');
    //          });
    //      }
    //      if (window.electronAPI && typeof window.electronAPI.onDownloadPayslipPdfComplete === 'function') {
    //          window.electronAPI.onDownloadPayslipPdfComplete((filePath) => {
    //              displayMessage(`Bulletin de paie PDF téléchargé avec succès vers : ${filePath}`, 'success');
    //          });
    //      }
    //      if (window.electronAPI && typeof window.electronAPI.onDownloadPayslipPdfError === 'function') {
    //          window.electronAPI.onDownloadPayslipPdfError((error) => {
    //              displayMessage(`Erreur lors du téléchargement du bulletin de paie PDF : ${error}`, 'error');
    //          });
    //      }

    // } catch (e) {
    //      console.error('Erreur lors de la configuration des écouteurs PDF/Impression:', e);
    //      displayMessage('Erreur lors de la configuration des notifications d\'exportation PDF/Impression.', 'error');
    // }


    // Initial data load
    populateEmployeeDropdown();
    loadPaieHistory();
});