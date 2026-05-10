document.addEventListener('DOMContentLoaded', async function() {
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  try {
    const response = await fetch('/admin/sidebar.html');
    const html = await response.text();
    container.innerHTML = html;
    
    // Marquer comme actif le lien correspondant à la page courante
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('active');
      }
    });
  } catch (err) {
    console.error('Erreur chargement sidebar :', err);
  }
});