document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevents page reload

        const username = loginForm.username.value;
        const password = loginForm.password.value;
        const role = loginForm.role.value;

        // Send credentials to the main process for verification
        const authResult = await window.electronAPI.authenticateUser({ username, password, role });

        if (authResult.success) {
            // Store user information in local storage for subsequent pages
            localStorage.setItem('currentUser', JSON.stringify(authResult.user));
            // Redirect to the dashboard page
            window.location.href = 'accueil.html'; 
        } else {
            loginMessage.textContent = authResult.message;
        }
    });
});