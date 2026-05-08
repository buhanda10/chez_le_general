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

