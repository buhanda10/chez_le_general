const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('vendeur'));

// GET /api/vendeur/produits - liste produits actifs avec variations et image
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.nom, p.reference, p.prix_vente, p.description,
        (SELECT url FROM images_produit WHERE produit_id = p.id ORDER BY ordre LIMIT 1) as image_principale,
        (
          SELECT json_agg(json_build_object(
            'id', vp.id, 'taille_id', vp.taille_id, 'couleur_id', vp.couleur_id,
            'taille', t.libelle, 'couleur', c.libelle, 'stock', vp.stock, 'prix_vente', vp.prix_vente
          ))
          FROM variations_produit vp
          LEFT JOIN tailles t ON t.id = vp.taille_id
          LEFT JOIN couleurs c ON c.id = vp.couleur_id
          WHERE vp.produit_id = p.id
        ) as variations
      FROM produits p
      WHERE p.statut = true
      ORDER BY p.nom
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;