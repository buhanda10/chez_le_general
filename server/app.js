const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const vendeursRoutes = require('./routes/admin/vendeurs');
const categoriesRoutes = require('./routes/admin/categories');
const produitsRoutes = require('./routes/admin/produits');
const taillesCouleursRoutes = require('./routes/admin/tailles_couleurs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/admin/vendeurs', vendeursRoutes);
app.use('/api/admin/categories', categoriesRoutes);
app.use('/api/admin/produits', produitsRoutes);
app.use('/api/admin', taillesCouleursRoutes);

// Redirection racine → login admin
app.get('/', (req, res) => {
  res.redirect('/admin/login.html');
});

app.listen(PORT, () => {
  console.log(` Serveur démarré sur http://localhost:${PORT}`);
});