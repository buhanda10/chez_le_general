let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnAppliquer').addEventListener('click', chargerTout);
  chargerTout();
});

async function chargerTout() {
  const date_debut = document.getElementById('date_debut').value;
  const date_fin = document.getElementById('date_fin').value;

  // Résumé
  const resume = await chargerResume(date_debut, date_fin);
  afficherKPI(resume);

  // Graphiques
  chargerVentesJour(date_debut, date_fin);
  chargerTopProduits(date_debut, date_fin);
  chargerPerformanceVendeurs(date_debut, date_fin);
  chargerRepPaiement(date_debut, date_fin);
}

async function chargerResume(dd, df) {
  const params = new URLSearchParams();
  if (dd) params.append('date_debut', dd);
  if (df) params.append('date_fin', df);
  const url = '/api/admin/rapports/resume' + (params.toString() ? '?' + params.toString() : '');
  const res = await apiFetch(url);
  return res.json();
}

function afficherKPI(r) {
  document.getElementById('kpiContainer').innerHTML = `
    <div class="kpi-box"><div class="kpi-value">${r.nb_ventes || 0}</div><div class="kpi-label">Ventes</div></div>
    <div class="kpi-box"><div class="kpi-value">${parseFloat(r.chiffre_affaires || 0).toLocaleString()} F</div><div class="kpi-label">CA brut</div></div>
    <div class="kpi-box"><div class="kpi-value">${parseFloat(r.total_net || 0).toLocaleString()} F</div><div class="kpi-label">CA net</div></div>
    <div class="kpi-box"><div class="kpi-value">${parseFloat(r.panier_moyen || 0).toFixed(2)} F</div><div class="kpi-label">Panier moyen</div></div>
    <div class="kpi-box"><div class="kpi-value">${r.nb_clients || 0}</div><div class="kpi-label">Clients actifs</div></div>
  `;
}

async function chargerVentesJour(dd, df) {
  const params = new URLSearchParams();
  if (dd) params.append('date_debut', dd);
  if (df) params.append('date_fin', df);
  const res = await apiFetch('/api/admin/rapports/ventes-par-periode?' + params.toString());
  const data = await res.json();

  const labels = data.map(d => d.date);
  const values = data.map(d => parseFloat(d.total));

  if (charts.ventesJour) charts.ventesJour.destroy();
  const ctx = document.getElementById('chartVentesJour').getContext('2d');
  charts.ventesJour = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'CA (FCFA)', data: values, borderColor: '#4a6cf7', fill: false, tension: 0.2 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

async function chargerTopProduits(dd, df) {
  let url = '/api/admin/rapports/top-produits?limite=7';
  if (dd) url += `&date_debut=${dd}`;
  if (df) url += `&date_fin=${df}`;
  const res = await apiFetch(url);
  const data = await res.json();

  const labels = data.map(p => p.nom);
  const values = data.map(p => parseInt(p.total_vendus));

  if (charts.topProduits) charts.topProduits.destroy();
  const ctx = document.getElementById('chartTopProduits').getContext('2d');
  charts.topProduits = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Qté vendue', data: values, backgroundColor: '#4a6cf7' }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

async function chargerPerformanceVendeurs(dd, df) {
  const params = new URLSearchParams();
  if (dd) params.append('date_debut', dd);
  if (df) params.append('date_fin', df);
  const res = await apiFetch('/api/admin/rapports/performance-vendeurs?' + params.toString());
  const data = await res.json();

  const labels = data.map(v => v.nom_complet);
  const caValues = data.map(v => parseFloat(v.ca));

  if (charts.vendeurs) charts.vendeurs.destroy();
  const ctx = document.getElementById('chartVendeurs').getContext('2d');
  charts.vendeurs = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'CA (FCFA)', data: caValues, backgroundColor: '#1a1a2e' }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

async function chargerRepPaiement(dd, df) {
  const params = new URLSearchParams();
  if (dd) params.append('date_debut', dd);
  if (df) params.append('date_fin', df);
  const res = await apiFetch('/api/admin/rapports/rep-paiement?' + params.toString());
  const data = await res.json();

  const labels = data.map(p => p.libelle);
  const values = data.map(p => parseInt(p.nb));

  if (charts.paiement) charts.paiement.destroy();
  const ctx = document.getElementById('chartPaiement').getContext('2d');
  charts.paiement = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: ['#4a6cf7', '#1a1a2e', '#e94560', '#2ecc71', '#f39c12'] }]
    }
  });
}