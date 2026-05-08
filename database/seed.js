const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

// Chemin absolu vers le .env, peu importe d’où on lance le script
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function seed() {
  try {
    // Création de la table utilisateurs si elle n’existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id SERIAL PRIMARY KEY,
        nom_utilisateur VARCHAR(50) UNIQUE NOT NULL,
        mot_de_passe VARCHAR(255) NOT NULL,
        nom_complet VARCHAR(100),
        telephone VARCHAR(20),
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'vendeur')),
        actif BOOLEAN DEFAULT true,
        derniere_connexion TIMESTAMP,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    const adminName = 'tegra';
    const adminPassword = 'tegra123';
    const hashed = await bcrypt.hash(adminPassword, 10);

    await pool.query(
      `INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe, nom_complet, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nom_utilisateur) DO NOTHING`,
      [adminName, hashed, 'Administrateur Suprême', 'admin']
    );

    console.log('✅ Admin créé (nom: tegra, mdp: tegra123)');
  } catch (err) {
    console.error('Erreur seed :', err);
  } finally {
    pool.end();
  }
}

seed();