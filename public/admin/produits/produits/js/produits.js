async function chargerProduits() {
  const res = await apiFetch('/api/admin/produits');
  const produits = await res.json();
  const tbody = document.getElementById('prodBody');
  tbody.innerHTML = produits.map(p => `
    <tr>
      <td>${p.reference}</td>
      <td>${p.image_principale ? `<img src="${p.image_principale}" width="50">` : '-'}</td>
      <td>${p.nom}</td>
      <td>${p.categorie_nom || '-'}</td>
      <td>${p.prix_vente}</td>
      <td>${p.prix_achat || '-'}</td>
      <td><span class="badge ${p.statut ? 'actif' : 'inactif'}">${p.statut ? 'Actif' : 'Inactif'}</span></td>
      <td>
        <a href="details.html?id=${p.id}" class="btn-link">Détails</a>
        <button onclick="desactiverProduit(${p.id})">Désactiver</button>
      </td>
    </tr>
  `).join('');
}
async function desactiverProduit(id) {
  if (!confirm('Désactiver ce produit ?')) return;
  await apiFetch(`/api/admin/produits/${id}`, { method: 'DELETE' });
  chargerProduits();
}
chargerProduits();