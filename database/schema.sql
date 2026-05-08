-- Utilisateurs (admin + vendeurs)
CREATE TABLE utilisateurs (
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

ALTER TABLE utilisateurs
ADD COLUMN adresse TEXT,
ADD COLUMN email VARCHAR(100),
ADD COLUMN photo VARCHAR(255);

-- Catégories
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  statut BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Produits
CREATE TABLE produits (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(50) UNIQUE NOT NULL,
  nom VARCHAR(150) NOT NULL,
  description TEXT,
  prix_vente DECIMAL(10,2) NOT NULL,
  prix_achat DECIMAL(10,2),
  categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  statut BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Tailles / Couleurs (listes de référence éditables par l'admin)
CREATE TABLE tailles (
  id SERIAL PRIMARY KEY,
  libelle VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE couleurs (
  id SERIAL PRIMARY KEY,
  libelle VARCHAR(30) NOT NULL UNIQUE
);

-- Variations (stock par produit, taille, couleur)
CREATE TABLE variations_produit (
  id SERIAL PRIMARY KEY,
  produit_id INTEGER REFERENCES produits(id) ON DELETE CASCADE,
  taille_id INTEGER REFERENCES tailles(id),
  couleur_id INTEGER REFERENCES couleurs(id),
  stock INTEGER NOT NULL DEFAULT 0,
  prix_vente DECIMAL(10,2), -- si différent du prix de base
  UNIQUE(produit_id, taille_id, couleur_id)
);

-- Images des produits
CREATE TABLE images_produit (
  id SERIAL PRIMARY KEY,
  produit_id INTEGER REFERENCES produits(id) ON DELETE CASCADE,
  url VARCHAR(255) NOT NULL,
  ordre INTEGER DEFAULT 0
);

-- Ajout d'un seuil d'alerte par produit
ALTER TABLE produits ADD COLUMN seuil_alerte INTEGER DEFAULT 10;

-- Table des mouvements de stock
CREATE TABLE mouvements_stock (
  id SERIAL PRIMARY KEY,
  variation_id INTEGER REFERENCES variations_produit(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('entree', 'sortie', 'ajustement')),
  quantite INTEGER NOT NULL,
  stock_avant INTEGER,
  stock_apres INTEGER,
  raison TEXT,
  utilisateur_id INTEGER REFERENCES utilisateurs(id),
  created_at TIMESTAMP DEFAULT now()
);