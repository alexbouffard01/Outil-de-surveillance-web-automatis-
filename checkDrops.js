import fetch from "node-fetch";
import fs from "fs";

const DATA_FILE = "./data/products.json";
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Fonction pour récupérer tous les produits avec pagination
async function fetchAllProducts() {
  let allProducts = [];
  let page = 1;
  let keepGoing = true;

  while (keepGoing) {
    const res = await fetch(`https://kitschalos.com/collections/jellycat/products.json?page=${page}&limit=50`);
    if (!res.ok) throw new Error(`Erreur HTTP : ${res.status}`);
    const data = await res.json();

    if (!data.products || data.products.length === 0) {
      keepGoing = false;
      break;
    }

    const products = data.products.map(p => ({
      name: p.title,
      link: "https://kitschalos.com/products/" + p.handle
    }));

    allProducts = allProducts.concat(products);
    page++;
  }

  console.log("Total produits récupérés :", allProducts.length);
  return allProducts;
}

// Charger les anciens produits
function loadOldProducts() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// Sauvegarder les produits
function saveProducts(products) {
  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

// Envoyer notification Discord
async function notifyDiscord(newProducts) {
  const message =
    "🧸 **NOUVEAUX JELLYCATS DÉTECTÉS !**\n\n" +
    newProducts.map(p => `• **${p.name}**\n${p.link}`).join("\n\n");

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message })
  });
}

// Vérification des nouveaux drops
async function checkDrops() {
  try {
    const currentProducts = await fetchAllProducts();
    const oldProducts = loadOldProducts();

    const newOnes = currentProducts.filter(
      p => !oldProducts.some(op => op.link === p.link)
    );

    if (newOnes.length > 0) {
      console.log("Nouveaux produits :", newOnes.length);
      await notifyDiscord(newOnes);
    } else {
      console.log("Pas de nouveau produit pour l'instant.");
    }

    saveProducts(currentProducts);
  } catch (err) {
    console.error("Erreur lors du check :", err);
  }
}

// ---- AUTOMATISATION TOUTES LES 10 MINUTES ----
checkDrops(); // Première vérification immédiate

setInterval(() => {
  checkDrops();
}, 10 * 60 * 1000); // relance toutes les 10 minutes
