const jwt = require('jsonwebtoken');

// Vérifie le token JWT et ajoute l'utilisateur à req
function verifierToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = decoded; // { id, nom_utilisateur, role }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide ou expiré.' });
  }
}

// Vérifie que le rôle est bien celui attendu (ex: 'admin')
function verifierRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.utilisateur.role)) {
      return res.status(403).json({ message: 'Droits insuffisants.' });
    }
    next();
  };
}

module.exports = { verifierToken, verifierRole };