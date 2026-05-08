const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const vendeurRoutes = require('./routes/admin/vendeurs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globaux
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/admin/vendeurs', vendeurRoutes);


app.listen(PORT, () => {
  console.log(` Serveur démarré sur http://localhost:${PORT}`);
});