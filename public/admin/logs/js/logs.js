let page = 1;
const limite = 50;

document.addEventListener('DOMContentLoaded', async () => {
  await chargerUtilisateursSelect();
  chargerLogs();
  document.getElementById('btnFiltrer').addEventListener('click', () => {
    page = 1;
    chargerLogs();
  });
});

async function chargerUtilisateursSelect() {
  try {
    const res = await apiFetch('/api/admin/vendeurs');
    const vendeurs = await res.json();
    // Ajouter aussi admin(s) ? On pourrait ajouter l'admin manuellement ou créer une route qui renvoie tous les utilisateurs.
    // Pour simplifier, on va uniquement lister les vendeurs déjà chargés + admin en dur.
    const select = document.getElementById('utilisateur_id');
    // Ajouter admin par défaut (id=1 à priori, mais on va faire une route rapide pour tous les utilisateurs)
    // On va plutôt faire un fetch direct de la liste des utilisateurs depuis une nouvelle route rapide.
    // On va ajouter une route GET /api/admin/utilisateurs (simple) qu'on va créer.
    const allUsersRes = await apiFetch('/api/admin/utilisateurs'); // à créer
    const allUsers = await allUsersRes.json();
    allUsers.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.nom_utilisateur} (${u.role})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

async function chargerLogs() {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limite', limite);
  const date_debut = document.getElementById('date_debut').value;
  const date_fin = document.getElementById('date_fin').value;
  const action = document.getElementById('action').value;
  const utilisateur_id = document.getElementById('utilisateur_id').value;
  if (date_debut) params.append('date_debut', date_debut);
  if (date_fin) params.append('date_fin', date_fin);
  if (action) params.append('action', action);
  if (utilisateur_id) params.append('utilisateur_id', utilisateur_id);

  const res = await apiFetch(`/api/admin/logs?${params.toString()}`);
  const data = await res.json();
  afficherLogs(data);
}

function afficherLogs(data) {
  const tbody = document.getElementById('logsBody');
  tbody.innerHTML = data.logs.map(l => `
    <tr>
      <td>${new Date(l.created_at).toLocaleString()}</td>
      <td>${l.nom_utilisateur || 'Système'} (${l.role || '-'})</td>
      <td>${l.action}</td>
      <td>${l.details || ''}</td>
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
  chargerLogs();
}