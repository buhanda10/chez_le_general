let charts = {};

document.addEventListener('DOMContentLoaded', function() {
  // Vérification session
  const token = localStorage.getItem('token');
  const utilisateur = JSON.parse(localStorage.getItem('utilisateur'));

  if (!token || !utilisateur) {
    window.location.href = 'login.html';
    return;
  }

  fetch('/api/auth/profil', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error('Session invalide');
    return res.json();
  })
  .then(user => {
    document.getElementById('userDisplay').textContent = `👤 ${user.nom_complet}`;
  })
  .catch(() => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // Bouton déconnexion
  document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // Chargement initial du dashboard
  chargerDonneesDashboard();

  // Écouteur pour changement de période et actualisation
  document.getElementById('periodeSelect').addEventListener('change', chargerDonneesDashboard);
  document.getElementById('btnActualiser').addEventListener('click', chargerDonneesDashboard);
});

async function chargerDonneesDashboard() {
  const periode = document.getElementById('periodeSelect').value;
  let date_debut, date_fin;

  const today = new Date();
  const format = (d) => d.toISOString().split('T')[0];

  switch (periode) {
    case '7j':
      date_debut = format(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
      date_fin = format(today);
      break;
    case '30j':
      date_debut = format(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
      date_fin = format(today);
      break;
    case 'aujourdhui':
      date_debut = format(today);
      date_fin = format(today);
      break;
    case 'tout':
    default:
      date_debut = '';
      date_fin = '';
  }

  try {
    // Récupération du résumé avec période
    const params = new URLSearchParams();
    if (date_debut) params.append('date_debut', date_debut);
    if (date_fin) params.append('date_fin', date_fin);
    
    const resumeRes = await fetch(`/api/admin/rapports/resume?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const resume = await resumeRes.json();

    // Nombre de vendeurs actifs
    const vendeursRes = await fetch('/api/admin/vendeurs', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const vendeurs = await vendeursRes.json();
    const vendeursActifs = vendeurs.filter(v => v.actif).length;

    // Stock faible (alertes)
    const alertesRes = await fetch('/api/admin/stock/faible', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const alertes = await alertesRes.json();
    const nbAlertes = alertes.length;

    // Affichage KPI
    document.getElementById('kpiContainer').innerHTML = `
      <div class="kpi-box"><div class="kpi-value">${resume.nb_ventes || 0}</div><div class="kpi-label">Ventes</div></div>
      <div class="kpi-box"><div class="kpi-value">${parseFloat(resume.chiffre_affaires || 0).toLocaleString()} F</div><div class="kpi-label">CA brut</div></div>
      <div class="kpi-box"><div class="kpi-value">${parseFloat(resume.panier_moyen || 0).toFixed(2)} F</div><div class="kpi-label">Panier moyen</div></div>
      <div class="kpi-box"><div class="kpi-value">${resume.nb_clients || 0}</div><div class="kpi-label">Clients actifs</div></div>
      <div class="kpi-box"><div class="kpi-value" style="color:${nbAlertes > 0 ? '#e94560' : '#2ecc71'}">${nbAlertes}</div><div class="kpi-label">Alertes stock</div></div>
    `;

    // Graphique ventes par jour
    const ventesRes = await fetch(`/api/admin/rapports/ventes-par-periode?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const ventesData = await ventesRes.json();
    construireGraphVentes(ventesData);

    // Top produits
    const topRes = await fetch(`/api/admin/rapports/top-produits?limite=5${date_debut ? '&date_debut='+date_debut : ''}${date_fin ? '&date_fin='+date_fin : ''}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const topData = await topRes.json();
    construireGraphTopProduits(topData);

  } catch (err) {
    console.error('Erreur chargement dashboard:', err);
  }
}

function construireGraphVentes(data) {
  const labels = data.map(d => d.date);
  const values = data.map(d => parseFloat(d.total));

  if (charts.ventesJour) charts.ventesJour.destroy();
  const ctx = document.getElementById('chartVentesJour').getContext('2d');
  charts.ventesJour = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'CA (FCFA)',
        data: values,
        borderColor: '#4a6cf7',
        backgroundColor: 'rgba(74,108,247,0.1)',
        fill: true,
        tension: 0.2
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function construireGraphTopProduits(data) {
  const labels = data.map(p => p.nom);
  const values = data.map(p => parseInt(p.total_vendus));

  if (charts.topProduits) charts.topProduits.destroy();
  const ctx = document.getElementById('chartTopProduits').getContext('2d');
  charts.topProduits = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Qté vendue',
        data: values,
        backgroundColor: '#4a6cf7'
      }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}