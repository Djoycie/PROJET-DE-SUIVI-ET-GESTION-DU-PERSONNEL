document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginMessage = document.getElementById('login-message');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = loginForm.username.value.trim();
    const password = loginForm.password.value;
    const role = loginForm.role.value;

    loginMessage.textContent = 'Vérification en cours...';
    loginMessage.style.color = 'black';

    try {
      const authResult = await window.electronAPI.authenticateUser({ username, password, role });

      if (authResult.success) {
        localStorage.setItem('currentUser', JSON.stringify(authResult.user));
        window.location.href = 'accueil.html';
      } else {
        loginMessage.textContent = authResult.message || "Échec de l'authentification.";
        loginMessage.style.color = 'red';
        loginForm.password.value = '';
      }
    } catch (error) {
      console.error('Erreur lors de l’authentification:', error);
      loginMessage.textContent = 'Erreur serveur, veuillez réessayer plus tard.';
      loginMessage.style.color = 'red';
    }
  });
});