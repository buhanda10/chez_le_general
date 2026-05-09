// Vérification session
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('utilisateur'));
if (!token || !user || user.role !== 'vendeur' && user.role !== 'admin') {
  window.location.href = '../index.html';
}

document.getElementById('userDisplay').textContent = `👤 ${user.nom_complet || user.nom_utilisateur}`;
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '../index.html';
});

// RÉFÉRENCES DOM
const clientSel = document.getElementById('clientSelect');
const modePaiementSel = document.getElementById('modePaiement');
const panierContainer = document.getElementById('panierItems');
const totalSpan = document.getElementById('totalPanier');
const searchInput = document.getElementById('searchProduit');
const remiseInput = document.getElementById('remise');
const listeProduitsDiv = document.getElementById('listeProduits');

// Variables globales
let produits = [];
let panier = [];
let clients = [];
let modesPaiement = [];
let produitSelectionne = null;

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  await chargerProduits();
  await chargerClientsSelect();
  await chargerModesPaiement();

  searchInput.addEventListener('input', filtrerProduits);
  document.getElementById('btnNouveauClient').addEventListener('click', afficherFormClient);
  document.getElementById('btnCreerClient').addEventListener('click', creerClientRapide);
  document.getElementById('btnValiderVente').addEventListener('click', validerVente);
  remiseInput.addEventListener('input', calculerTotal);

  // Modale
  document.querySelector('.close').addEventListener('click', fermerModalVariation);
  document.getElementById('btnAjouterAuPanier').addEventListener('click', ajouterAuPanier);
});

