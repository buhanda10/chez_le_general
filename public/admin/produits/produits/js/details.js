const params = new URLSearchParams(window.location.search);
const id = params.get('id');
if (!id) window.location.href = 'index.html';

let produit = null;
let taillesList = [];
let couleursList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await chargerListesReferences();
  await chargerProduit();
  document.getElementById('btnImprimer').addEventListener('click', () => window.print());
});

async function chargerListesReferences() {
  try {
    const [tRes, cRes] = await Promise.all([
      apiFetch('/api/admin/tailles'),
      apiFetch('/api/admin/couleurs')
    ]);
    taillesList = await tRes.json();
    couleursList = await cRes.json();
  } catch (err) {
    console.error(err);
  }
}

async function chargerProduit() {
  try {
    const res = await apiFetch(`/api/admin/produits/${id}`);
    produit = await res.json();
    if (!res.ok) throw new Error(produit.message);
    afficherFiche(produit);
  } catch (err) {
    document.getElementById('detailContent').innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function afficherFiche(p) {
  // Catégories pour le select
  let optionsCat = '<option value="">Aucune</option>';
  // On doit charger les catégories (on va le faire en asynchrone et réafficher après)
  // Pour simplifier, on va directement insérer le select avec la valeur actuelle et on fera un fetch des catégories séparé.
  // On va appeler chargerCategories() dans la suite.
  
  // Images
  let imagesHtml = '';
  if (p.images && p.images.length > 0) {
    imagesHtml = p.images.map(img => `
      <div class="image-item">
        <img src="${img.url}" alt="image">
        <button class="supprimer-image no-print" data-imageid="${img.id}">X</button>
      </div>
    `).join('');
  } else {
    imagesHtml = '<p>Aucune image</p>';
  }

  // Variations
  let variationsHtml = '';
  if (p.variations && p.variations.length > 0) {
    variationsHtml = `
      <table class="variations-table">
        <thead><tr><th>Taille</th><th>Couleur</th><th>Stock</th><th class="no-print">Action</th></tr></thead>
        <tbody>
          ${p.variations.map(v => `
            <tr>
              <td>${v.taille}</td>
              <td>${v.couleur}</td>
              <td><span class="stock-value">${v.stock}</span></td>
              <td class="no-print actions-cell">
                <button class="btn-modifier-stock" data-varid="${v.id}" data-stock="${v.stock}">Modifier stock</button>
                <button class="btn-supprimer-variation" data-varid="${v.id}">Supprimer</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    variationsHtml = '<p>Aucune variation.</p>';
  }

  const html = `
    <div class="fiche-produit">
      <div class="fiche-header">
        <div class="images-produit" id="imagesContainer">
          ${imagesHtml}
        </div>
        <div class="form-detail">
          <div class="input-group">
            <label>Référence</label>
            <input type="text" id="reference" value="${p.reference || ''}" ${p.reference ? 'readonly' : ''}>
          </div>
          <div class="input-group">
            <label>Nom</label>
            <input type="text" id="nom" value="${p.nom || ''}">
          </div>
          <div class="input-group">
            <label>Catégorie</label>
            <select id="categorie_id"></select>
          </div>
          <div class="input-group">
            <label>Prix vente</label>
            <input type="number" step="0.01" id="prix_vente" value="${p.prix_vente}">
          </div>
          <div class="input-group">
            <label>Prix achat</label>
            <input type="number" step="0.01" id="prix_achat" value="${p.prix_achat || ''}">
          </div>
          <div class="input-group">
            <label>Description</label>
            <textarea id="description" rows="3">${p.description || ''}</textarea>
          </div>
          <div class="input-group">
            <label>Statut</label>
            <select id="statut">
              <option value="true" ${p.statut ? 'selected' : ''}>Actif</option>
              <option value="false" ${!p.statut ? 'selected' : ''}>Inactif</option>
            </select>
          </div>
          <button id="btnSauvegarder" class="no-print">💾 Enregistrer les modifications</button>
        </div>
      </div>
      
      <h3>Variations</h3>
      ${variationsHtml}
      <div class="ajout-variation-form no-print">
        <select id="nouvelleTaille"></select>
        <select id="nouvelleCouleur"></select>
        <input type="number" id="nouveauStock" placeholder="Stock" min="0" value="0" style="width:100px;">
        <button id="btnAjouterVariation">+ Ajouter</button>
      </div>
      
      <div class="upload-section no-print">
        <h3>Ajouter des images</h3>
        <input type="file" id="nouvellesImages" multiple accept="image/*">
        <button id="btnUploadImages">📤 Uploader</button>
      </div>
    </div>
  `;
  document.getElementById('detailContent').innerHTML = html;

  // Remplir le select des catégories
  chargerCategoriesSelect(p.categorie_id);
  
  // Remplir les selects pour nouvelle variation
  remplirSelectsTailleCouleur();

  // Événements
  document.getElementById('btnSauvegarder').addEventListener('click', sauvegarderProduit);
  document.getElementById('btnAjouterVariation').addEventListener('click', ajouterVariation);
  document.getElementById('btnUploadImages').addEventListener('click', uploadImages);
  
  // Gestion des boutons sur les variations
  document.querySelectorAll('.btn-supprimer-variation').forEach(btn => {
    btn.addEventListener('click', () => supprimerVariation(btn.dataset.varid));
  });
  document.querySelectorAll('.btn-modifier-stock').forEach(btn => {
    btn.addEventListener('click', () => modifierStock(btn.dataset.varid, btn.dataset.stock));
  });
  
  // Suppression d'image
  document.querySelectorAll('.supprimer-image').forEach(btn => {
    btn.addEventListener('click', () => supprimerImage(btn.dataset.imageid));
  });
}

async function chargerCategoriesSelect(selectedId) {
  try {
    const res = await apiFetch('/api/admin/categories');
    const categories = await res.json();
    const select = document.getElementById('categorie_id');
    select.innerHTML = '<option value="">Aucune</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.nom;
      if (cat.id == selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

function remplirSelectsTailleCouleur() {
  const selTaille = document.getElementById('nouvelleTaille');
  const selCouleur = document.getElementById('nouvelleCouleur');
  selTaille.innerHTML = taillesList.map(t => `<option value="${t.id}">${t.libelle}</option>`).join('');
  selCouleur.innerHTML = couleursList.map(c => `<option value="${c.id}">${c.libelle}</option>`).join('');
}

async function sauvegarderProduit() {
  const data = {
    nom: document.getElementById('nom').value.trim(),
    reference: document.getElementById('reference').value.trim(),
    prix_vente: document.getElementById('prix_vente').value.trim(),
    prix_achat: document.getElementById('prix_achat').value.trim(),
    description: document.getElementById('description').value.trim(),
    categorie_id: document.getElementById('categorie_id').value || null,
    statut: document.getElementById('statut').value === 'true'
  };
  try {
    const res = await apiFetch(`/api/admin/produits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Erreur');
    alert('✅ Produit mis à jour');
    // Recharger le produit pour avoir les données à jour
    chargerProduit();
  } catch (err) {
    alert(err.message);
  }
}

async function ajouterVariation() {
  const taille_id = document.getElementById('nouvelleTaille').value;
  const couleur_id = document.getElementById('nouvelleCouleur').value;
  const stock = document.getElementById('nouveauStock').value;
  if (!taille_id || !couleur_id) return alert('Sélectionnez taille et couleur');
  try {
    const res = await apiFetch(`/api/admin/produits/${id}/variations`, {
      method: 'POST',
      body: JSON.stringify({ taille_id, couleur_id, stock: parseInt(stock) || 0 })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    // Recharger le produit
    chargerProduit();
  } catch (err) {
    alert(err.message);
  }
}

async function supprimerVariation(variationId) {
  if (!confirm('Supprimer cette variation ?')) return;
  try {
    await apiFetch(`/api/admin/produits/${id}/variations/${variationId}`, { method: 'DELETE' });
    chargerProduit();
  } catch (err) {
    alert(err.message);
  }
}

async function modifierStock(variationId, ancienStock) {
  const nouveauStock = prompt('Nouveau stock :', ancienStock);
  if (nouveauStock === null) return;
  const stock = parseInt(nouveauStock);
  if (isNaN(stock) || stock < 0) return alert('Stock invalide');
  // On utilise la route POST variations qui fait un upsert
  const variation = produit.variations.find(v => v.id == variationId);
  if (!variation) return;
  try {
    await apiFetch(`/api/admin/produits/${id}/variations`, {
      method: 'POST',
      body: JSON.stringify({
        taille_id: variation.taille_id, // on n'a pas l'id directement, il faut récupérer depuis la liste
        couleur_id: variation.couleur_id,
        stock: stock
      })
    });
    chargerProduit();
  } catch (err) {
    alert(err.message);
  }
}

async function uploadImages() {
  const files = document.getElementById('nouvellesImages').files;
  if (!files.length) return;
  const formData = new FormData();
  for (let f of files) formData.append('images', f);
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/produits/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) throw new Error('Erreur upload');
    chargerProduit();
  } catch (err) {
    alert(err.message);
  }
}

async function supprimerImage(imageId) {
  if (!confirm('Supprimer cette image ?')) return;
  try {
    await apiFetch(`/api/admin/produits/${id}/images/${imageId}`, { method: 'DELETE' });
    chargerProduit();
  } catch (err) {
    alert(err.message);
  }
}