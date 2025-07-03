window.addEventListener('DOMContentLoaded', async () => {
    // Remplir le filtre utilisateur
    const users = await window.electronAPI.getAllUsers();
    const userFilter = document.getElementById('userFilter');
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        // CORRECTION ICI : Utilisez les backticks (`)
        option.textContent = `${user.fullName} (${user.role})`;
        userFilter.appendChild(option);
    });
 
    // Charger les logs au chargement
    await loadAuditLogs();

    // Ajoutez les écouteurs sur les filtres pour recharger les logs
    document.getElementById('userFilter').addEventListener('change', loadAuditLogs);
    document.getElementById('actionFilter').addEventListener('change', loadAuditLogs);
    document.getElementById('moduleFilter').addEventListener('change', loadAuditLogs);
    document.getElementById('dateFrom').addEventListener('change', loadAuditLogs);
    document.getElementById('dateTo').addEventListener('change', loadAuditLogs);

    // Assurez-vous que les boutons d'action sont bindés
    document.getElementById('filterLogsBtn')?.addEventListener('click', filterLogs);
    document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);
    document.getElementById('exportLogsBtn')?.addEventListener('click', exportLogs);
    document.getElementById('printLogsBtn')?.addEventListener('click', printLogs);
    document.getElementById('downloadPdfBtn')?.addEventListener('click', downloadPDF);
    document.getElementById('deleteAllLogsBtn')?.addEventListener('click', deleteAllLogs);
});

async function loadAuditLogs() {
    const filters = {
        userId: document.getElementById('userFilter').value,
        actionType: document.getElementById('actionFilter').value,
        module: document.getElementById('moduleFilter').value,
        dateFrom: document.getElementById('dateFrom').value,
        dateTo: document.getElementById('dateTo').value
    };
    const logs = await window.electronAPI.getAuditLogs(filters);

    // Statistiques dynamiques
    updateStats(logs);

    // Affichage du tableau
    renderLogs(logs);
}

function updateStats(logs) {
    // Total activités
    document.getElementById('totalLogs').textContent = logs.length;

    // Aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparer seulement la date
    const logsToday = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= today;
    });
    document.getElementById('todayLogs').textContent = logsToday.length;

    // Utilisateurs actifs (distincts)
    const activeUsers = new Set(logs.map(log => log.user_id));
    document.getElementById('activeUsers').textContent = activeUsers.size;

    // Actions critiques (DELETE, ACCESS_DENIED, etc.)
    const criticalActions = logs.filter(log =>
        ['DELETE', 'ACCESS_DENIED', 'ERROR'].includes(log.action_type) // Ajout de 'ERROR' comme action critique potentielle
    );
    document.getElementById('criticalActions').textContent = criticalActions.length;
}