// Chargements API
async function chargerProduits() {
  try {
    const res = await fetch('/api/vendeur/produits', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    produits = await res.json();
    afficherProduits(produits);
  } catch (err) {
    console.error(err);
  }
}

async function chargerClientsSelect() {
  try {
    const res = await fetch('/api/vendeur/clients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    clients = await res.json();
    remplirSelect(clientSel, clients.map(c => ({
      value: c.id,
      text: `${c.nom || ''} ${c.prenom || ''} - ${c.telephone}`
    })), 'Sélectionner un client');
  } catch (err) {
    console.error(err);
  }
}

async function chargerModesPaiement() {
  try {
    const res = await fetch('/api/vendeur/modes-paiement', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    modesPaiement = await res.json();
    modePaiementSel.innerHTML = modesPaiement.map(m => `<option value="${m.id}">${m.libelle}</option>`).join('');
  } catch (err) {
    console.error(err);
  }
}

function remplirSelect(selectEl, options, placeholder) {
  selectEl.innerHTML = `<option value="">${placeholder}</option>` + options.map(o => `<option value="${o.value}">${o.text}</option>`).join('');
}

// Produits
function afficherProduits(liste) {
  listeProduitsDiv.innerHTML = liste.map(p => {
    let stockTotal = p.variations ? p.variations.reduce((sum, v) => sum + v.stock, 0) : 0;
    return `
      <div class="produit-card" data-id="${p.id}" data-nom="${p.nom}" data-prix="${p.prix_vente}" data-stock="${stockTotal}">
        ${p.image_principale ? `<img src="${p.image_principale}" alt="${p.nom}">` : '<div style="height:120px;background:#eee;"></div>'}
        <h3>${p.nom}</h3>
        <div class="prix">${p.prix_vente} FCFA</div>
        <div class="stock">Stock: ${stockTotal}</div>
      </div>
    `;
  }).join('');
  document.querySelectorAll('.produit-card').forEach(card => {
    card.addEventListener('click', () => ouvrirModalVariation(card.dataset.id));
  });
}

function filtrerProduits() {
  const query = searchInput.value.toLowerCase();
  const filtered = produits.filter(p => p.nom.toLowerCase().includes(query) || p.reference.toLowerCase().includes(query));
  afficherProduits(filtered);
}

// Modale variation
async function ouvrirModalVariation(id) {
  const produit = produits.find(p => p.id == id);
  if (!produit) return;
  produitSelectionne = produit;

  document.getElementById('varTaille').innerHTML = '';
  document.getElementById('varCouleur').innerHTML = '';
  document.getElementById('varQuantite').value = 1;
  document.getElementById('varStockInfo').textContent = '';

  if (produit.variations && produit.variations.length > 0) {
    const taillesUniques = [...new Map(produit.variations.map(v => [v.taille_id, { id: v.taille_id, libelle: v.taille }])).values()];
    const couleursUniques = [...new Map(produit.variations.map(v => [v.couleur_id, { id: v.couleur_id, libelle: v.couleur }])).values()];

    remplirSelect(document.getElementById('varTaille'), taillesUniques.map(t => ({ value: t.id, text: t.libelle })), 'Taille');
    remplirSelect(document.getElementById('varCouleur'), couleursUniques.map(c => ({ value: c.id, text: c.libelle })), 'Couleur');

    document.getElementById('varTaille').onchange = updateStockInfo;
    document.getElementById('varCouleur').onchange = updateStockInfo;
    updateStockInfo();
  } else {
    document.getElementById('varTaille').innerHTML = '<option value="">-</option>';
    document.getElementById('varCouleur').innerHTML = '<option value="">-</option>';
  }

  document.getElementById('modalVariation').style.display = 'flex';
}

function updateStockInfo() {
  const tailleId = document.getElementById('varTaille').value;
  const couleurId = document.getElementById('varCouleur').value;
  if (produitSelectionne && produitSelectionne.variations) {
    const varFound = produitSelectionne.variations.find(v => v.taille_id == tailleId && v.couleur_id == couleurId);
    document.getElementById('varStockInfo').textContent = varFound ? `Stock disponible : ${varFound.stock}` : 'Variation non trouvée';
  }
}

function fermerModalVariation() {
  document.getElementById('modalVariation').style.display = 'none';
}

function ajouterAuPanier() {
  const tailleId = document.getElementById('varTaille').value;
  const couleurId = document.getElementById('varCouleur').value;
  const quantite = parseInt(document.getElementById('varQuantite').value) || 1;
  if (!produitSelectionne) return;

  let variation = null;
  if (produitSelectionne.variations && produitSelectionne.variations.length > 0) {
    if (!tailleId || !couleurId) return alert('Veuillez sélectionner une taille et une couleur.');
    variation = produitSelectionne.variations.find(v => v.taille_id == tailleId && v.couleur_id == couleurId);
    if (!variation) return alert('Variation introuvable.');
    if (variation.stock < quantite) return alert(`Stock insuffisant (${variation.stock} disponibles).`);
  }

  const prixVente = variation && variation.prix_vente ? variation.prix_vente : produitSelectionne.prix_vente;
  panier.push({
    produit_id: produitSelectionne.id,
    nom: produitSelectionne.nom,
    variation_id: variation ? variation.id : null,
    taille: variation ? variation.taille : null,
    couleur: variation ? variation.couleur : null,
    quantite,
    prix_unitaire: prixVente
  });

  fermerModalVariation();
  afficherPanier();
}

// Panier
function afficherPanier() {
  if (panier.length === 0) {
    panierContainer.innerHTML = '<p>Panier vide</p>';
  } else {
    panierContainer.innerHTML = panier.map((item, index) => `
      <div class="panier-item">
        <div>
          <div class="item-nom">${item.nom} ${item.taille ? '('+item.taille+(item.couleur?' '+item.couleur:'')+')' : ''}</div>
          <div class="item-quantite">Qté: ${item.quantite} x ${item.prix_unitaire} F</div>
        </div>
        <div class="item-prix">${(item.quantite * item.prix_unitaire).toFixed(2)} F</div>
        <button onclick="supprimerDuPanier(${index})">X</button>
      </div>
    `).join('');
  }
  calculerTotal();
}

function supprimerDuPanier(index) {
  panier.splice(index, 1);
  afficherPanier();
}

function calculerTotal() {
  let total = panier.reduce((sum, item) => sum + (item.quantite * item.prix_unitaire), 0);
  const remise = parseFloat(remiseInput.value) || 0;
  const totalFinal = Math.max(total - remise, 0);
  totalSpan.textContent = totalFinal.toFixed(2);
}

// Client
function afficherFormClient() {
  document.getElementById('clientForm').style.display = 'block';
}

async function creerClientRapide() {
  const nom = document.getElementById('clientNom').value.trim();
  const prenom = document.getElementById('clientPrenom').value.trim();
  const telephone = document.getElementById('clientTelephone').value.trim();
  if (!telephone) return alert('Téléphone requis.');

  try {
    const res = await fetch('/api/vendeur/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nom, prenom, telephone })
    });
    const client = await res.json();
    if (!res.ok) throw new Error(client.message);
    clients.push(client);
    const opt = document.createElement('option');
    opt.value = client.id;
    opt.textContent = `${client.nom || ''} ${client.prenom || ''} - ${client.telephone}`;
    opt.selected = true;
    clientSel.appendChild(opt);
    clientSel.value = client.id;
    document.getElementById('clientForm').style.display = 'none';
    document.getElementById('clientNom').value = '';
    document.getElementById('clientPrenom').value = '';
    document.getElementById('clientTelephone').value = '';
  } catch (err) {
    alert(err.message);
  }
}

// Validation vente
async function validerVente() {
  if (panier.length === 0) return alert('Panier vide.');
  const clientId = clientSel.value || null;
  const modePaiementId = modePaiementSel.value;
  if (!modePaiementId) return alert('Sélectionnez un mode de paiement.');
  const remise = parseFloat(remiseInput.value) || 0;

  const data = {
    client_id: clientId ? parseInt(clientId) : null,
    mode_paiement_id: parseInt(modePaiementId),
    remise,
    lignes: panier.map(item => ({
      produit_id: item.produit_id,
      variation_id: item.variation_id,
      quantite: item.quantite,
      prix_unitaire: item.prix_unitaire
    }))
  };

  try {
    const res = await fetch('/api/vendeur/ventes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Erreur');

    panier = [];
    afficherPanier();
    remiseInput.value = 0;
    document.getElementById('messageVente').textContent = `✅ Vente ${result.reference_vente} enregistrée !`;

    // Ouvrir le ticket
    window.open(`ticket.html?id=${result.id}`, '_blank', 'width=400,height=600');
  } catch (err) {
    document.getElementById('messageVente').textContent = err.message;
  }
}