const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('admin'));

router.get('/tailles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tailles ORDER BY libelle');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/couleurs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM couleurs ORDER BY libelle');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;