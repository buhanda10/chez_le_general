document.getElementById('formClient').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    nom: document.getElementById('nom').value.trim(),
    prenom: document.getElementById('prenom').value.trim(),
    telephone: document.getElementById('telephone').value.trim(),
    adresse: document.getElementById('adresse').value.trim()
  };
  const message = document.getElementById('message');
  try {
    const res = await apiFetch('/api/admin/clients', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Erreur');
    message.style.color = 'green';
    message.textContent = 'Client créé ! Redirection...';
    setTimeout(() => window.location.href = 'index.html', 1500);
  } catch (err) {
    message.textContent = err.message;
  }
});