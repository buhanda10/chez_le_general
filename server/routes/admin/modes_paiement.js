const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('admin'));

// GET - Liste de tous les modes de paiement (actifs et inactifs)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM modes_paiement ORDER BY libelle');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST - Création
router.post('/', async (req, res) => {
  const { libelle } = req.body;
  if (!libelle) return res.status(400).json({ message: 'Libellé requis.' });
  try {
    const exist = await pool.query('SELECT id FROM modes_paiement WHERE libelle = $1', [libelle]);
    if (exist.rows.length > 0) return res.status(409).json({ message: 'Ce mode de paiement existe déjà.' });
    const result = await pool.query(
      'INSERT INTO modes_paiement (libelle, actif) VALUES ($1, true) RETURNING *',
      [libelle]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// PUT - Modification (libellé + actif)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { libelle, actif } = req.body;
  if (!libelle) return res.status(400).json({ message: 'Libellé requis.' });
  try {
    const exist = await pool.query('SELECT * FROM modes_paiement WHERE id = $1', [id]);
    if (exist.rows.length === 0) return res.status(404).json({ message: 'Mode de paiement introuvable.' });

    // Vérifier unicité libellé (sauf lui-même)
    const duplicate = await pool.query('SELECT id FROM modes_paiement WHERE libelle = $1 AND id != $2', [libelle, id]);
    if (duplicate.rows.length > 0) return res.status(409).json({ message: 'Ce libellé existe déjà.' });

    const result = await pool.query(
      'UPDATE modes_paiement SET libelle = $1, actif = $2 WHERE id = $3 RETURNING *',
      [libelle, actif !== undefined ? actif : exist.rows[0].actif, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// DELETE - Désactivation (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE modes_paiement SET actif = false WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Mode de paiement introuvable.' });
    res.json({ message: 'Mode de paiement désactivé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;