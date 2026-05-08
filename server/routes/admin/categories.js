const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('admin'));

// GET toutes les catégories
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY nom');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET une catégorie
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Catégorie introuvable.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST créer
router.post('/', async (req, res) => {
  const { nom, description } = req.body;
  if (!nom) return res.status(400).json({ message: 'Le nom est requis.' });
  try {
    const exist = await pool.query('SELECT id FROM categories WHERE nom = $1', [nom]);
    if (exist.rows.length > 0) return res.status(409).json({ message: 'Cette catégorie existe déjà.' });
    const result = await pool.query(
      'INSERT INTO categories (nom, description) VALUES ($1, $2) RETURNING *',
      [nom, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// PUT modifier
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, description, statut } = req.body;
  try {
    const exist = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (exist.rows.length === 0) return res.status(404).json({ message: 'Catégorie introuvable.' });
    const result = await pool.query(
      `UPDATE categories SET nom = $1, description = $2, statut = $3 WHERE id = $4 RETURNING *`,
      [nom || exist.rows[0].nom, description !== undefined ? description : exist.rows[0].description,
       statut !== undefined ? statut : exist.rows[0].statut, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ message: 'Ce nom existe déjà.' });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// DELETE (désactiver)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE categories SET statut = false WHERE id = $1', [id]);
    res.json({ message: 'Catégorie désactivée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;