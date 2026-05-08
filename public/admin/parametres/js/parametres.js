document.addEventListener('DOMContentLoaded', async () => {
  await chargerParametres();

  document.getElementById('btnUploadLogo').addEventListener('click', uploadLogo);

  document.getElementById('formParametres').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nom_boutique: document.getElementById('nom_boutique').value.trim(),
      devise: document.getElementById('devise').value.trim(),
      taux_tva: parseFloat(document.getElementById('taux_tva').value) || 0,
      telephone: document.getElementById('telephone').value.trim(),
      adresse: document.getElementById('adresse').value.trim()
    };
    const message = document.getElementById('message');
    try {
      const res = await apiFetch('/api/admin/parametres', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Erreur');
      message.style.color = 'green';
      message.textContent = 'Paramètres enregistrés !';
    } catch (err) {
      message.textContent = err.message;
    }
  });
});

async function chargerParametres() {
  try {
    const res = await apiFetch('/api/admin/parametres');
    const params = await res.json();
    document.getElementById('nom_boutique').value = params.nom_boutique || '';
    document.getElementById('devise').value = params.devise || '';
    document.getElementById('taux_tva').value = params.taux_tva || 0;
    document.getElementById('telephone').value = params.telephone || '';
    document.getElementById('adresse').value = params.adresse || '';
    const logo = params.logo || '';
    document.getElementById('logoPreview').src = logo || '';
  } catch (err) {
    console.error(err);
  }
}

async function uploadLogo() {
  const fileInput = document.getElementById('logoInput');
  if (!fileInput.files[0]) return alert('Sélectionnez une image');
  const formData = new FormData();
  formData.append('logo', fileInput.files[0]);
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/parametres/logo', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    document.getElementById('logoPreview').src = data.logo;
    alert('Logo mis à jour !');
  } catch (err) {
    alert(err.message);
  }
}