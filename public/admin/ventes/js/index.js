let page = 1;
const limite = 25;

document.addEventListener('DOMContentLoaded', async () => {
  await chargerSelects();
  chargerVentes();
  document.getElementById('btnFiltrer').addEventListener('click', () => { page = 1; chargerVentes(); });
  document.getElementById('btnExport').addEventListener('click', exporterCSV);
});

async function chargerSelects() {
  try {
    // Vendeurs (role vendeur)
    const vendRes = await apiFetch('/api/admin/vendeurs');
    const vendeurs = await vendRes.json();
    const selectVend = document.getElementById('vendeur_id');
    vendeurs.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.nom_complet;
      selectVend.appendChild(opt);
    });

    // Clients
    const cliRes = await apiFetch('/api/admin/clients'); // on va créer cette route
    const clients = await cliRes.json();
    const selectCli = document.getElementById('client_id');
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.nom || ''} ${c.prenom || ''} - ${c.telephone}`;
      selectCli.appendChild(opt);
    });

    // Modes de paiement
    const mpRes = await apiFetch('/api/admin/modes-paiement'); // autre petite route
    const mps = await mpRes.json();
    const selectMp = document.getElementById('mode_paiement_id');
    mps.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.libelle;
      selectMp.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

async function chargerVentes() {
  const params = {
    page,
    limite,
    date_debut: document.getElementById('date_debut').value,
    date_fin: document.getElementById('date_fin').value,
    vendeur_id: document.getElementById('vendeur_id').value,
    client_id: document.getElementById('client_id').value,
    mode_paiement_id: document.getElementById('mode_paiement_id').value,
    recherche: document.getElementById('recherche').value
  };
  const query = Object.entries(params).filter(([k,v]) => v).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const res = await apiFetch(`/api/admin/ventes?${query}`);
  const data = await res.json();
  afficherVentes(data);
}

async function annulerVente(id) {
  const motif = prompt('Motif de l\'annulation :');
  if (motif === null) return; // annulé par l'utilisateur
  try {
    const res = await apiFetch(`/api/admin/ventes/${id}/annuler`, {
      method: 'POST',
      body: JSON.stringify({ motif: motif || '' })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    alert('✅ Vente annulée');
    chargerVentes(); // recharger la page
  } catch (err) {
    alert(err.message);
  }
}

function afficherVentes(data) {
  const tbody = document.getElementById('ventesBody');
  tbody.innerHTML = data.ventes.map(v => `
    <tr>
      <td>${v.reference_vente}</td>
      <td>${new Date(v.created_at).toLocaleString()}</td>
      <td>${v.montant_total}</td>
      <td>${v.remise}</td>
      <td>${v.vendeur_nom || '-'}</td>
      <td>${v.client_nom || ''} ${v.client_prenom || ''}</td>
      <td>${v.mode_paiement || '-'}</td>
      <td><a href="details.html?id=${v.id}" class="btn-link">Détails</a>
        ${!v.annulee ? `<button onclick="annulerVente(${v.id})" class="btn btn-link">Annuler</button>` : '<span style="color:red;>Annulée</span>'}
      </td>
    </tr>
  `).join('');

  const pagDiv = document.getElementById('pagination');
  const totalPages = Math.ceil(data.total / data.limite);
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button onclick="allerPage(${i})" ${i === data.page ? 'disabled' : ''}>${i}</button>`;
  }
  pagDiv.innerHTML = html;
}

function allerPage(p) {
  page = p;
  chargerVentes();
}

async function exporterCSV() {
  const date_debut = document.getElementById('date_debut').value;
  const date_fin = document.getElementById('date_fin').value;
  const vendeur_id = document.getElementById('vendeur_id').value;
  const query = `date_debut=${date_debut}&date_fin=${date_fin}&vendeur_id=${vendeur_id}`;
  window.open(`/api/admin/ventes/export/csv?${query}`, '_blank');
}