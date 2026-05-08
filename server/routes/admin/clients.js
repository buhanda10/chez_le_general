const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('admin'));

// 📋 GET /api/admin/clients - Liste avec recherche
router.get('/', async (req, res) => {
  const { recherche } = req.query;
  let where = 'WHERE actif = true';
  let params = [];

  if (recherche) {
    where += ` AND (nom ILIKE $1 OR prenom ILIKE $1 OR telephone ILIKE $1)`;
    params.push(`%${recherche}%`);
  }

  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, telephone, adresse, actif, created_at
       FROM clients ${where}
       ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// 🔍 GET /api/admin/clients/:id - Détail d’un client + historique des achats
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const clientRes = await pool.query(
      'SELECT id, nom, prenom, telephone, adresse, actif, created_at FROM clients WHERE id = $1',
      [id]
    );
    if (clientRes.rows.length === 0) return res.status(404).json({ message: 'Client introuvable.' });

    const client = clientRes.rows[0];

    // Historique des ventes
    const ventesRes = await pool.query(
      `SELECT v.id, v.reference_vente, v.montant_total, v.remise, v.created_at,
              mp.libelle as mode_paiement
       FROM ventes v
       LEFT JOIN modes_paiement mp ON v.mode_paiement_id = mp.id
       WHERE v.client_id = $1
       ORDER BY v.created_at DESC`,
      [id]
    );
    client.ventes = ventesRes.rows;

    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ➕ POST /api/admin/clients - Création
router.post('/', async (req, res) => {
  const { nom, prenom, telephone, adresse } = req.body;
  if (!telephone) return res.status(400).json({ message: 'Le numéro de téléphone est requis.' });

  try {
    const exist = await pool.query('SELECT id FROM clients WHERE telephone = $1', [telephone]);
    if (exist.rows.length > 0) return res.status(409).json({ message: 'Un client avec ce numéro existe déjà.' });

    const result = await pool.query(
      `INSERT INTO clients (nom, prenom, telephone, adresse)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nom || null, prenom || null, telephone, adresse || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ✏️ PUT /api/admin/clients/:id - Modification
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, telephone, adresse } = req.body;

  try {
    const exist = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (exist.rows.length === 0) return res.status(404).json({ message: 'Client introuvable.' });

    // Vérifier unicité du téléphone (sauf si le même)
    if (telephone && telephone !== exist.rows[0].telephone) {
      const telExist = await pool.query('SELECT id FROM clients WHERE telephone = $1 AND id != $2', [telephone, id]);
      if (telExist.rows.length > 0) return res.status(409).json({ message: 'Ce numéro est déjà utilisé.' });
    }

    const result = await pool.query(
      `UPDATE clients SET nom = $1, prenom = $2, telephone = $3, adresse = $4
       WHERE id = $5 RETURNING *`,
      [
        nom !== undefined ? nom : exist.rows[0].nom,
        prenom !== undefined ? prenom : exist.rows[0].prenom,
        telephone !== undefined ? telephone : exist.rows[0].telephone,
        adresse !== undefined ? adresse : exist.rows[0].adresse,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ❌ DELETE /api/admin/clients/:id - Désactivation
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE clients SET actif = false WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Client introuvable.' });
    res.json({ message: 'Client désactivé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;