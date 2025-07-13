document.addEventListener('DOMContentLoaded', async () => {
    // Éléments du DOM
    const htmlElement = document.documentElement;
    const lightThemeBtn = document.getElementById('lightThemeBtn');
    const darkThemeBtn = document.getElementById('darkThemeBtn');
    const languageSelect = document.getElementById('languageSelect');
    const userFullNameElement = document.getElementById('userFullName');
    const userRoleElement = document.getElementById('userRole');
    const notificationToggle = document.getElementById('notificationToggle');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordModal = document.getElementById('passwordModal');
    const cancelPasswordChangeBtn = document.getElementById('cancelPasswordChange');
    const savePasswordChangeBtn = document.getElementById('savePasswordChange');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const passwordMessageElement = document.getElementById('passwordMessage');

    /**
     * Applique le thème sélectionné (clair ou sombre).
     * @param {string} theme - 'light' ou 'dark'.
     */
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            htmlElement.classList.add('dark');
            htmlElement.classList.remove('light');
        } else {
            htmlElement.classList.add('light');
            htmlElement.classList.remove('dark');
        }
        localStorage.setItem('appTheme', theme); // Sauvegarde la préférence de thème
        updateThemeButtons(theme);
    };

    /**
     * Met à jour l'état visuel des boutons de thème.
     * @param {string} activeTheme - Le thème actuellement actif.
     */
    const updateThemeButtons = (activeTheme) => {
        lightThemeBtn.classList.remove('active');
        darkThemeBtn.classList.remove('active');
        if (activeTheme === 'light') {
            lightThemeBtn.classList.add('active');
        } else {
            darkThemeBtn.classList.add('active');
        }
    };

    /**
     * Applique la langue sélectionnée.
     * Pour une application multilingue complète, cela impliquerait un fichier de traduction.
     * Ici, c'est une implémentation simple pour l'exemple.
     * @param {string} lang - 'fr' ou 'en'.
     */
    const applyLanguage = (lang) => {
        // Logique de changement de langue (simplifiée pour cet exemple)
        // Dans une vraie application, vous chargereriez des fichiers de traduction
        // et mettriez à jour tous les textes de l'interface.
        console.log(Changement de langue vers: ${lang});
        localStorage.setItem('appLanguage', lang); // Sauvegarde la préférence de langue
        // Mettre à jour l'attribut lang de la balise html
        htmlElement.lang = lang;
        // Ici, vous pourriez appeler une fonction pour mettre à jour tous les textes
        updateTexts(lang);
    };

    /**
     * Met à jour les textes de l'interface en fonction de la langue.
     * Ceci est un exemple très basique. Pour une application réelle, utilisez une bibliothèque i18n.
     * @param {string} lang - La langue à appliquer.
     */
    const updateTexts = (lang) => {
        const texts = {
            fr: {
                appSettings: "Paramètres de l'Application",
                userInfo: "Informations Utilisateur",
                fullName: "Nom Complet:",
                role: "Rôle:",
                changePassword: "Changer le Mot de Passe",
                appTheme: "Thème de l'Application",
                chooseTheme: "Choisir le thème:",
                light: "Clair",
                dark: "Sombre",
                language: "Langue",
                selectLanguage: "Sélectionner la langue:",
                notifications: "Notifications",
                enableNotifications: "Activer les notifications:",
                about: "À Propos",
                appDescription: "Application de Gestion des Ressources Humaines.",
                version: "Version:",
                developedBy: "Développé par:",
                changePasswordModalTitle: "Changer le Mot de Passe",
                currentPassword: "Mot de passe actuel:",
                newPassword: "Nouveau mot de passe:",
                confirmNewPassword: "Confirmer le nouveau mot de passe:",
                cancel: "Annuler",
                save: "Enregistrer",
                passwordMismatch: "Les nouveaux mots de passe ne correspondent pas.",
                passwordEmpty: "Veuillez remplir tous les champs de mot de passe.",
                passwordUpdated: "Mot de passe mis à jour avec succès (simulation).",
                passwordChangeFailed: "Échec du changement de mot de passe (simulation)."
            },
            en: {
                appSettings: "Application Settings",
                userInfo: "User Information",
                fullName: "Full Name:",
                role: "Role:",
                changePassword: "Change Password",
                appTheme: "Application Theme",
                chooseTheme: "Choose theme:",
                light: "Light",
                dark: "Dark",
                language: "Language",
                selectLanguage: "Select language:",
                notifications: "Notifications",
                enableNotifications: "Enable notifications:",
                about: "About",
                appDescription: "Human Resources Management Application.",
                version: "Version:",
                developedBy: "Developed by:",
                changePasswordModalTitle: "Change Password",
                currentPassword: "Current password:",
                newPassword: "New password:",
                confirmNewPassword: "Confirm new password:",
                cancel: "Cancel",
                save: "Save",
                passwordMismatch: "New passwords do not match.",
                passwordEmpty: "Please fill in all password fields.",
                passwordUpdated: "Password updated successfully (simulation).",
                passwordChangeFailed: "Password change failed (simulation)."
            }
        };

        const currentTexts = texts[lang];
        if (!currentTexts) return;

        // Mise à jour des éléments principaux de la page
        const h1Element = document.querySelector('h1');
        if (h1Element) h1Element.textContent = currentTexts.appSettings;

        const userInfoH2 = document.querySelector('section:nth-of-type(1) h2');
        if (userInfoH2) userInfoH2.textContent = currentTexts.userInfo;

        // Les labels ci-dessous sont statiques dans le HTML, mais si vous voulez les rendre dynamiques,
        // les sélecteurs sont corrects.
        const fullNameLabel = document.querySelector('section:nth-of-type(1) label[for="userFullName"]'); // Added specific 'for' attribute
        if (fullNameLabel) fullNameLabel.textContent = currentTexts.fullName;

        const roleLabel = document.querySelector('section:nth-of-type(1) label[for="userRole"]'); // Added specific 'for' attribute
        if (roleLabel) roleLabel.textContent = currentTexts.role;

        if (changePasswordBtn) changePasswordBtn.textContent = currentTexts.changePassword;

        const appThemeH2 = document.querySelector('section:nth-of-type(2) h2');
        if (appThemeH2) appThemeH2.textContent = currentTexts.appTheme;

        const chooseThemeSpan = document.querySelector('section:nth-of-type(2) span');
        if (chooseThemeSpan) chooseThemeSpan.textContent = currentTexts.chooseTheme;

        if (lightThemeBtn) lightThemeBtn.textContent = currentTexts.light;
        if (darkThemeBtn) darkThemeBtn.textContent = currentTexts.dark;

        const languageH2 = document.querySelector('section:nth-of-type(3) h2');
        if (languageH2) languageH2.textContent = currentTexts.language;

        const selectLanguageLabel = document.querySelector('section:nth-of-type(3) label[for="languageSelect"]'); // Added specific 'for' attribute
        if (selectLanguageLabel) selectLanguageLabel.textContent = currentTexts.selectLanguage;

        document.querySelector('section:nth-of-type(4) h2').textContent = currentTexts.notifications;
        document.querySelector('section:nth-of-type(4) span').textContent = currentTexts.enableNotifications;

        const aboutH2 = document.querySelector('section:nth-of-type(5) h2');
        if (aboutH2) aboutH2.textContent = currentTexts.about;

        const appDescriptionP = document.querySelector('section:nth-of-type(5) p:nth-of-type(1)');
        if (appDescriptionP) appDescriptionP.textContent = currentTexts.appDescription;

        const versionP = document.querySelector('section:nth-of-type(5) p:nth-of-type(2)');
        if (versionP) versionP.innerHTML = ${currentTexts.version} <span class="font-medium">1.0.0</span>;

        const developedByP = document.querySelector('section:nth-of-type(5) p:nth-of-type(3)');
        if (developedByP) developedByP.innerHTML = ${currentTexts.developedBy} <span class="font-medium">Votre Équipe</span>;

        // Mise à jour des textes du modal (avec vérifications de nullité)
        if (passwordModal) {
            const modalTitle = passwordModal.querySelector('h3');
            if (modalTitle) modalTitle.textContent = currentTexts.changePasswordModalTitle;

            const currentPasswordLabel = passwordModal.querySelector('label[for="currentPassword"]');
            if (currentPasswordLabel) currentPasswordLabel.textContent = currentTexts.currentPassword;

            const newPasswordLabel = passwordModal.querySelector('label[for="newPassword"]');
            if (newPasswordLabel) newPasswordLabel.textContent = currentTexts.newPassword;

            const confirmNewPasswordLabel = passwordModal.querySelector('label[for="confirmNewPassword"]');
            if (confirmNewPasswordLabel) confirmNewPasswordLabel.textContent = currentTexts.confirmNewPassword;

            if (cancelPasswordChangeBtn) cancelPasswordChangeBtn.textContent = currentTexts.cancel;
            if (savePasswordChangeBtn) savePasswordChangeBtn.textContent = currentTexts.save;
        }

        // Stockage des messages pour la validation du mot de passe (avec vérification)
        if (passwordMessageElement) {
            passwordMessageElement.dataset.passwordMismatch = currentTexts.passwordMismatch;
            passwordMessageElement.dataset.passwordEmpty = currentTexts.passwordEmpty;
            passwordMessageElement.dataset.passwordUpdated = currentTexts.passwordUpdated;
            passwordMessageElement.dataset.passwordChangeFailed = currentTexts.passwordChangeFailed;
        }
    };


    // --- Initialisation des paramètres ---

    // Récupérer le thème sauvegardé ou utiliser 'light' par défaut
    const savedTheme = localStorage.getItem('appTheme') || 'light';
    applyTheme(savedTheme);

    // Récupérer la langue sauvegardée ou utiliser 'fr' par défaut
    const savedLanguage = localStorage.getItem('appLanguage') || 'fr';
    languageSelect.value = savedLanguage;
    applyLanguage(savedLanguage); // Appliquer la langue au chargement

    // Récupérer l'état des notifications sauvegardé ou utiliser 'false' par défaut
    const savedNotificationState = localStorage.getItem('notificationsEnabled') === 'true';
    notificationToggle.checked = savedNotificationState;


    // --- Écouteurs d'événements ---

    // Changement de thème
    lightThemeBtn.addEventListener('click', () => applyTheme('light'));
    darkThemeBtn.addEventListener('click', () => applyTheme('dark'));

    // Changement de langue
    languageSelect.addEventListener('change', (event) => {
        applyLanguage(event.target.value);
    });

    // Toggle des notifications
    notificationToggle.addEventListener('change', (event) => {
        localStorage.setItem('notificationsEnabled', event.target.checked);
        console.log(Notifications ${event.target.checked ? 'activées' : 'désactivées'});
        // Ici, vous pourriez envoyer un signal à Electron pour gérer les notifications système
    });

    // Afficher le modal de changement de mot de passe
    changePasswordBtn.addEventListener('click', () => {
        passwordModal.classList.remove('hidden');
        passwordMessageElement.classList.add('hidden'); // Cacher le message précédent
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
    });

    // Annuler le changement de mot de passe
    cancelPasswordChangeBtn.addEventListener('click', () => {
        passwordModal.classList.add('hidden');
    });

    // Enregistrer le nouveau mot de passe
    savePasswordChangeBtn.addEventListener('click', async () => {
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        passwordMessageElement.classList.add('hidden'); // Cacher le message précédent

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            passwordMessageElement.textContent = passwordMessageElement.dataset.passwordEmpty;
            passwordMessageElement.classList.remove('hidden');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            passwordMessageElement.textContent = passwordMessageElement.dataset.passwordMismatch;
            passwordMessageElement.classList.remove('hidden');
            return;
        }

        // Simuler un appel à l'API Electron pour changer le mot de passe
        // Dans une vraie application, vous enverriez ces données au processus principal
        // qui interagirait avec votre backend (MySQL).
        try {
            // Assurez-vous que electronAPI.updatePassword existe et est exposé par preload.js
            const success = await electronAPI.updatePassword({
                currentPassword,
                newPassword
            });

            if (success) {
                passwordMessageElement.textContent = passwordMessageElement.dataset.passwordUpdated;
                passwordMessageElement.classList.remove('text-red-600', 'dark:text-red-400');
                passwordMessageElement.classList.add('text-green-600', 'dark:text-green-400');
                passwordMessageElement.classList.remove('hidden');
                // Optionnel: Fermer le modal après un court délai
                setTimeout(() => {
                    passwordModal.classList.add('hidden');
                }, 2000);
            } else {
                passwordMessageElement.textContent = passwordMessageElement.dataset.passwordChangeFailed;
                passwordMessageElement.classList.remove('text-green-600', 'dark:text-green-400');
                passwordMessageElement.classList.add('text-red-600', 'dark:text-red-400');
                passwordMessageElement.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error);
            passwordMessageElement.textContent = passwordMessageElement.dataset.passwordChangeFailed + ` (${error.message || error})`;
            passwordMessageElement.classList.remove('text-green-600', 'dark:text-green-400');
            passwordMessageElement.classList.add('text-red-600', 'dark:text-red-400');
            passwordMessageElement.classList.remove('hidden');
        }
    });

    // --- Chargement des informations utilisateur ---
    /**
     * Charge et affiche les informations de l'utilisateur connecté.
     * Utilise electronAPI pour communiquer avec le processus principal.
     */
    const loadUserInfo = async () => {
        try {
            // Assurez-vous que electronAPI.getUserInfo existe et est exposé par preload.js
            const userInfo = await electronAPI.getCurrentUser();
            if (userInfo) {
                userFullNameElement.textContent = userInfo.fullName;
                userRoleElement.textContent = userInfo.role;
            } else {
                userFullNameElement.textContent = 'Non disponible';
                userRoleElement.textContent = 'Non disponible';
                console.warn('Aucune information utilisateur reçue.');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des informations utilisateur:', error);
            userFullNameElement.textContent = 'Erreur de chargement';
            userRoleElement.textContent = 'Erreur de chargement';
        }
    };

    // Charger les informations utilisateur au démarrage
    loadUserInfo();
});