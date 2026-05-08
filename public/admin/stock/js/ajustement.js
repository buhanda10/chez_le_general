document.addEventListener('DOMContentLoaded', async () => {
  const res = await apiFetch('/api/admin/stock');
  const variations = await res.json();
  const select = document.getElementById('variation_id');
  variations.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.variation_id;
    opt.textContent = `${v.produit_nom} ${v.reference} - ${v.taille || 'T.U'} ${v.couleur || ''} (stock: ${v.stock})`;
    select.appendChild(opt);
  });

  const params = new URLSearchParams(window.location.search);
  const varId = params.get('variation_id');
  if (varId) select.value = varId;

  document.getElementById('formAjustement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const variation_id = select.value;
    const nouveau_stock = parseInt(document.getElementById('nouveau_stock').value);
    const raison = document.getElementById('raison').value.trim();
    const messageEl = document.getElementById('message');

    try {
      const res = await apiFetch('/api/admin/stock/ajustement', {
        method: 'POST',
        body: JSON.stringify({ variation_id, nouveau_stock, raison })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      messageEl.style.color = 'green';
      messageEl.textContent = 'Ajustement enregistré !';
    } catch (err) {
      messageEl.textContent = err.message;
    }
  });
});