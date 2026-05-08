let page = 1;
const limite = 25;

document.addEventListener('DOMContentLoaded', () => {
  chargerHistorique();
  document.getElementById('filtreType').addEventListener('change', () => {
    page = 1;
    chargerHistorique();
  });
});

async function chargerHistorique() {
  const type = document.getElementById('filtreType').value;
  let url = `/api/admin/stock/historique?page=${page}&limite=${limite}`;
  if (type) url += `&type=${type}`;

  try {
    const res = await apiFetch(url);
    const data = await res.json();
    afficherHistorique(data);
  } catch(err) {
    console.error(err);
  }
}

function afficherHistorique(data) {
  const tbody = document.getElementById('histBody');
  tbody.innerHTML = data.mouvements.map(m => `
    <tr>
      <td>${new Date(m.created_at).toLocaleString()}</td>
      <td>${m.produit_nom} (${m.reference})</td>
      <td>${m.taille || '-'}</td>
      <td>${m.couleur || '-'}</td>
      <td><span class="badge ${m.type==='entree'?'ok':m.type==='sortie'?'alert':'badge'}">${m.type}</span></td>
      <td>${m.quantite > 0 ? '+' + m.quantite : m.quantite}</td>
      <td>${m.stock_avant}</td>
      <td>${m.stock_apres}</td>
      <td>${m.raison || ''}</td>
      <td>${m.effectue_par || 'Admin'}</td>
    </tr>
  `).join('');

  // Pagination
  const paginationDiv = document.getElementById('pagination');
  const totalPages = Math.ceil(data.total / data.limite);
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button onclick="allerPage(${i})" ${i===data.page ? 'disabled' : ''}>${i}</button>`;
  }
  paginationDiv.innerHTML = html;
}

function allerPage(p) {
  page = p;
  chargerHistorique();
}