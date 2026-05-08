const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifierToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { nom_utilisateur, mot_de_passe } = req.body;

  if (!nom_utilisateur || !mot_de_passe) {
    return res.status(400).json({ message: 'Nom utilisateur et mot de passe requis.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, nom_utilisateur, mot_de_passe, role, actif FROM utilisateurs WHERE nom_utilisateur = $1',
      [nom_utilisateur]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const user = result.rows[0];

    if (!user.actif) {
      return res.status(403).json({ message: 'Compte désactivé.' });
    }

    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    // Mise à jour dernière connexion
    await pool.query('UPDATE utilisateurs SET derniere_connexion = now() WHERE id = $1', [user.id]);

    // Génération token
    const token = jwt.sign(
      { id: user.id, nom_utilisateur: user.nom_utilisateur, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      utilisateur: {
        id: user.id,
        nom_utilisateur: user.nom_utilisateur,
        nom_complet: user.nom_complet,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Route protégée d'exemple (vérification du token)
router.get('/profil', verifierToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom_utilisateur, nom_complet, role FROM utilisateurs WHERE id = $1',
      [req.utilisateur.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;