const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');
const logAction = require('../../utils/logger');

router.use(verifierToken);
router.use(verifierRole('vendeur', 'admin'));

// POST /api/vendeur/ventes - Créer une vente
router.post('/', async (req, res) => {
  const { client_id, mode_paiement_id, remise, lignes } = req.body;
  if (!lignes || !Array.isArray(lignes) || lignes.length === 0 || !mode_paiement_id) {
    return res.status(400).json({ message: 'Lignes et mode de paiement requis.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Générer référence unique
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRes = await client.query(
      `SELECT COUNT(*) FROM ventes WHERE created_at::date = CURRENT_DATE`
    );
    const count = parseInt(countRes.rows[0].count) + 1;
    const reference = `VTE-${today}-${String(count).padStart(4, '0')}`;

    let montantTotal = lignes.reduce((sum, l) => sum + (l.quantite * l.prix_unitaire), 0);
    const remiseAppliquee = parseFloat(remise) || 0;
    montantTotal = Math.max(montantTotal - remiseAppliquee, 0);

    const venteRes = await client.query(
      `INSERT INTO ventes (reference_vente, vendeur_id, client_id, montant_total, remise, mode_paiement_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [reference, req.utilisateur.id, client_id || null, montantTotal, remiseAppliquee, mode_paiement_id]
    );
    const venteId = venteRes.rows[0].id;

    for (const ligne of lignes) {
      await client.query(
        `INSERT INTO lignes_vente (vente_id, variation_id, produit_id, quantite, prix_unitaire)
         VALUES ($1, $2, $3, $4, $5)`,
        [venteId, ligne.variation_id || null, ligne.produit_id, ligne.quantite, ligne.prix_unitaire]
      );

      if (ligne.variation_id) {
        await client.query(
          `UPDATE variations_produit SET stock = stock - $1 WHERE id = $2 AND stock >= $1`,
          [ligne.quantite, ligne.variation_id]
        );
      }
    }

    await client.query('COMMIT');
    logAction(req.utilisateur.id, 'Vente', `Vente ${reference} - ${montantTotal} FCFA`);
    res.status(201).json({ id: venteId, reference_vente: reference, message: 'Vente enregistrée.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la vente.' });
  } finally {
    client.release();
  }
});

// GET /api/vendeur/ventes - Historique du vendeur
router.get('/', async (req, res) => {
  const { page = 1, limite = 20 } = req.query;
  const offset = (page - 1) * limite;
  try {
    const countRes = await pool.query(
      'SELECT COUNT(*) FROM ventes WHERE vendeur_id = $1',
      [req.utilisateur.id]
    );
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT v.id, v.reference_vente, v.montant_total, v.remise, v.created_at,
              cl.nom AS client_nom, cl.prenom AS client_prenom, mp.libelle AS mode_paiement
       FROM ventes v
       LEFT JOIN clients cl ON v.client_id = cl.id
       LEFT JOIN modes_paiement mp ON v.mode_paiement_id = mp.id
       WHERE v.vendeur_id = $1
       ORDER BY v.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.utilisateur.id, limite, offset]
    );

    res.json({ total, page: parseInt(page), limite: parseInt(limite), ventes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/vendeur/ventes/:id/ticket-data - Données JSON pour le ticket
router.get('/:id/ticket-data', async (req, res) => {
  const { id } = req.params;
  try {
    const venteQuery = `
      SELECT v.reference_vente, v.montant_total, v.remise, v.created_at,
             u.nom_complet AS vendeur_nom,
             cl.nom AS client_nom, cl.prenom AS client_prenom, cl.telephone AS client_telephone,
             mp.libelle AS mode_paiement
      FROM ventes v
      LEFT JOIN utilisateurs u ON v.vendeur_id = u.id
      LEFT JOIN clients cl ON v.client_id = cl.id
      LEFT JOIN modes_paiement mp ON v.mode_paiement_id = mp.id
      WHERE v.id = $1 AND v.vendeur_id = $2`;
    const venteRes = await pool.query(venteQuery, [id, req.utilisateur.id]);
    if (venteRes.rows.length === 0) return res.status(404).json({ message: 'Vente non trouvée' });
    const vente = venteRes.rows[0];

    const lignesQuery = `
      SELECT lv.quantite, lv.prix_unitaire, p.nom, p.reference,
             t.libelle AS taille, c.libelle AS couleur
      FROM lignes_vente lv
      JOIN produits p ON p.id = lv.produit_id
      LEFT JOIN variations_produit vp ON vp.id = lv.variation_id
      LEFT JOIN tailles t ON t.id = vp.taille_id
      LEFT JOIN couleurs c ON c.id = vp.couleur_id
      WHERE lv.vente_id = $1`;
    const lignesRes = await pool.query(lignesQuery, [id]);

    const paramsRes = await pool.query('SELECT * FROM parametres WHERE id = 1');
    const boutique = paramsRes.rows[0] || {};

    res.json({ vente, lignes: lignesRes.rows, boutique });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;