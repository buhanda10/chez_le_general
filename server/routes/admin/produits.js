const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');
const { logAction } = require('../../utils/logger');

router.use(verifierToken);
router.use(verifierRole('admin'));

// Configuration multer pour les images produits
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', '..', 'public', 'uploads', 'produits'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'produit-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'));
  }
});

// GET tous les produits avec catégorie et première image
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.nom as categorie_nom,
        (SELECT url FROM images_produit WHERE produit_id = p.id ORDER BY ordre LIMIT 1) as image_principale
      FROM produits p
      LEFT JOIN categories c ON p.categorie_id = c.id
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET un produit détaillé avec variations et images
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const produitQuery = 'SELECT * FROM produits WHERE id = $1';
    const produitResult = await pool.query(produitQuery, [id]);
    if (produitResult.rows.length === 0) return res.status(404).json({ message: 'Produit introuvable.' });
    const produit = produitResult.rows[0];

    // Variations
    const variationsQuery = `
      SELECT v.id, v.stock, v.prix_vente, t.libelle as taille, c.libelle as couleur
      FROM variations_produit v
      LEFT JOIN tailles t ON v.taille_id = t.id
      LEFT JOIN couleurs c ON v.couleur_id = c.id
      WHERE v.produit_id = $1
      ORDER BY t.libelle, c.libelle
    `;
    const variationsResult = await pool.query(variationsQuery, [id]);
    produit.variations = variationsResult.rows;

    // Images
    const imagesQuery = 'SELECT id, url, ordre FROM images_produit WHERE produit_id = $1 ORDER BY ordre';
    const imagesResult = await pool.query(imagesQuery, [id]);
    produit.images = imagesResult.rows;

    res.json(produit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST créer un produit (avec variations et images)
router.post('/', upload.array('images', 5), async (req, res) => {
  const { nom, reference, description, prix_vente, prix_achat, categorie_id, variations } = req.body;
  if (!nom || !reference || !prix_vente) {
    return res.status(400).json({ message: 'Nom, référence et prix de vente requis.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vérifier référence unique
    const refExist = await client.query('SELECT id FROM produits WHERE reference = $1', [reference]);
    if (refExist.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'La référence existe déjà.' });
    }

    // Insérer le produit
    const produitResult = await client.query(
      `INSERT INTO produits (nom, reference, description, prix_vente, prix_achat, categorie_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [nom, reference, description || null, prix_vente, prix_achat || null, categorie_id || null]
    );
    const produitId = produitResult.rows[0].id;

    // Insérer les variations (JSON parsé)
    if (variations) {
      const variationsArray = JSON.parse(variations);
      for (const v of variationsArray) {
        await client.query(
          `INSERT INTO variations_produit (produit_id, taille_id, couleur_id, stock, prix_vente)
           VALUES ($1, $2, $3, $4, $5)`,
          [produitId, v.taille_id, v.couleur_id, v.stock || 0, v.prix_vente || null]
        );
      }
    }

    // Insérer les images (req.files)
    if (req.files && req.files.length > 0) {
      let ordre = 0;
      for (const file of req.files) {
        const url = `/uploads/produits/${file.filename}`;
        await client.query(
          'INSERT INTO images_produit (produit_id, url, ordre) VALUES ($1, $2, $3)',
          [produitId, url, ordre++]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ id: produitId, message: 'Produit créé avec succès.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la création du produit.' });
  } finally {
    client.release();
  }
    logAction(req.utilisateur.id, 'Création produit', `Le produit ${nom} a été créé.`);
});

// PUT modifier un produit (simplifié : on ne refait pas les variations ici, mais on peut les gérer séparément)
router.put('/:id', upload.array('images', 5), async (req, res) => {
  const { id } = req.params;
  const { nom, reference, description, prix_vente, prix_achat, categorie_id, statut } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exist = await client.query('SELECT * FROM produits WHERE id = $1', [id]);
    if (exist.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    await client.query(
      `UPDATE produits SET nom=$1, reference=$2, description=$3, prix_vente=$4, prix_achat=$5, categorie_id=$6, statut=$7, updated_at=now()
       WHERE id = $8`,
      [nom || exist.rows[0].nom, reference || exist.rows[0].reference, description !== undefined ? description : exist.rows[0].description,
       prix_vente || exist.rows[0].prix_vente, prix_achat !== undefined ? prix_achat : exist.rows[0].prix_achat,
       categorie_id !== undefined ? categorie_id : exist.rows[0].categorie_id,
       statut !== undefined ? statut : exist.rows[0].statut, id]
    );

    // Ajout de nouvelles images
    if (req.files && req.files.length > 0) {
      // On ne supprime pas les anciennes, on ajoute juste
      let maxOrdre = await client.query('SELECT max(ordre) FROM images_produit WHERE produit_id = $1', [id]);
      let ordre = (maxOrdre.rows[0].max || 0) + 1;
      for (const file of req.files) {
        const url = `/uploads/produits/${file.filename}`;
        await client.query('INSERT INTO images_produit (produit_id, url, ordre) VALUES ($1, $2, $3)', [id, url, ordre++]);
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Produit mis à jour.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    client.release();
  }
    logAction(req.utilisateur.id, 'Modification produit', `Le produit d'ID ${id} a été modifié.`);
});

// DELETE (désactiver)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE produits SET statut = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Produit désactivé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
  logAction(req.utilisateur.id, 'Désactivation produit', `Le produit d'ID ${req.params.id} a été désactivé.`);
});

// Gestion des variations : route séparée pour ajouter/modifier/supprimer
router.post('/:id/variations', async (req, res) => {
  const { id } = req.params;
  const { taille_id, couleur_id, stock, prix_vente } = req.body;
  if (!taille_id || !couleur_id) return res.status(400).json({ message: 'Taille et couleur requises.' });
  try {
    await pool.query(
      `INSERT INTO variations_produit (produit_id, taille_id, couleur_id, stock, prix_vente)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (produit_id, taille_id, couleur_id) DO UPDATE SET stock = EXCLUDED.stock, prix_vente = COALESCE(EXCLUDED.prix_vente, variations_produit.prix_vente)`,
      [id, taille_id, couleur_id, stock, prix_vente]
    );
    res.json({ message: 'Variation enregistrée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.delete('/:id/variations/:variationId', async (req, res) => {
  const { id, variationId } = req.params;
  try {
    await pool.query('DELETE FROM variations_produit WHERE id = $1 AND produit_id = $2', [variationId, id]);
    res.json({ message: 'Variation supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Suppression d'une image
router.delete('/:id/images/:imageId', async (req, res) => {
  const { id, imageId } = req.params;
  try {
    await pool.query('DELETE FROM images_produit WHERE id = $1 AND produit_id = $2', [imageId, id]);
    res.json({ message: 'Image supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;