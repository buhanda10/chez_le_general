const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('vendeur', 'admin'));

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM modes_paiement WHERE actif = true ORDER BY libelle');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;