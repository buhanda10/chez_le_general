const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');
const logAction = require('../../utils/logger');

router.use(verifierToken);
router.use(verifierRole('admin'));

// GET /api/admin/stock - Liste du stock actuel (toutes variations avec produit)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        v.id as variation_id,
        p.id as produit_id,
        p.nom as produit_nom,
        p.reference,
        p.seuil_alerte,
        t.libelle as taille,
        c.libelle as couleur,
        v.stock
      FROM variations_produit v
      JOIN produits p ON p.id = v.produit_id
      LEFT JOIN tailles t ON t.id = v.taille_id
      LEFT JOIN couleurs c ON c.id = v.couleur_id
      WHERE p.statut = true
      ORDER BY p.nom, t.libelle, c.libelle
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

//  GET /api/admin/stock/faible - Produits sous le seuil
router.get('/faible', async (req, res) => {
  try {
    const query = `
      SELECT 
        v.id as variation_id,
        p.id as produit_id,
        p.nom as produit_nom,
        p.reference,
        p.seuil_alerte,
        t.libelle as taille,
        c.libelle as couleur,
        v.stock
      FROM variations_produit v
      JOIN produits p ON p.id = v.produit_id
      LEFT JOIN tailles t ON t.id = v.taille_id
      LEFT JOIN couleurs c ON c.id = v.couleur_id
      WHERE p.statut = true AND v.stock <= p.seuil_alerte
      ORDER BY v.stock ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/admin/stock/produit/:id - Stock d'un produit avec variations
router.get('/produit/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const produitRes = await pool.query('SELECT * FROM produits WHERE id = $1', [id]);
    if (produitRes.rows.length === 0) return res.status(404).json({ message: 'Produit introuvable.' });

    const variations = await pool.query(
      `SELECT v.id, v.stock, v.prix_vente, t.libelle as taille, c.libelle as couleur
       FROM variations_produit v
       LEFT JOIN tailles t ON v.taille_id = t.id
       LEFT JOIN couleurs c ON v.couleur_id = c.id
       WHERE v.produit_id = $1
       ORDER BY t.libelle, c.libelle`,
      [id]
    );

    res.json({
      produit: produitRes.rows[0],
      variations: variations.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/admin/stock/entree - Entrée de stock
router.post('/entree', async (req, res) => {
  const { variation_id, quantite, raison } = req.body;
  if (!variation_id || !quantite || quantite <= 0) {
    return res.status(400).json({ message: 'Variation et quantité positive requises.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer stock actuel
    const varRes = await client.query('SELECT stock FROM variations_produit WHERE id = $1', [variation_id]);
    if (varRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Variation introuvable.' });
    }

    const stockAvant = varRes.rows[0].stock;
    const stockApres = stockAvant + quantite;

    // Mettre à jour le stock
    await client.query('UPDATE variations_produit SET stock = $1 WHERE id = $2', [stockApres, variation_id]);

    // Enregistrer le mouvement
    await client.query(
      `INSERT INTO mouvements_stock (variation_id, type, quantite, stock_avant, stock_apres, raison, utilisateur_id)
       VALUES ($1, 'entree', $2, $3, $4, $5, $6)`,
      [variation_id, quantite, stockAvant, stockApres, raison || 'Entrée de stock', req.utilisateur.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Stock mis à jour.', stock: stockApres });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    client.release();
  }
    logAction(req.utilisateur.id, 'Entrée stock', `Une entrée de ${quantite} a été enregistrée pour la variation d'ID ${variation_id}.`);
});

// POST /api/admin/stock/ajustement - Ajustement manuel (+/-)
router.post('/ajustement', async (req, res) => {
  const { variation_id, nouveau_stock, raison } = req.body;
  if (!variation_id || nouveau_stock === undefined || nouveau_stock < 0) {
    return res.status(400).json({ message: 'Variation et nouveau stock valide requis.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const varRes = await client.query('SELECT stock FROM variations_produit WHERE id = $1', [variation_id]);
    if (varRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Variation introuvable.' });
    }

    const stockAvant = varRes.rows[0].stock;
    const difference = nouveau_stock - stockAvant;
    const type = difference >= 0 ? 'ajustement' : 'ajustement'; // toujours ajustement
    // On peut préciser si c'est positif/négatif dans la raison

    await client.query('UPDATE variations_produit SET stock = $1 WHERE id = $2', [nouveau_stock, variation_id]);

    await client.query(
      `INSERT INTO mouvements_stock (variation_id, type, quantite, stock_avant, stock_apres, raison, utilisateur_id)
       VALUES ($1, 'ajustement', $2, $3, $4, $5, $6)`,
      [variation_id, difference, stockAvant, nouveau_stock, raison || 'Ajustement manuel', req.utilisateur.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Stock ajusté.', stock: nouveau_stock });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    client.release();
  }
    logAction(req.utilisateur.id, 'Ajustement stock', `Un ajustement de ${nouveau_stock} a été enregistré pour la variation d'ID ${variation_id}.`);
});

// GET /api/admin/stock/historique - Historique des mouvements
router.get('/historique', async (req, res) => {
  const { produit_id, variation_id, type, page = 1, limite = 50 } = req.query;
  const offset = (page - 1) * limite;

  let where = [];
  let params = [];
  let paramIndex = 1;

  if (produit_id) {
    where.push(`p.id = $${paramIndex++}`);
    params.push(produit_id);
  }
  if (variation_id) {
    where.push(`m.variation_id = $${paramIndex++}`);
    params.push(variation_id);
  }
  if (type && ['entree','sortie','ajustement'].includes(type)) {
    where.push(`m.type = $${paramIndex++}`);
    params.push(type);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const countQuery = `
      SELECT count(*)
      FROM mouvements_stock m
      JOIN variations_produit v ON v.id = m.variation_id
      JOIN produits p ON p.id = v.produit_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT 
        m.id, m.type, m.quantite, m.stock_avant, m.stock_apres, m.raison, m.created_at,
        p.nom as produit_nom, p.reference,
        t.libelle as taille, c.libelle as couleur,
        u.nom_utilisateur as effectue_par
      FROM mouvements_stock m
      JOIN variations_produit v ON v.id = m.variation_id
      JOIN produits p ON p.id = v.produit_id
      LEFT JOIN tailles t ON t.id = v.taille_id
      LEFT JOIN couleurs c ON c.id = v.couleur_id
      LEFT JOIN utilisateurs u ON u.id = m.utilisateur_id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limite, offset);
    const result = await pool.query(query, params);

    res.json({ total, page: parseInt(page), limite: parseInt(limite), mouvements: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;