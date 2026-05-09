const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('utilisateur'));
if (!token || !user || user.role !== 'vendeur' && user.role !== 'admin') window.location.href = '../index.html';

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '../index.html';
});

document.addEventListener('DOMContentLoaded', () => {
  chargerClients();
  document.getElementById('btnCreer').addEventListener('click', creerClient);
  document.getElementById('btnSearch').addEventListener('click', chargerClients);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') chargerClients();
  });
});

async function chargerClients() {
  const recherche = document.getElementById('searchInput').value.trim();
  let url = '/api/vendeur/clients';
  if (recherche) url += `?recherche=${encodeURIComponent(recherche)}`;
  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
    const clients = await res.json();
    const tbody = document.getElementById('clientsBody');
    tbody.innerHTML = clients.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.nom || '-'}</td>
        <td>${c.prenom || '-'}</td>
        <td>${c.telephone}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function creerClient() {
  const nom = document.getElementById('clientNom').value.trim();
  const prenom = document.getElementById('clientPrenom').value.trim();
  const telephone = document.getElementById('clientTelephone').value.trim();
  if (!telephone) {
    document.getElementById('message').textContent = 'Téléphone requis.';
    return;
  }
  try {
    const res = await fetch('/api/vendeur/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nom, prenom, telephone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    document.getElementById('message').textContent = 'Client créé !';
    document.getElementById('clientNom').value = '';
    document.getElementById('clientPrenom').value = '';
    document.getElementById('clientTelephone').value = '';
    chargerClients();
  } catch (err) {
    document.getElementById('message').textContent = err.message;
  }
}