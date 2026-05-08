document.addEventListener('DOMContentLoaded', async () => {
  // Charger les catégories dans le select
  try {
    const res = await apiFetch('/api/admin/categories');
    const categories = await res.json();
    const select = document.getElementById('categorie_id');
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.nom;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }

  // Charger les tailles et couleurs pour les variations
  const [taillesRes, couleursRes] = await Promise.all([
    apiFetch('/api/admin/tailles'), // nous allons créer cette route simple
    apiFetch('/api/admin/couleurs')
  ]);
  const tailles = await taillesRes.json();
  const couleurs = await couleursRes.json();

  // Stocker globalement pour utilisation dans les variations
  window.taillesList = tailles;
  window.couleursList = couleurs;

  // Ajout d'une variation
  document.getElementById('btnAjouterVariation').addEventListener('click', () => ajouterVariation());
  // Au moins une ligne par défaut
  ajouterVariation();

  // Soumission du formulaire
  document.getElementById('formProduit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageEl = document.getElementById('message');
    messageEl.textContent = '';

    const reference = document.getElementById('reference').value.trim();
    const nom = document.getElementById('nom').value.trim();
    const prix_vente = document.getElementById('prix_vente').value.trim();
    const prix_achat = document.getElementById('prix_achat').value.trim();
    const description = document.getElementById('description').value.trim();
    const categorie_id = document.getElementById('categorie_id').value;

    if (!reference || !nom || !prix_vente) {
      messageEl.textContent = 'Remplissez les champs obligatoires.';
      return;
    }

    // Récupérer les variations
    const variations = [];
    document.querySelectorAll('.variation-item').forEach(item => {
      const taille = item.querySelector('.select-taille').value;
      const couleur = item.querySelector('.select-couleur').value;
      const stock = item.querySelector('.input-stock').value;
      if (taille && couleur) {
        variations.push({
          taille_id: parseInt(taille),
          couleur_id: parseInt(couleur),
          stock: parseInt(stock) || 0
        });
      }
    });

    const formData = new FormData();
    formData.append('reference', reference);
    formData.append('nom', nom);
    formData.append('prix_vente', prix_vente);
    if (prix_achat) formData.append('prix_achat', prix_achat);
    if (description) formData.append('description', description);
    if (categorie_id) formData.append('categorie_id', categorie_id);
    if (variations.length > 0) {
      formData.append('variations', JSON.stringify(variations));
    }

    // Images
    const imageFiles = document.getElementById('images').files;
    for (let i = 0; i < imageFiles.length; i++) {
      formData.append('images', imageFiles[i]);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/produits', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Erreur');
      messageEl.style.color = 'green';
      messageEl.textContent = 'Produit créé avec succès !';
      setTimeout(() => window.location.href = 'index.html', 1500);
    } catch (err) {
      messageEl.textContent = err.message;
    }
  });
});

function ajouterVariation() {
  const container = document.getElementById('variationsContainer');
  const div = document.createElement('div');
  div.className = 'variation-item';
  div.style.display = 'flex';
  div.style.gap = '0.5rem';
  div.style.marginBottom = '0.5rem';

  let optionsTaille = '<option value="">Taille</option>';
  window.taillesList.forEach(t => optionsTaille += `<option value="${t.id}">${t.libelle}</option>`);
  let optionsCouleur = '<option value="">Couleur</option>';
  window.couleursList.forEach(c => optionsCouleur += `<option value="${c.id}">${c.libelle}</option>`);

  div.innerHTML = `
    <select class="select-taille">${optionsTaille}</select>
    <select class="select-couleur">${optionsCouleur}</select>
    <input type="number" class="input-stock" placeholder="Stock" min="0" value="0" style="width:80px;">
    <button type="button" class="btn-supprimer" style="background:#e94560; padding:0 0.5rem;">X</button>
  `;
  div.querySelector('.btn-supprimer').addEventListener('click', () => div.remove());
  container.appendChild(div);
}