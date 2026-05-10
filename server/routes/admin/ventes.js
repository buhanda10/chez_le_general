const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');
const logAction = require('../../utils/logger');

router.use(verifierToken);
router.use(verifierRole('admin'));

//  GET /api/admin/ventes - Liste des ventes avec filtres et pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limite = 25, date_debut, date_fin, vendeur_id, client_id, mode_paiement_id, recherche } = req.query;
    const offset = (page - 1) * limite;

    let where = [];
    let params = [];
    let paramIndex = 1;

    if (date_debut) {
      where.push(`v.created_at >= $${paramIndex++}`);
      params.push(date_debut);
    }
    if (date_fin) {
      where.push(`v.created_at <= $${paramIndex++}`);
      params.push(date_fin);
    }
    if (vendeur_id) {
      where.push(`v.vendeur_id = $${paramIndex++}`);
      params.push(vendeur_id);
    }
    if (client_id) {
      where.push(`v.client_id = $${paramIndex++}`);
      params.push(client_id);
    }
    if (mode_paiement_id) {
      where.push(`v.mode_paiement_id = $${paramIndex++}`);
      params.push(mode_paiement_id);
    }
    if (recherche) {
      where.push(`(v.reference_vente ILIKE $${paramIndex} OR prod.nom ILIKE $${paramIndex})`);
      params.push(`%${recherche}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countQuery = `
      SELECT COUNT(DISTINCT v.id)
      FROM ventes v
      LEFT JOIN lignes_vente lv ON lv.vente_id = v.id
      LEFT JOIN produits prod ON prod.id = lv.produit_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT 
        v.id, v.reference_vente, v.montant_total, v.remise, v.created_at,
        u.nom_complet as vendeur_nom,
        cl.nom as client_nom, cl.prenom as client_prenom, cl.telephone as client_telephone,
        mp.libelle as mode_paiement
      FROM ventes v
      LEFT JOIN utilisateurs u ON v.vendeur_id = u.id
      LEFT JOIN clients cl ON v.client_id = cl.id
      LEFT JOIN modes_paiement mp ON v.mode_paiement_id = mp.id
      LEFT JOIN lignes_vente lv ON lv.vente_id = v.id
      LEFT JOIN produits prod ON prod.id = lv.produit_id
      ${whereClause}
      GROUP BY v.id, u.nom_complet, cl.nom, cl.prenom, cl.telephone, mp.libelle
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limite, offset);
    const result = await pool.query(query, params);

    res.json({
      total,
      page: parseInt(page),
      limite: parseInt(limite),
      ventes: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

//  GET /api/admin/ventes/:id - Détail d'une vente (avec lignes)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const venteQuery = `
      SELECT v.id, v.reference_vente, v.montant_total, v.remise, v.created_at,
             u.nom_complet as vendeur_nom,
             cl.nom as client_nom, cl.prenom as client_prenom, cl.telephone as client_telephone, cl.adresse as client_adresse,
             mp.libelle as mode_paiement
      FROM ventes v
      LEFT JOIN utilisateurs u ON v.vendeur_id = u.id
      LEFT JOIN clients cl ON v.client_id = cl.id
      LEFT JOIN modes_paiement mp ON v.mode_paiement_id = mp.id
      WHERE v.id = $1
    `;
    const venteRes = await pool.query(venteQuery, [id]);
    if (venteRes.rows.length === 0) return res.status(404).json({ message: 'Vente introuvable.' });
    const vente = venteRes.rows[0];

    const lignesQuery = `
      SELECT lv.quantite, lv.prix_unitaire, p.nom as produit_nom, p.reference,
             t.libelle as taille, c.libelle as couleur
      FROM lignes_vente lv
      LEFT JOIN variations_produit vp ON lv.variation_id = vp.id
      LEFT JOIN tailles t ON vp.taille_id = t.id
      LEFT JOIN couleurs c ON vp.couleur_id = c.id
      JOIN produits p ON lv.produit_id = p.id
      WHERE lv.vente_id = $1
    `;
    const lignesRes = await pool.query(lignesQuery, [id]);
    vente.lignes = lignesRes.rows;

    res.json(vente);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

//  GET /api/admin/ventes/export/csv - Export CSV
router.get('/export/csv', async (req, res) => {
  const { date_debut, date_fin, vendeur_id } = req.query;
  let where = [];
  let params = [];
  let idx = 1;

  if (date_debut) { where.push(`v.created_at >= $${idx++}`); params.push(date_debut); }
  if (date_fin) { where.push(`v.created_at <= $${idx++}`); params.push(date_fin); }
  if (vendeur_id) { where.push(`v.vendeur_id = $${idx++}`); params.push(vendeur_id); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const query = `
      SELECT v.reference_vente, v.created_at, v.montant_total, v.remise,
             u.nom_complet as vendeur, mp.libelle as paiement,
             cl.nom as client_nom, cl.prenom as client_prenom, cl.telephone
      FROM ventes v
      LEFT JOIN utilisateurs u ON v.vendeur_id = u.id
      LEFT JOIN modes_paiement mp ON v.mode_paiement_id = mp.id
      LEFT JOIN clients cl ON v.client_id = cl.id
      ${whereClause}
      ORDER BY v.created_at DESC
    `;
    const result = await pool.query(query, params);
    const ventes = result.rows;

    // Construction CSV
    const header = 'Référence;Date;Montant;Remise;Vendeur;Paiement;Client;Téléphone\n';
    const rows = ventes.map(v => 
      `"${v.reference_vente}";"${new Date(v.created_at).toLocaleString()}";${v.montant_total};${v.remise};"${v.vendeur}";"${v.paiement}";"${v.client_nom || ''} ${v.client_prenom || ''}";"${v.telephone || ''}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ventes.csv');
    res.send(header + rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur export.' });
  }
});

// POST /api/admin/ventes/:id/annuler
router.post('/:id/annuler', async (req, res) => {
  const { id } = req.params;
  const { motif } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer la vente
    const venteRes = await client.query('SELECT * FROM ventes WHERE id = $1', [id]);
    if (venteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vente introuvable.' });
    }
    const vente = venteRes.rows[0];
    if (vente.annulee) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cette vente est déjà annulée.' });
    }

    // Marquer comme annulée
    await client.query(
      'UPDATE ventes SET annulee = true, motif_annulation = $1, date_annulation = now() WHERE id = $2',
      [motif || 'Sans motif', id]
    );

    // Récupérer les lignes de vente
    const lignes = await client.query(
      'SELECT lv.variation_id, lv.quantite FROM lignes_vente lv WHERE lv.vente_id = $1',
      [id]
    );

    // Réintégrer le stock pour chaque variation
    for (const ligne of lignes.rows) {
      if (ligne.variation_id) {
        await client.query(
          'UPDATE variations_produit SET stock = stock + $1 WHERE id = $2',
          [ligne.quantite, ligne.variation_id]
        );
        // Enregistrer un mouvement de stock (entrée par annulation)
        const stockAvantRes = await client.query('SELECT stock FROM variations_produit WHERE id = $1', [ligne.variation_id]);
        const stockApres = stockAvantRes.rows[0].stock;
        const stockAvant = stockApres - ligne.quantite;
        await client.query(
          `INSERT INTO mouvements_stock (variation_id, type, quantite, stock_avant, stock_apres, raison, utilisateur_id)
           VALUES ($1, 'entree', $2, $3, $4, $5, $6)`,
          [ligne.variation_id, ligne.quantite, stockAvant, stockApres, 'Annulation vente ' + vente.reference_vente, req.utilisateur.id]
        );
      }
    }

    await client.query('COMMIT');

    logAction(req.utilisateur.id, 'Annulation vente', `Vente ${vente.reference_vente} annulée. Motif: ${motif || 'Sans motif'}`);
    res.json({ message: 'Vente annulée avec succès.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de l\'annulation.' });
  } finally {
    client.release();
  }
});

module.exports = router;