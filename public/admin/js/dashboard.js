document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  const utilisateur = JSON.parse(localStorage.getItem('utilisateur'));

  if (!token || !utilisateur) {
    window.location.href = 'login.html';
    return;
  }

  fetch('/api/auth/profil', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error('Session invalide');
    return res.json();
  })
  .then(user => {
    document.getElementById('userDisplay').textContent = `👤 ${user.nom_complet}`;
  })
  .catch(() => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.clear();
    window.location.href = 'login.html';
  });
});