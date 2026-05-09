const pool = require('../config/db');

async function logAction(utilisateur_id, action, details = null) {
  try {
    await pool.query(
      'INSERT INTO logs_activite (utilisateur_id, action, details) VALUES ($1, $2, $3)',
      [utilisateur_id, action, details]
    );
  } catch (err) {
    console.error('Erreur enregistrement log :', err);
  }
}

module.exports = logAction;