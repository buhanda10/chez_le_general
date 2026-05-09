const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('utilisateur'));
if (!token || !user || user.role !== 'vendeur') window.location.href = '../index.html';

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '../index.html';
});

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('nom_utilisateur').value = user.nom_utilisateur;
  try {
    const res = await fetch('/api/vendeur/profil', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    document.getElementById('nom_complet').value = data.nom_complet || '';
    document.getElementById('telephone').value = data.telephone || '';
  } catch (err) {
    console.error(err);
  }
});

document.getElementById('profilForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nom_complet = document.getElementById('nom_complet').value.trim();
  const telephone = document.getElementById('telephone').value.trim();
  const mot_de_passe_actuel = document.getElementById('mdpActuel').value.trim();
  const nouveau_mot_de_passe = document.getElementById('nouveauMdp').value.trim();

  const body = { nom_complet, telephone };
  if (nouveau_mot_de_passe) {
    body.mot_de_passe_actuel = mot_de_passe_actuel;
    body.nouveau_mot_de_passe = nouveau_mot_de_passe;
  }

  const message = document.getElementById('message');
  try {
    const res = await fetch('/api/vendeur/profil', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    message.style.color = 'green';
    message.textContent = data.message;
    // Mettre à jour le localStorage si nom complet changé
    const updatedUser = { ...user, nom_complet };
    localStorage.setItem('utilisateur', JSON.stringify(updatedUser));
    document.getElementById('mdpActuel').value = '';
    document.getElementById('nouveauMdp').value = '';
  } catch (err) {
    message.style.color = 'red';
    message.textContent = err.message;
  }
});