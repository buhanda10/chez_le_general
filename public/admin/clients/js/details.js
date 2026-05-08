const params = new URLSearchParams(window.location.search);
const id = params.get('id');
if (!id) window.location.href = 'index.html';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await apiFetch(`/api/admin/clients/${id}`);
    const client = await res.json();
    if (!res.ok) throw new Error(client.message);
    afficherClient(client);
  } catch (err) {
    document.getElementById('detailContent').innerHTML = `<p class="error">${err.message}</p>`;
  }
});

function afficherClient(client) {
  const html = `
    <div class="detail-container">
      <div class="detail-row"><div class="detail-label">Nom :</div><div>${client.nom || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Prénom :</div><div>${client.prenom || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Téléphone :</div><div>${client.telephone}</div></div>
      <div class="detail-row"><div class="detail-label">Adresse :</div><div>${client.adresse || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Statut :</div><div>${client.actif ? 'Actif' : 'Inactif'}</div></div>
      <div class="detail-row"><div class="detail-label">Inscrit le :</div><div>${new Date(client.created_at).toLocaleString()}</div></div>

      <h3>Historique des achats</h3>
      ${client.ventes.length > 0 ? `
        <table class="ventes-table">
          <thead><tr><th>Référence</th><th>Date</th><th>Montant</th><th>Remise</th><th>Paiement</th></tr></thead>
          <tbody>
            ${client.ventes.map(v => `
              <tr>
                <td><a href="../ventes/details.html?id=${v.id}" target="_blank">${v.reference_vente}</a></td>
                <td>${new Date(v.created_at).toLocaleString()}</td>
                <td>${v.montant_total}</td>
                <td>${v.remise}</td>
                <td>${v.mode_paiement || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p>Aucun achat.</p>'}
    </div>
  `;
  document.getElementById('detailContent').innerHTML = html;
}