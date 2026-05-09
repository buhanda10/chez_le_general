const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('utilisateur'));
if (!token || !user || user.role !== 'vendeur') window.location.href = '../index.html';

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '../index.html';
});

let page = 1;
const limite = 20;

document.addEventListener('DOMContentLoaded', () => {
  chargerVentes(page);
});

async function chargerVentes(p) {
  try {
    const res = await fetch(`/api/vendeur/ventes?page=${p}&limite=${limite}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    afficherVentes(data);
  } catch (err) {
    console.error(err);
  }
}

function afficherVentes(data) {
  const tbody = document.getElementById('ventesBody');
  tbody.innerHTML = data.ventes.map(v => `
    <tr>
      <td>${v.reference_vente}</td>
      <td>${new Date(v.created_at).toLocaleString()}</td>
      <td>${v.montant_total} FC</td>
      <td>${v.remise} FC</td>
      <td>${v.client_nom || ''} ${v.client_prenom || ''}</td>
      <td>${v.mode_paiement || '-'}</td>
      <td><a href="ticket.html?id=${v.id}" class="btn-link" target="_blank">Ticket</a></td>
    </tr>
  `).join('');

  const pagDiv = document.getElementById('pagination');
  const totalPages = Math.ceil(data.total / data.limite);
  pagDiv.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.disabled = i === data.page;
    btn.addEventListener('click', () => {
      page = i;
      chargerVentes(i);
    });
    pagDiv.appendChild(btn);
  }
}