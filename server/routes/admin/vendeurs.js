const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');
const logAction = require('../../utils/logger');

router.use(verifierToken);
router.use(verifierRole('admin'));

// Configuration de multer pour les photos de vendeurs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', '..', 'public', 'uploads', 'photos_vendeurs'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'vendeur-' + req.params.id + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'));
  }
});

//  Liste des vendeurs (avec email)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nom_utilisateur, nom_complet, telephone, email, actif, derniere_connexion, created_at
       FROM utilisateurs WHERE role = 'vendeur'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Détail d'un vendeur (tous les champs)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, nom_utilisateur, nom_complet, telephone, email, adresse, photo, actif, derniere_connexion, created_at
       FROM utilisateurs WHERE id = $1 AND role = 'vendeur'`,
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

//  Création (inchangé, mais on peut ajouter email/adresse/photo plus tard)
router.post('/', async (req, res) => {
  const { nom_utilisateur, mot_de_passe, nom_complet, telephone } = req.body;
  if (!nom_utilisateur || !mot_de_passe) {
    return res.status(400).json({ message: 'Nom utilisateur et mot de passe requis.' });
  }
  try {
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
  logAction(req.utilisateur.id, 'Création vendeur', `Le vendeur ${nom_utilisateur} a été créé.`);
});

//  Modification (ajout des champs adresse, email, photo)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nom_utilisateur, mot_de_passe, nom_complet, telephone, email, adresse, actif } = req.body;
  try {
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
       SET nom_utilisateur = $1, mot_de_passe = $2, nom_complet = $3, telephone = $4,
           email = $5, adresse = $6, actif = $7
       WHERE id = $8 AND role = 'vendeur'
       RETURNING id, nom_utilisateur, nom_complet, telephone, email, adresse, photo, actif, derniere_connexion, created_at`,
      [
        nom_utilisateur || exist.rows[0].nom_utilisateur,
        hashed,
        nom_complet || exist.rows[0].nom_complet,
        telephone !== undefined ? telephone : exist.rows[0].telephone,
        email !== undefined ? email : exist.rows[0].email,
        adresse !== undefined ? adresse : exist.rows[0].adresse,
        actif !== undefined ? actif : exist.rows[0].actif,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
    }
    res.status(500).json({ message: 'Erreur serveur.' });
  }
  logAction(req.utilisateur.id, 'Modification vendeur', `Le vendeur ${nom_utilisateur} a été modifié.`);
});

//  Upload photo de profil
router.put('/:id/photo', upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  try {
    const exist = await pool.query('SELECT id FROM utilisateurs WHERE id = $1 AND role = $2', [id, 'vendeur']);
    if (exist.rows.length === 0) {
      return res.status(404).json({ message: 'Vendeur introuvable.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie.' });
    }
    const photoUrl = `/uploads/photos_vendeurs/${req.file.filename}`;
    await pool.query('UPDATE utilisateurs SET photo = $1 WHERE id = $2', [photoUrl, id]);
    res.json({ photo: photoUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

//  Désactiver (soft delete)
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
    res.json({ message: 'Vendeur désactivé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
  logAction(req.utilisateur.id, 'Désactivation vendeur', `Le vendeur d'ID ${id} a été désactivé.`);
});

module.exports = router;