/**
 * Fonction utilitaire pour les appels API avec JWT.
 * Ajoute automatiquement le token et gère les erreurs de session.
 */
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/admin/login.html';
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(url, { ...options, headers });

  // Si le serveur répond 401/403, la session est invalide/expirée
  if (response.status === 401 || response.status === 403) {
    localStorage.clear();
    window.location.href = '/admin/login.html';
    return;
  }

  return response;
}