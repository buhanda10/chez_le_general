const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('vendeur', 'admin'));

// GET tous les clients actifs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, prenom, telephone FROM clients WHERE actif = true ORDER BY nom'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST créer un client
router.post('/', async (req, res) => {
  const { nom, prenom, telephone } = req.body;
  if (!telephone) return res.status(400).json({ message: 'Téléphone requis.' });
  try {
    const exist = await pool.query('SELECT id FROM clients WHERE telephone = $1', [telephone]);
    if (exist.rows.length > 0) return res.status(409).json({ message: 'Numéro déjà utilisé.' });
    const result = await pool.query(
      'INSERT INTO clients (nom, prenom, telephone) VALUES ($1, $2, $3) RETURNING *',
      [nom || null, prenom || null, telephone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;