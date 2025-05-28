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
            currentUser = null; // Réinitialise currentUser en cas d'erreur de parsing
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
    console.log("[Renderer - script.js] Modules réservés aux admins:", adminOnlyModules);

    moduleBlocks.forEach(block => {
        const moduleName = block.getAttribute('data-module');
        console.log(`[Renderer - script.js] Traitement du module: ${moduleName}`);

        if (adminOnlyModules.includes(moduleName)) {
            console.log(`[Renderer - script.js] Module ${moduleName} est réservé aux admins.`);
            if (currentUser.role !== 'admin') {
                block.classList.add('hidden-module');
                console.log(`[Renderer - script.js] Masquage du module ${moduleName} pour l'utilisateur avec rôle '${currentUser.role}'.`);
            } else {
                console.log(`[Renderer - script.js] Affichage du module ${moduleName} pour l'admin.`);
            }
        } else {
            console.log(`[Renderer - script.js] Module ${moduleName} visible pour tous.` );
        }

        if (block) {
            block.addEventListener('click', () => {
                if (adminOnlyModules.includes(moduleName) && currentUser.role !== 'admin') {
                    alert("Vous n'avez pas l'autorisation d'accéder à ce module.");
                    return;
                }
                const targetFileName = `${moduleName}.html`;
                window.electronAPI.loadModule(targetFileName);
            });
        }
    });
});