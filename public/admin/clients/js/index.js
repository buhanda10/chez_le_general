document.addEventListener('DOMContentLoaded', () => {
  chargerClients();
  document.getElementById('btnSearch').addEventListener('click', chargerClients);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') chargerClients();
  });
});

async function chargerClients() {
  const recherche = document.getElementById('searchInput').value.trim();
  let url = '/api/admin/clients';
  if (recherche) url += `?recherche=${encodeURIComponent(recherche)}`;

  const res = await apiFetch(url);
  const clients = await res.json();
  const tbody = document.getElementById('clientsBody');
  tbody.innerHTML = clients.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.nom || '-'}</td>
      <td>${c.prenom || '-'}</td>
      <td>${c.telephone}</td>
      <td>${c.adresse || '-'}</td>
      <td>
        <a href="details.html?id=${c.id}" class="btn-link">Détails</a>
        <a href="modifier.html?id=${c.id}" class="btn-link">Modifier</a>
        <button onclick="desactiverClient(${c.id})" class="btn-danger">Désactiver</button>
      </td>
    </tr>
  `).join('');
}

async function desactiverClient(id) {
  if (!confirm('Désactiver ce client ?')) return;
  await apiFetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
  chargerClients();
}