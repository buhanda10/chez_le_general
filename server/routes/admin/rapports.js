const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { verifierToken, verifierRole } = require('../../middleware/auth');

router.use(verifierToken);
router.use(verifierRole('admin'));

// Résumé / KPI
router.get('/resume', async (req, res) => {
  const { date_debut, date_fin } = req.query;
  let conditions = '';
  const params = [];
  let idx = 1;

  if (date_debut) {
    conditions += ` AND v.created_at >= $${idx++}`;
    params.push(date_debut);
  }
  if (date_fin) {
    conditions += ` AND v.created_at <= $${idx++}`;
    params.push(date_fin);
  }

  try {
    const query = `
      SELECT
        COUNT(v.id) AS nb_ventes,
        COALESCE(SUM(v.montant_total), 0) AS chiffre_affaires,
        COALESCE(SUM(v.remise), 0) AS total_remises,
        COALESCE(SUM(v.montant_total) - SUM(v.remise), 0) AS total_net,
        COALESCE(AVG(v.montant_total), 0) AS panier_moyen
      FROM ventes v
      WHERE 1=1 ${conditions}
    `;
    const result = await pool.query(query, params);
    const kpi = result.rows[0];

    const nbClients = await pool.query('SELECT COUNT(id) FROM clients WHERE actif = true');
    kpi.nb_clients = parseInt(nbClients.rows[0].count);

    res.json(kpi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Ventes par jour
router.get('/ventes-par-periode', async (req, res) => {
  const { date_debut, date_fin } = req.query;
  let conditions = '';
  const params = [];
  let idx = 1;

  if (date_debut) {
    conditions += ` AND v.created_at >= $${idx++}`;
    params.push(date_debut);
  }
  if (date_fin) {
    conditions += ` AND v.created_at <= $${idx++}`;
    params.push(date_fin);
  }

  try {
    const query = `
      SELECT DATE(v.created_at) AS date,
             COUNT(v.id) AS nb_ventes,
             SUM(v.montant_total) AS total
      FROM ventes v
      WHERE 1=1 ${conditions}
      GROUP BY DATE(v.created_at)
      ORDER BY date
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Top produits
router.get('/top-produits', async (req, res) => {
  const { date_debut, date_fin, limite = 7 } = req.query;
  let conditions = '';
  const params = [];
  let idx = 1;

  if (date_debut) {
    conditions += ` AND v.created_at >= $${idx++}`;
    params.push(date_debut);
  }
  if (date_fin) {
    conditions += ` AND v.created_at <= $${idx++}`;
    params.push(date_fin);
  }

  try {
    const query = `
      SELECT p.nom, p.reference,
             SUM(lv.quantite) AS total_vendus,
             SUM(lv.quantite * lv.prix_unitaire) AS chiffre_affaires
      FROM lignes_vente lv
      JOIN ventes v ON v.id = lv.vente_id
      JOIN produits p ON p.id = lv.produit_id
      WHERE 1=1 ${conditions}
      GROUP BY p.id, p.nom, p.reference
      ORDER BY total_vendus DESC
      LIMIT $${idx++}
    `;
    params.push(limite);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Performance vendeurs
router.get('/performance-vendeurs', async (req, res) => {
  const { date_debut, date_fin } = req.query;
  let conditions = '';
  const params = [];
  let idx = 1;

  if (date_debut) {
    conditions += ` AND v.created_at >= $${idx++}`;
    params.push(date_debut);
  }
  if (date_fin) {
    conditions += ` AND v.created_at <= $${idx++}`;
    params.push(date_fin);
  }

  try {
    const query = `
      SELECT u.nom_complet, u.id AS vendeur_id,
             COUNT(v.id) AS nb_ventes,
             SUM(v.montant_total) AS ca,
             AVG(v.montant_total) AS panier_moyen
      FROM ventes v
      JOIN utilisateurs u ON v.vendeur_id = u.id
      WHERE u.role = 'vendeur' AND u.actif = true ${conditions}
      GROUP BY u.id, u.nom_complet
      ORDER BY ca DESC
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Répartition par mode de paiement
router.get('/rep-paiement', async (req, res) => {
  const { date_debut, date_fin } = req.query;
  let conditions = '';
  const params = [];
  let idx = 1;

  if (date_debut) {
    conditions += ` AND v.created_at >= $${idx++}`;
    params.push(date_debut);
  }
  if (date_fin) {
    conditions += ` AND v.created_at <= $${idx++}`;
    params.push(date_fin);
  }

  try {
    const query = `
      SELECT mp.libelle,
             COUNT(v.id) AS nb,
             SUM(v.montant_total) AS total
      FROM ventes v
      JOIN modes_paiement mp ON v.mode_paiement_id = mp.id
      WHERE 1=1 ${conditions}
      GROUP BY mp.libelle
      ORDER BY total DESC
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;