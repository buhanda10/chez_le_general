const modal = document.getElementById('modalCategorie');
const form = document.getElementById('formCategorie');
const closeBtn = document.querySelector('.close');

document.getElementById('btnAjouter').addEventListener('click', () => {
  document.getElementById('catId').value = '';
  document.getElementById('nom').value = '';
  document.getElementById('description').value = '';
  document.getElementById('modalTitle').textContent = 'Ajouter une catégorie';
  modal.style.display = 'flex';
});
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('catId').value;
  const nom = document.getElementById('nom').value.trim();
  const description = document.getElementById('description').value.trim();
  const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
  const method = id ? 'PUT' : 'POST';
  try {
    const res = await apiFetch(url, { method, body: JSON.stringify({ nom, description }) });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    modal.style.display = 'none';
    chargerCategories();
  } catch (err) {
    alert(err.message);
  }
});

async function chargerCategories() {
  const res = await apiFetch('/api/admin/categories');
  const cats = await res.json();
  const tbody = document.getElementById('catBody');
  tbody.innerHTML = cats.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.nom}</td>
      <td>${c.description || ''}</td>
      <td><span class="badge ${c.statut ? 'actif' : 'inactif'}">${c.statut ? 'Actif' : 'Inactif'}</span></td>
      <td>
        <button onclick="modifierCat(${c.id})">Modifier</button>
        <button onclick="desactiverCat(${c.id})">Désactiver</button>
      </td>
    </tr>
  `).join('');
}

async function modifierCat(id) {
  const res = await apiFetch(`/api/admin/categories/${id}`);
  const cat = await res.json();
  document.getElementById('catId').value = cat.id;
  document.getElementById('nom').value = cat.nom;
  document.getElementById('description').value = cat.description || '';
  document.getElementById('modalTitle').textContent = 'Modifier la catégorie';
  modal.style.display = 'flex';
}

async function desactiverCat(id) {
  if (!confirm('Désactiver cette catégorie ?')) return;
  await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
  chargerCategories();
}

chargerCategories();