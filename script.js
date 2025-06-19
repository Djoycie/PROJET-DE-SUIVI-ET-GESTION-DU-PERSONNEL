document.addEventListener('DOMContentLoaded', () => {
    console.log("[Renderer - script.js] Chargé et DOM prêt.");

    // --- PARTIE GESTION DE LA DÉCONNEXION ---
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            console.log("[Renderer - script.js] Déconnexion demandée.");
            window.electronAPI.logout();
        });
    } else {
        console.warn("[Renderer - script.js] Bouton de déconnexion (#logout-button) non trouvé.");
    }

    // --- PARTIE GESTION DES MODULES ET NAVIGATION (avec gestion des rôles) ---
    console.log("[Renderer - script.js] Tentative de récupération de 'currentUser' du localStorage.");
    const currentUserRaw = localStorage.getItem('currentUser');
    console.log("[Renderer - script.js] Valeur brute de 'currentUser' dans localStorage:", currentUserRaw);

    let currentUser = null;
    if (currentUserRaw) {
        try {
            currentUser = JSON.parse(currentUserRaw);
            console.log("[Renderer - script.js] 'currentUser' parsé avec succès:", currentUser);
            console.log("[Renderer - script.js] Rôle de l'utilisateur connecté:", currentUser.role);
        } catch (e) {
            console.error("[Renderer - script.js] Erreur de parsing JSON pour 'currentUser':", e);
            currentUser = null;
        }
    }

    if (!currentUser || !currentUser.role) {
        console.warn("[Renderer - script.js] Utilisateur non connecté ou rôle manquant. Redirection vers la page de connexion.");
        window.electronAPI.logout();
        return;
    }

    const moduleBlocks = document.querySelectorAll('.module-block');
    console.log(`[Renderer - script.js] ${moduleBlocks.length} blocs de module trouvés.`);

    const adminOnlyModules = [
        'analyse_cv',
        'audit',
        'sauvegarde',
        'parametres',
        'utilisateurs'
    ];
    const comptableOnlyModule = 'paie';
    const auditModule = 'journaux_audit'; // Nom exact du module journaux d'audit dans data-module

    moduleBlocks.forEach(block => {
        const moduleName = block.getAttribute('data-module');
        console.log(`[Renderer - script.js] Traitement du module: ${moduleName}`);

        if (currentUser.role === 'admin') {
            // Admin a accès à tous les modules
            block.classList.remove('blurred-module');
            block.removeAttribute('data-disabled');
            console.log(`[Renderer - script.js] Admin a accès au module ${moduleName}.`);
        } else if (currentUser.role === 'comptable') {
            // Comptable accès uniquement à paie
            if (moduleName !== comptableOnlyModule) {
                block.classList.add('blurred-module');
                block.setAttribute('data-disabled', 'true');
                console.log(`[Renderer - script.js] Floutage du module ${moduleName} pour comptable.`);
            } else {
                block.classList.remove('blurred-module');
                block.removeAttribute('data-disabled');
                console.log(`[Renderer - script.js] Module ${moduleName} accessible au comptable.`);
            }
        } else if (currentUser.role === 'rh') {
            // RH : bloque journaux d'audit + modules adminOnly
            if (moduleName === auditModule) {
                block.classList.add('blurred-module');
                block.setAttribute('data-disabled', 'true');
                console.log(`[Renderer - script.js] Blocage du module journaux d'audit pour RH.`);
            } else if (adminOnlyModules.includes(moduleName)) {
                block.classList.add('blurred-module');
                block.setAttribute('data-disabled', 'true');
                console.log(`[Renderer - script.js] Blocage du module adminOnly ${moduleName} pour RH.`);
            } else {
                block.classList.remove('blurred-module');
                block.removeAttribute('data-disabled');
                console.log(`[Renderer - script.js] Module ${moduleName} visible pour RH.`);
            }
        } else {
            // Autres rôles : bloquer modules adminOnly
            if (adminOnlyModules.includes(moduleName)) {
                block.classList.add('blurred-module');
                block.setAttribute('data-disabled', 'true');
                console.log(`[Renderer - script.js] Blocage du module adminOnly ${moduleName} pour rôle ${currentUser.role}.`);
            } else {
                block.classList.remove('blurred-module');
                block.removeAttribute('data-disabled');
                console.log(`[Renderer - script.js] Module ${moduleName} visible pour rôle ${currentUser.role}.`);
            }
        }

        if (block) {
            block.addEventListener('click', () => {
                if (block.getAttribute('data-disabled') === 'true') {
                    alert("Vous n'avez pas l'autorisation d'accéder à ce module.");
                    return;
                }
                const targetFileName = `${moduleName}.html`;
                window.electronAPI.loadModule(targetFileName);
            });
        }
    });
});