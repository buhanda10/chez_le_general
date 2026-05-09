const modal = document.getElementById('modalItem');
const form = document.getElementById('formItem');
const closeBtn = document.querySelector('.close');

document.getElementById('btnAjouter').addEventListener('click', () => {
  document.getElementById('itemId').value = '';
  document.getElementById('libelle').value = '';
  document.getElementById('groupeStatut').style.display = 'none';
  document.getElementById('modalTitle').textContent = 'Ajouter un mode de paiement';
  modal.style.display = 'flex';
});

closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('itemId').value;
  const libelle = document.getElementById('libelle').value.trim();
  const url = id ? `/api/admin/modes-paiement/${id}` : '/api/admin/modes-paiement';
  const method = id ? 'PUT' : 'POST';

  const body = { libelle };
  if (id) {
    body.actif = document.getElementById('actif').value === 'true';
  }

  try {
    const res = await apiFetch(url, { method, body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    modal.style.display = 'none';
    chargerItems();
  } catch (err) {
    alert(err.message);
  }
});

async function chargerItems() {
  const res = await apiFetch('/api/admin/modes-paiement');
  const items = await res.json();
  const tbody = document.getElementById('itemsBody');
  tbody.innerHTML = items.map(mp => `
    <tr>
      <td>${mp.id}</td>
      <td>${mp.libelle}</td>
      <td><span class="badge ${mp.actif ? 'actif' : 'inactif'}">${mp.actif ? 'Actif' : 'Inactif'}</span></td>
      <td>
        <button onclick="modifierItem(${mp.id})">Modifier</button>
        ${mp.actif ? `<button onclick="desactiverItem(${mp.id})" class="btn-danger">Désactiver</button>` : ''}
      </td>
    </tr>
  `).join('');
}

async function modifierItem(id) {
  const res = await apiFetch('/api/admin/modes-paiement');
  const items = await res.json();
  const item = items.find(m => m.id == id);
  if (!item) return;
  document.getElementById('itemId').value = item.id;
  document.getElementById('libelle').value = item.libelle;
  document.getElementById('actif').value = item.actif.toString();
  document.getElementById('groupeStatut').style.display = 'block';
  document.getElementById('modalTitle').textContent = 'Modifier le mode de paiement';
  modal.style.display = 'flex';
}

async function desactiverItem(id) {
  if (!confirm('Désactiver ce mode de paiement ?')) return;
  try {
    const res = await apiFetch(`/api/admin/modes-paiement/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    chargerItems();
  } catch (err) {
    alert(err.message);
  }
}

chargerItems();