function renderLogs(logs) {
    const logsContainer = document.getElementById('logsContainer');
    if (!logs.length) {
        logsContainer.innerHTML = '<div class="no-logs"><p>Aucun journal d\'audit trouvé.</p></div>';
        return;
    }
    let html = `
        <table class="logs-table">
            <thead>
                <tr>
                    <th>Date/Heure</th>
                    <th>Utilisateur</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Détails</th>
                    <th>Supprimer</th>
                </tr>
            </thead>
            <tbody>
    `;
    logs.forEach(log => {
        html += `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                <td>${log.user_id}</td>
                <td>${log.action_type}</td>
                <td>${log.module}</td>
                <td>${log.details || '-'}</td>
                <td>
                    <button class="btn btn-danger btn-delete-log" data-id="${log.id}" title="Supprimer ce log">🗑</button>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    logsContainer.innerHTML = html;

    // Ajout des écouteurs sur les boutons supprimer
    document.querySelectorAll('.btn-delete-log').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const logId = btn.dataset.id;
            if (confirm("Voulez-vous vraiment supprimer ce log d'audit ? Cette action est irréversible.")) {
                const result = await window.electronAPI.deleteAuditLog(logId);
                if (result.success) {
                    alert("Log supprimé !");
                    await loadAuditLogs();
                } else {
                    alert("Erreur lors de la suppression du log : " + (result.message || "Erreur inconnue"));
                }
            }
        });
    });
}

// Optionnel : fonctions pour filtrer/réinitialiser/exporter/actualiser
// J'ai renommé filterLogs pour correspondre à un bouton séparé si vous en avez un.
// Si vous comptez sur les `change` events des selects, vous n'avez pas besoin de l'appeler explicitement.
function filterLogs() {
    loadAuditLogs();
}

function resetFilters() {
    document.getElementById('userFilter').value = '';
    document.getElementById('actionFilter').value = '';
    document.getElementById('moduleFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    loadAuditLogs(); // Recharger les logs après réinitialisation des filtres
}

function exportLogs() {
    const logsTable = document.querySelector('.logs-table');
    if (!logsTable) {
        alert("Aucun log à exporter."); // Message si le tableau n'existe pas
        return;
    }
    let csv = '';
    // Ajout des en-têtes de colonnes au CSV
    const headers = Array.from(logsTable.querySelectorAll('thead th')).map(th => `"${th.textContent.replace(/"/g, '""')}"`);
    csv += headers.join(';') + '\n';

    logsTable.querySelectorAll('tbody tr').forEach(row => {
        // Exclure la colonne des boutons d'action si elle n'est pas pertinente pour l'export
        const cols = Array.from(row.querySelectorAll('td')).slice(0, -1).map(td => `"${td.textContent.replace(/"/g, '""')}"`);
        csv += cols.join(';') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); // Spécifier l'encodage
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit_logs.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function printLogs() {
    const logsTable = document.querySelector('.logs-table');
    if (!logsTable) {
        alert("Aucun log à imprimer."); // Message si le tableau n'existe pas
        return;
    }
    const printWindow = window.open('', '', 'width=900,height=700');
    printWindow.document.write('<html><head><title>Impression Journaux d\'Audit</title>');
    printWindow.document.write('<style>' +
        'body{font-family: Arial, sans-serif; margin: 20px;}'+
        'h1{text-align: center; color: #333;}'+
        '.logs-table{width:100%;border-collapse:collapse;font-size:0.9em; margin-top: 20px;}'+
        '.logs-table th,.logs-table td{padding:0.7em 1em;border:1px solid #e0e0e0;text-align:left;}'+
        '.logs-table th{background:#f7f7f7; font-weight: bold;}' +
        '.logs-table tbody tr:nth-child(even){background:#f9f9f9;}' +
        '.logs-table .btn-delete-log { display: none; }' + // Masque le bouton supprimer à l'impression
        '</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Journaux d\'Audit</h1>'); // Ajout d'un titre pour l'impression
    printWindow.document.write(logsTable.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

function downloadPDF() {
    // Vérifiez que jsPDF est chargé avant d'essayer de l'utiliser
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        alert("La bibliothèque jsPDF n'est pas chargée. Impossible d'exporter en PDF.");
        console.error("jsPDF est introuvable. Avez-vous inclus le script dans votre HTML ?");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }); // Précisez l'unité et le format
    doc.setFontSize(14);
    doc.text("Journaux d'Audit", 14, 15);

    const logsTable = document.querySelector('.logs-table');
    if (!logsTable) {
        alert("Aucun log à exporter en PDF.");
        return;
    }

    // Utilisation de jspdf-autotable pour une meilleure gestion des tableaux
    // Assurez-vous d'avoir inclus la bibliothèque jspdf-autotable dans votre HTML
    // <script src="https://unpkg.com/jspdf-autotable@3.5.16/dist/jspdf.plugin.autotable.js"></script>

    const head = Array.from(logsTable.querySelectorAll('thead th')).map(th => th.textContent);
    // Exclure la colonne "Supprimer" de l'export PDF
    const filteredHead = head.filter(header => header !== 'Supprimer');

    const body = Array.from(logsTable.querySelectorAll('tbody tr')).map(tr => {
        // Exclure la dernière colonne (bouton Supprimer) du corps du tableau
        const rowData = Array.from(tr.querySelectorAll('td')).slice(0, -1).map(td => td.textContent);
        return rowData;
    });

    doc.autoTable({
        head: [filteredHead],
        body: body,
        startY: 25,
        theme: 'striped', // Ou 'grid', 'plain'
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [200, 200, 200] },
        margin: { top: 20, left: 10, right: 10, bottom: 10 },
        // Ajout d'une colonne de numéro de ligne si désiré
        // didDrawCell: (data) => {
        //     if (data.section === 'body' && data.column.index === 0) {
        //         doc.text(data.row.index + 1, data.cell.x + 2, data.cell.y + data.cell.height / 2);
        //     }
        // }
    });

    doc.save('audit_logs.pdf');
}

async function deleteAllLogs() {
    if (!confirm("Voulez-vous vraiment supprimer TOUS les logs d'audit ? Cette action est irréversible !")) return;
    const result = await window.electronAPI.deleteAllAuditLogs();
    if (result.success) {
        alert("Tous les logs ont été supprimés !");
        await loadAuditLogs();
    } else {
        alert("Erreur lors de la suppression des logs : " + (result.message || "Erreur inconnue"));
    }
}