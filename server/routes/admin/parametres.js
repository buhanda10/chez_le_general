const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('admin'));

// Configuration multer pour le logo
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', '..', 'public', 'uploads'),
  filename: (req, file, cb) => {
    cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
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

// GET /api/admin/parametres
router.get('/', async (req, res) => {
  try {
    let result = await pool.query('SELECT * FROM parametres WHERE id = 1');
    if (result.rows.length === 0) {
      // Création de la ligne par défaut si absente
      await pool.query("INSERT INTO parametres (id) VALUES (1) ON CONFLICT DO NOTHING");
      result = await pool.query('SELECT * FROM parametres WHERE id = 1');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// PUT /api/admin/parametres
router.put('/', async (req, res) => {
  const { nom_boutique, devise, taux_tva, telephone, adresse } = req.body;
  try {
    await pool.query(
      `UPDATE parametres SET 
        nom_boutique = $1,
        devise = $2,
        taux_tva = $3,
        telephone = $4,
        adresse = $5
       WHERE id = 1`,
      [
        nom_boutique || 'Ma Boutique',
        devise || 'FCFA',
        taux_tva || 0,
        telephone || null,
        adresse || null
      ]
    );
    const result = await pool.query('SELECT * FROM parametres WHERE id = 1');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/admin/parametres/logo - Upload logo
router.post('/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier.' });
  const url = `/uploads/${req.file.filename}`;
  try {
    await pool.query('UPDATE parametres SET logo = $1 WHERE id = 1', [url]);
    res.json({ logo: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;