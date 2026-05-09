const modal = document.getElementById('modalItem');
const form = document.getElementById('formItem');
const closeBtn = document.querySelector('.close');

document.getElementById('btnAjouter').addEventListener('click', () => {
  document.getElementById('itemId').value = '';
  document.getElementById('libelle').value = '';
  document.getElementById('modalTitle').textContent = 'Ajouter une couleur';
  modal.style.display = 'flex';
});
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('itemId').value;
  const libelle = document.getElementById('libelle').value.trim();
  const url = id ? `/api/admin/couleurs/${id}` : '/api/admin/couleurs';
  const method = id ? 'PUT' : 'POST';
  try {
    const res = await apiFetch(url, { method, body: JSON.stringify({ libelle }) });
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
  const res = await apiFetch('/api/admin/couleurs');
  const items = await res.json();
  const tbody = document.getElementById('itemsBody');
  tbody.innerHTML = items.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.libelle}</td>
      <td>
        <button onclick="modifierItem(${c.id})">Modifier</button>
        <button onclick="supprimerItem(${c.id})" class="btn-danger">Supprimer</button>
      </td>
    </tr>
  `).join('');
}

async function modifierItem(id) {
  const res = await apiFetch('/api/admin/couleurs');
  const items = await res.json();
  const item = items.find(c => c.id == id);
  if (!item) return;
  document.getElementById('itemId').value = item.id;
  document.getElementById('libelle').value = item.libelle;
  document.getElementById('modalTitle').textContent = 'Modifier la couleur';
  modal.style.display = 'flex';
}

async function supprimerItem(id) {
  if (!confirm('Supprimer cette couleur ?')) return;
  try {
    const res = await apiFetch(`/api/admin/couleurs/${id}`, { method: 'DELETE' });
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