import express from "express";
import cors from "cors";
import fs from "fs";
import "dotenv/config";

const app = express();
const PORT = 3001; // Le port pour l'API (React utilisera le 3000 ou 5173)

app.use(cors()); // Autorise le frontend à récupérer les données
app.use(express.json());

const DATA_FILE = "./data/products.json";

// Récupérer tous les produits
app.get("/api/products", (req, res) => {
  if (!fs.existsSync(DATA_FILE)) {
    return res.json([]);
  }
  const products = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(products);
});

// Avoir des statistiques simples
app.get("/api/stats", (req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json({ total: 0 });
  const products = JSON.parse(fs.readFileSync(DATA_FILE));
  
  // Compter par site
  const stats = {};
  products.forEach(p => {
    stats[p.siteName] = (stats[p.siteName] || 0) + 1;
  });

  res.json({
    total: products.length,
    byStore: stats
  });
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Serveur API tournant sur http://localhost:${PORT}`);
});