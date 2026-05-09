const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('admin'));

// ========== TAILLES ==========
router.get('/tailles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tailles ORDER BY libelle');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/tailles', async (req, res) => {
  const { libelle } = req.body;
  if (!libelle) return res.status(400).json({ message: 'Libellé requis.' });
  try {
    const exist = await pool.query('SELECT id FROM tailles WHERE libelle = $1', [libelle]);
    if (exist.rows.length > 0) return res.status(409).json({ message: 'Cette taille existe déjà.' });
    const result = await pool.query('INSERT INTO tailles (libelle) VALUES ($1) RETURNING *', [libelle]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/tailles/:id', async (req, res) => {
  const { id } = req.params;
  const { libelle } = req.body;
  if (!libelle) return res.status(400).json({ message: 'Libellé requis.' });
  try {
    const exist = await pool.query('SELECT * FROM tailles WHERE id = $1', [id]);
    if (exist.rows.length === 0) return res.status(404).json({ message: 'Taille introuvable.' });
    const duplicate = await pool.query('SELECT id FROM tailles WHERE libelle = $1 AND id != $2', [libelle, id]);
    if (duplicate.rows.length > 0) return res.status(409).json({ message: 'Ce libellé existe déjà.' });
    const result = await pool.query('UPDATE tailles SET libelle = $1 WHERE id = $2 RETURNING *', [libelle, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.delete('/tailles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const usage = await pool.query('SELECT COUNT(*) FROM variations_produit WHERE taille_id = $1', [id]);
    if (parseInt(usage.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cette taille est utilisée par des produits. Impossible de supprimer.' });
    }
    await pool.query('DELETE FROM tailles WHERE id = $1', [id]);
    res.json({ message: 'Taille supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ========== COULEURS ==========
router.get('/couleurs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM couleurs ORDER BY libelle');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/couleurs', async (req, res) => {
  const { libelle } = req.body;
  if (!libelle) return res.status(400).json({ message: 'Libellé requis.' });
  try {
    const exist = await pool.query('SELECT id FROM couleurs WHERE libelle = $1', [libelle]);
    if (exist.rows.length > 0) return res.status(409).json({ message: 'Cette couleur existe déjà.' });
    const result = await pool.query('INSERT INTO couleurs (libelle) VALUES ($1) RETURNING *', [libelle]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/couleurs/:id', async (req, res) => {
  const { id } = req.params;
  const { libelle } = req.body;
  if (!libelle) return res.status(400).json({ message: 'Libellé requis.' });
  try {
    const exist = await pool.query('SELECT * FROM couleurs WHERE id = $1', [id]);
    if (exist.rows.length === 0) return res.status(404).json({ message: 'Couleur introuvable.' });
    const duplicate = await pool.query('SELECT id FROM couleurs WHERE libelle = $1 AND id != $2', [libelle, id]);
    if (duplicate.rows.length > 0) return res.status(409).json({ message: 'Ce libellé existe déjà.' });
    const result = await pool.query('UPDATE couleurs SET libelle = $1 WHERE id = $2 RETURNING *', [libelle, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.delete('/couleurs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const usage = await pool.query('SELECT COUNT(*) FROM variations_produit WHERE couleur_id = $1', [id]);
    if (parseInt(usage.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cette couleur est utilisée par des produits. Impossible de supprimer.' });
    }
    await pool.query('DELETE FROM couleurs WHERE id = $1', [id]);
    res.json({ message: 'Couleur supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;