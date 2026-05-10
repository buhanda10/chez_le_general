const params = new URLSearchParams(window.location.search);
const id = params.get('id');
if (!id) window.location.href = 'index.html';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await apiFetch(`/api/admin/ventes/${id}`);
    const vente = await res.json();
    if (!res.ok) throw new Error(vente.message);
    afficherDetail(vente);
  } catch (err) {
    document.getElementById('detailContent').innerHTML = `<p class="error">${err.message}</p>`;
  }
});

function afficherDetail(v) {
  const html = `
    <div class="detail-container">
      <div class="detail-row"><div class="detail-label">Référence :</div><div>${v.reference_vente}</div></div>
      <div class="detail-row"><div class="detail-label">Date :</div><div>${new Date(v.created_at).toLocaleString()}</div></div>
      <div class="detail-row"><div class="detail-label">Statut :</div><div>${v.annulee ? 'Annulée' : 'Active'}</div></div>
      <div class="detail-row"><div class="detail-label">Vendeur :</div><div>${v.vendeur_nom || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Client :</div><div>${v.client_nom || ''} ${v.client_prenom || ''} (${v.client_telephone || ''})</div></div>
      <div class="detail-row"><div class="detail-label">Adresse client :</div><div>${v.client_adresse || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Paiement :</div><div>${v.mode_paiement || '-'}</div></div>
      <div class="detail-row"><div class="detail-label">Montant total :</div><div>${v.montant_total} FCFA</div></div>
      <div class="detail-row"><div class="detail-label">Remise :</div><div>${v.remise} FCFA</div></div>

      <h3>Articles</h3>
      <table class="lignes-table">
        <thead><tr><th>Produit</th><th>Taille</th><th>Couleur</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr></thead>
        <tbody>
          ${v.lignes.map(l => `
            <tr>
              <td>${l.produit_nom} (${l.reference})</td>
              <td>${l.taille || '-'}</td>
              <td>${l.couleur || '-'}</td>
              <td>${l.quantite}</td>
              <td>${l.prix_unitaire}</td>
              <td>${(l.quantite * l.prix_unitaire).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('detailContent').innerHTML = html;
}