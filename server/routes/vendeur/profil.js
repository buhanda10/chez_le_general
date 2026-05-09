const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('vendeur'));

// GET /api/vendeur/profil - infos du profil connecté
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nom_utilisateur, nom_complet, telephone FROM utilisateurs WHERE id = $1',
      [req.utilisateur.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// PUT /api/vendeur/profil - modifier mot de passe et infos
router.put('/', async (req, res) => {
  const { mot_de_passe_actuel, nouveau_mot_de_passe, nom_complet, telephone } = req.body;

  try {
    const userRes = await pool.query('SELECT * FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    const user = userRes.rows[0];

    // Si on veut changer le mot de passe, vérifier l'ancien
    if (nouveau_mot_de_passe) {
      if (!mot_de_passe_actuel) {
        return res.status(400).json({ message: 'Veuillez fournir le mot de passe actuel.' });
      }
      const match = await bcrypt.compare(mot_de_passe_actuel, user.mot_de_passe);
      if (!match) {
        return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
      }
    }

    let hashed = user.mot_de_passe;
    if (nouveau_mot_de_passe) {
      hashed = await bcrypt.hash(nouveau_mot_de_passe, 10);
    }

    await pool.query(
      `UPDATE utilisateurs SET mot_de_passe = $1, nom_complet = $2, telephone = $3 WHERE id = $4`,
      [
        hashed,
        nom_complet || user.nom_complet,
        telephone !== undefined ? telephone : user.telephone,
        req.utilisateur.id
      ]
    );

    res.json({ message: 'Profil mis à jour.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;