const params = new URLSearchParams(window.location.search);
const id = params.get('id');
if (!id) window.location.href = 'index.html';

document.addEventListener('DOMContentLoaded', async () => {
  const res = await apiFetch(`/api/admin/clients/${id}`);
  const client = await res.json();
  document.getElementById('clientId').value = client.id;
  document.getElementById('nom').value = client.nom || '';
  document.getElementById('prenom').value = client.prenom || '';
  document.getElementById('telephone').value = client.telephone || '';
  document.getElementById('adresse').value = client.adresse || '';
});

document.getElementById('formModifier').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    nom: document.getElementById('nom').value.trim(),
    prenom: document.getElementById('prenom').value.trim(),
    telephone: document.getElementById('telephone').value.trim(),
    adresse: document.getElementById('adresse').value.trim()
  };
  const message = document.getElementById('message');
  try {
    const res = await apiFetch(`/api/admin/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    message.style.color = 'green';
    message.textContent = 'Client mis à jour !';
  } catch (err) {
    message.textContent = err.message;
  }
});