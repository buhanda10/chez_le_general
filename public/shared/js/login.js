// Vérifier si déjà connecté → rediriger directement
(function() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('utilisateur'));
  if (token && user) {
    // Vérifier validité token avec une requête rapide
    fetch('/api/auth/profil', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(res => {
      if (res.ok) {
        redirectByRole(user.role);
      } else {
        localStorage.clear();
      }
    });
  }
})();

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

    // Stocker
    localStorage.setItem('token', data.token);
    localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));

    // Redirection selon le rôle
    redirectByRole(data.utilisateur.role);
  } catch (err) {
    messageEl.textContent = err.message;
  }
});

function redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = 'admin/dashboard.html';
  } else if (role === 'vendeur') {
    window.location.href = 'vendeur/pos.html';
  } else {
    document.getElementById('message').textContent = 'Rôle inconnu.';
  }
}