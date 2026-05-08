document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const nom = document.getElementById('nom').value.trim();
  const mdp = document.getElementById('mdp').value.trim();
  const messageEl = document.getElementById('message');

  if (!nom || !mdp) {
    messageEl.textContent = 'Veuillez remplir tous les champs.';
    return;
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom_utilisateur: nom, mot_de_passe: mdp })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur de connexion');
    }

    // Stocker le token et les infos utilisateur
    localStorage.setItem('token', data.token);
    localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));

    // Vérifier qu'il s'agit bien d'un admin
    if (data.utilisateur.role !== 'admin') {
      messageEl.textContent = 'Vous n\'êtes pas administrateur.';
      localStorage.clear();
      return;
    }

    // Redirection vers le dashboard
    window.location.href = 'dashboard.html';
  } catch (err) {
    messageEl.textContent = err.message;
  }
});