document.addEventListener('DOMContentLoaded', async () => {
  // Charger toutes les variations avec stock pour le select
  const res = await apiFetch('/api/admin/stock');
  const variations = await res.json();
  const select = document.getElementById('variation_id');
  variations.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.variation_id;
    opt.textContent = `${v.produit_nom} ${v.reference} - ${v.taille || 'T.U'} ${v.couleur || ''} (stock: ${v.stock})`;
    select.appendChild(opt);
  });

  // Pré-sélectionner si id dans l'URL
  const params = new URLSearchParams(window.location.search);
  const varId = params.get('variation_id');
  if (varId) select.value = varId;

  document.getElementById('formEntree').addEventListener('submit', async (e) => {
    e.preventDefault();
    const variation_id = document.getElementById('variation_id').value;
    const quantite = parseInt(document.getElementById('quantite').value);
    const raison = document.getElementById('raison').value.trim();
    const messageEl = document.getElementById('message');

    try {
      const res = await apiFetch('/api/admin/stock/entree', {
        method: 'POST',
        body: JSON.stringify({ variation_id, quantite, raison })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      messageEl.style.color = 'green';
      messageEl.textContent = 'Entrée enregistrée !';
      document.getElementById('formEntree').reset();
    } catch (err) {
      messageEl.textContent = err.message;
    }
  });
});