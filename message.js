// welcomeMessage.js

document.addEventListener('DOMContentLoaded', () => {
    const welcomeMessageElement = document.getElementById('welcome-message');

    // Récupère les informations de l'utilisateur depuis localStorage en utilisant la clé 'currentUser'
    const loggedInUser = JSON.parse(localStorage.getItem('currentUser')); // <-- CHANGÉ ICI

    // Vérifie si l'élément d'affichage existe et si les informations de l'utilisateur sont valides
    if (welcomeMessageElement && loggedInUser && loggedInUser.fullName) {
        welcomeMessageElement.textContent = `Bienvenue, ${loggedInUser.fullName} !`;
    } else {
        console.warn("Impossible d'afficher le message de bienvenue : Élément 'welcome-message' introuvable ou utilisateur non connecté/données incomplètes.");
        // Si l'utilisateur n'est pas connecté, et que vous n'avez pas de redirection globale,
        // vous pourriez vouloir les rediriger vers la page de connexion ici.
        // Exemple (si ipcRenderer est disponible):
        // if (typeof ipcRenderer !== 'undefined' && ipcRenderer.send) {
        //     ipcRenderer.send('logout');
        // }
    }
});