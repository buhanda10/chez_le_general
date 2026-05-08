async function chargerVendeurs() {
  const tbody = document.getElementById('vendeursBody');
  try {
    const res = await apiFetch('/api/admin/vendeurs');
    const vendeurs = await res.json();
    if (!res.ok) throw new Error(vendeurs.message);
    if (vendeurs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Aucun vendeur enregistré.</td></tr>';
      return;
    }
    tbody.innerHTML = vendeurs.map(v => `
      <tr>
        <td>${v.id}</td>
        <td>${v.nom_utilisateur}</td>
        <td>${v.nom_complet || '-'}</td>
        <td>${v.telephone || '-'}</td>
        <td><span class="badge ${v.actif ? 'actif' : 'inactif'}">${v.actif ? 'Actif' : 'Inactif'}</span></td>
        <td>${v.derniere_connexion ? new Date(v.derniere_connexion).toLocaleString() : 'Jamais'}</td>
        <td>
          <a href="details.html?id=${v.id}" class="btn-link">Details</a>
          <a href="modifier.html?id=${v.id}" class="btn-link">Modifier</a>
          <button onclick="desactiverVendeur(${v.id})" ${!v.actif ? 'disabled' : ''}>Désactiver</button>
        </td>
      </tr>
    `).join('');
  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="7">Erreur: ${err.message}</td></tr>`;
  }
}

async function desactiverVendeur(id) {
  if (!confirm('Désactiver ce vendeur ?')) return;
  try {
    const res = await apiFetch(`/api/admin/vendeurs/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    chargerVendeurs(); // recharger la liste
  } catch(err) {
    alert(err.message);
  }
}