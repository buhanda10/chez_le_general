const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('admin'));

// GET /api/admin/logs
router.get('/', async (req, res) => {
  const { page = 1, limite = 50, action, utilisateur_id, date_debut, date_fin } = req.query;
  const offset = (page - 1) * limite;
  let where = [];
  let params = [];
  let idx = 1;

  if (action) {
    where.push(`l.action = $${idx++}`);
    params.push(action);
  }
  if (utilisateur_id) {
    where.push(`l.utilisateur_id = $${idx++}`);
    params.push(utilisateur_id);
  }
  if (date_debut) {
    where.push(`l.created_at >= $${idx++}`);
    params.push(date_debut);
  }
  if (date_fin) {
    where.push(`l.created_at <= $${idx++}`);
    params.push(date_fin);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const countQuery = `SELECT count(*) FROM logs_activite l ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT l.id, l.action, l.details, l.created_at,
             u.nom_utilisateur, u.role
      FROM logs_activite l
      LEFT JOIN utilisateurs u ON l.utilisateur_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limite, offset);
    const result = await pool.query(query, params);

    res.json({ total, page: parseInt(page), limite: parseInt(limite), logs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;