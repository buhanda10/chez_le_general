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

-- Clients (base commune admin/vendeurs)
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100),
  prenom VARCHAR(100),
  telephone VARCHAR(20) UNIQUE,
  adresse TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Modes de paiement
CREATE TABLE modes_paiement (
  id SERIAL PRIMARY KEY,
  libelle VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO modes_paiement (libelle) VALUES ('Espèces'), ('Mobile Money'), ('Carte bancaire'), ('Autre');

-- Ventes
CREATE TABLE ventes (
  id SERIAL PRIMARY KEY,
  reference_vente VARCHAR(30) UNIQUE NOT NULL,
  vendeur_id INTEGER REFERENCES utilisateurs(id),
  client_id INTEGER REFERENCES clients(id),
  montant_total DECIMAL(10,2) NOT NULL,
  remise DECIMAL(10,2) DEFAULT 0,
  mode_paiement_id INTEGER REFERENCES modes_paiement(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Lignes de vente
CREATE TABLE lignes_vente (
  id SERIAL PRIMARY KEY,
  vente_id INTEGER REFERENCES ventes(id) ON DELETE CASCADE,
  variation_id INTEGER REFERENCES variations_produit(id),
  produit_id INTEGER REFERENCES produits(id),
  quantite INTEGER NOT NULL,
  prix_unitaire DECIMAL(10,2) NOT NULL
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100),
  prenom VARCHAR(100),
  telephone VARCHAR(20) UNIQUE,
  adresse TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);


CREATE TABLE IF NOT EXISTS parametres (
  id SERIAL PRIMARY KEY,
  nom_boutique VARCHAR(255) DEFAULT 'Ma Boutique',
  devise VARCHAR(10) DEFAULT 'FCFA',
  taux_tva DECIMAL(5,2) DEFAULT 0,
  telephone VARCHAR(20),
  adresse TEXT,
  logo VARCHAR(255)
);

-- Insertion par défaut (ligne unique)
INSERT INTO parametres (id, nom_boutique, devise, taux_tva)
VALUES (1, 'chez le general', 'FC', 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE logs_activite (
  id SERIAL PRIMARY KEY,
  utilisateur_id INTEGER REFERENCES utilisateurs(id),
  action VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE modes_paiement ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;

-- Ajout du champ pour marquer une vente annulée
ALTER TABLE ventes ADD COLUMN IF NOT EXISTS annulee BOOLEAN DEFAULT false;
-- Optionnel : motif d'annulation
ALTER TABLE ventes ADD COLUMN IF NOT EXISTS motif_annulation TEXT;
-- Optionnel : date d'annulation
ALTER TABLE ventes ADD COLUMN IF NOT EXISTS date_annulation TIMESTAMP;