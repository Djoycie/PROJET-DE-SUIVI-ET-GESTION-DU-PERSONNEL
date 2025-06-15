const form = document.getElementById('logForm');
const logsTableBody = document.getElementById('logsTableBody');

async function loadLogs() {
  const response = await window.auditAPI.getLogs();
  if (response.success) {
    logsTableBody.innerHTML = '';
    response.logs.forEach(log => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${log.id}</td>
        <td>${log.user_name} (ID: ${log.user_id})</td>
        <td>${log.user_role}</td>
        <td>${log.action_type}</td>
        <td>${log.action_description}</td>
        <td>${new Date(log.action_date).toLocaleString()}</td>
        <td>${log.module_name || ''}</td>
        <td>${log.ip_address || ''}</td>
      `;
      logsTableBody.appendChild(tr);
    });
  } else {
    alert('Erreur lors du chargement des logs : ' + response.error);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const log = {
    user_id: parseInt(document.getElementById('userId').value),
    user_name: document.getElementById('userName').value,
    user_role: document.getElementById('userRole').value,
    action_type: document.getElementById('actionType').value,
    action_description: document.getElementById('actionDescription').value,
    action_date: new Date().toISOString(),
    module_name: document.getElementById('moduleName').value,
    ip_address: document.getElementById('ipAddress').value || null
  };

  const response = await window.auditAPI.logAction(log);
  if (response.success) {
    form.reset();
    loadLogs();
  } else {
    alert('Erreur lors de l\'ajout du log : ' + response.error);
  }
});

// Chargement initial des logs
loadLogs();