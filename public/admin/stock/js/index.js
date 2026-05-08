let stockData = [];
let alertesData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await chargerStock();
  await chargerAlertes();
  document.getElementById('searchInput').addEventListener('input', filtrerStock);
  document.getElementById('filtreAlerte').addEventListener('change', filtrerStock);
});

async function chargerStock() {
  try {
    const res = await apiFetch('/api/admin/stock');
    stockData = await res.json();
    afficherStock();
  } catch(err) {
    console.error(err);
  }
}

async function chargerAlertes() {
  try {
    const res = await apiFetch('/api/admin/stock/faible');
    alertesData = await res.json();
    afficherAlertes();
  } catch(err) {
    console.error(err);
  }
}

function afficherStock(data = stockData) {
  const tbody = document.getElementById('stockBody');
  tbody.innerHTML = data.map(item => `
    <tr>
      <td>${item.produit_nom}</td>
      <td>${item.reference}</td>
      <td>${item.taille || '-'}</td>
      <td>${item.couleur || '-'}</td>
      <td><span class="badge ${item.stock <= item.seuil_alerte ? 'alert' : 'ok'}">${item.stock}</span></td>
      <td>${item.seuil_alerte}</td>
      <td>
        <a href="entree.html?variation_id=${item.variation_id}" class="btn-link">Entrée</a>
        <a href="ajustement.html?variation_id=${item.variation_id}" class="btn-link">Ajuster</a>
      </td>
    </tr>
  `).join('');
}

function afficherAlertes() {
  const tbody = document.getElementById('alertesBody');
  tbody.innerHTML = alertesData.length === 0 ? '<tr><td colspan="7">Aucune alerte.</td></tr>' :
    alertesData.map(item => `
      <tr>
        <td>${item.produit_nom}</td>
        <td>${item.reference}</td>
        <td>${item.taille || '-'}</td>
        <td>${item.couleur || '-'}</td>
        <td class="badge alert">${item.stock}</td>
        <td>${item.seuil_alerte}</td>
        <td>
          <a href="entree.html?variation_id=${item.variation_id}" class="btn-link">Entrée</a>
          <a href="ajustement.html?variation_id=${item.variation_id}" class="btn-link">Ajuster</a>
        </td>
      </tr>
    `).join('');
}

function filtrerStock() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filtre = document.getElementById('filtreAlerte').value;
  let filtered = stockData;

  if (search) {
    filtered = filtered.filter(item => 
      item.produit_nom.toLowerCase().includes(search) ||
      item.reference.toLowerCase().includes(search)
    );
  }
  if (filtre === 'faible') {
    filtered = filtered.filter(item => item.stock <= item.seuil_alerte);
  } else if (filtre === 'ok') {
    filtered = filtered.filter(item => item.stock > item.seuil_alerte);
  }

  afficherStock(filtered);
}