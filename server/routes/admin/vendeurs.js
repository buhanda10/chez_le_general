const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

// Middleware : toutes les routes nécessitent d'être admin
router.use(verifierToken);
router.use(verifierRole('admin'));

//GET /api/admin/vendeurs - Liste de tous les vendeurs (sauf admin)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nom_utilisateur, nom_complet, telephone, actif, derniere_connexion, created_at
       FROM utilisateurs
       WHERE role = 'vendeur'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// 🔍 GET /api/admin/vendeurs/:id - Détail d'un vendeur
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, nom_utilisateur, nom_complet, telephone, actif, derniere_connexion, created_at
       FROM utilisateurs
       WHERE id = $1 AND role = 'vendeur'`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vendeur introuvable.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/admin/vendeurs - Créer un vendeur
router.post('/', async (req, res) => {
  const { nom_utilisateur, mot_de_passe, nom_complet, telephone } = req.body;

  if (!nom_utilisateur || !mot_de_passe) {
    return res.status(400).json({ message: 'Nom utilisateur et mot de passe requis.' });
  }

  try {
    // Vérifier si le nom existe déjà
    const exist = await pool.query('SELECT id FROM utilisateurs WHERE nom_utilisateur = $1', [nom_utilisateur]);
    if (exist.rows.length > 0) {
      return res.status(409).json({ message: 'Ce nom d\'utilisateur existe déjà.' });
    }

    const hashed = await bcrypt.hash(mot_de_passe, 10);

    const result = await pool.query(
      `INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe, nom_complet, telephone, role)
       VALUES ($1, $2, $3, $4, 'vendeur')
       RETURNING id, nom_utilisateur, nom_complet, telephone, actif, created_at`,
      [nom_utilisateur, hashed, nom_complet || null, telephone || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// PUT /api/admin/vendeurs/:id - Modifier un vendeur
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nom_utilisateur, mot_de_passe, nom_complet, telephone, actif } = req.body;

  try {
    // Vérifier que le vendeur existe
    const exist = await pool.query('SELECT * FROM utilisateurs WHERE id = $1 AND role = $2', [id, 'vendeur']);
    if (exist.rows.length === 0) {
      return res.status(404).json({ message: 'Vendeur introuvable.' });
    }

    let hashed = exist.rows[0].mot_de_passe;
    if (mot_de_passe && mot_de_passe.trim() !== '') {
      hashed = await bcrypt.hash(mot_de_passe, 10);
    }

    const result = await pool.query(
      `UPDATE utilisateurs
       SET nom_utilisateur = $1,
           mot_de_passe = $2,
           nom_complet = $3,
           telephone = $4,
           actif = $5
       WHERE id = $6 AND role = 'vendeur'
       RETURNING id, nom_utilisateur, nom_complet, telephone, actif, derniere_connexion, created_at`,
      [nom_utilisateur || exist.rows[0].nom_utilisateur,
       hashed,
       nom_complet || exist.rows[0].nom_complet,
       telephone !== undefined ? telephone : exist.rows[0].telephone,
       actif !== undefined ? actif : exist.rows[0].actif,
       id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
    }
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// DELETE /api/admin/vendeurs/:id - Désactiver un vendeur (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE utilisateurs SET actif = false WHERE id = $1 AND role = 'vendeur' RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vendeur introuvable.' });
    }
    res.json({ message: 'Vendeur désactivé avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;