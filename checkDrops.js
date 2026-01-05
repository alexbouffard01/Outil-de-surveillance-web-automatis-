import fetch from "node-fetch";
import fs from "fs";
import "dotenv/config";

const DATA_FILE = "./data/products.json";
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// tableau des sites
const SITES = [
  {
    name: "Kitschalos",
    jsonUrl: "https://kitschalos.com/collections/jellycat/products.json",
    baseUrl: "https://kitschalos.com/products/"
  },
  {
    name: "Chat Perché",
    jsonUrl: "https://chatperche.ca/collections/jelly-cat/products.json",
    baseUrl: "https://chatperche.ca/products/"
  },
  {
    name: "Clément",
    jsonUrl: "https://clement.ca/collections/baby-gear-for-baby-plush-toys/products.json",
    baseUrl: "https://clement.ca/products/"
  },
  {
    name: "Billie Le Kid",
    jsonUrl: "https://www.billielekid.com/collections/jellycat/products.json",
    baseUrl: "https://www.billielekid.com/products/"
  }
];

// Fonction pour récupérer les produits d'un seul site
async function fetchProductsFromSite(site) {
  let siteProducts = [];
  let page = 1;
  let keepGoing = true;

  console.log(`Vérification de ${site.name}...`);

  try {
    while (keepGoing) {
      // demande 250 produits par page pour aller plus vite
      const res = await fetch(`${site.jsonUrl}?page=${page}&limit=250`);
      if (!res.ok) throw new Error(`Erreur HTTP : ${res.status}`);
      const data = await res.json();

      if (!data.products || data.products.length === 0) {
        keepGoing = false;
        break;
      }

      // filtrage et formatage
      const cleanProducts = data.products
        .filter(p => {
          // extra sécurité pour Clément : on s'assure que c'est bien des Jellycat
          if (p.vendor && p.vendor.toLowerCase().includes("jellycat")) return true;
          // si le site est 100% Jellycat on prend tout
          if (site.name !== "Clément") return true; 
          return false;
        })
        .map(p => ({
          name: p.title,
          link: site.baseUrl + p.handle,
          siteName: site.name // ajoute le nom du site pour Discord
        }));

      siteProducts = siteProducts.concat(cleanProducts);
      page++;
    }
  } catch (error) {
    console.error(`Erreur sur ${site.name}:`, error.message);
  }

  return siteProducts;
}

// récupérer TOUS les produits de TOUS les sites
async function fetchAllProducts() {
  let allProducts = [];
  
  for (const site of SITES) {
    const p = await fetchProductsFromSite(site);
    allProducts = allProducts.concat(p);
  }

  console.log("Total global produits récupérés :", allProducts.length);
  return allProducts;
}

// charger les anciens produits
function loadOldProducts() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// sauvegarder les produits
function saveProducts(products) {
  if (!fs.existsSync("./data")) fs.mkdirSync("./data");
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

// envoyer notification Discord
async function notifyDiscord(newProducts) {
  // coupe le message s'il y a trop de produits pour éviter l'erreur Discord
  const productsToSend = newProducts.slice(0, 10); 
  
  const message =
    "🧸 **NOUVEAUX JELLYCATS DÉTECTÉS !**\n\n" +
    productsToSend.map(p => `• **${p.name}**\n📍 *${p.siteName}*\n${p.link}`).join("\n\n");

  if (newProducts.length > 10) {
     // petit message si on a coupé la liste
     message += `\n\n... et ${newProducts.length - 10} autres !`;
  }

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message })
  });
}

// vérification
async function checkDrops() {
  try {
    const currentProducts = await fetchAllProducts();
    const oldProducts = loadOldProducts();

    // compare les liens 
    const newOnes = currentProducts.filter(
      p => !oldProducts.some(op => op.link === p.link)
    );

    if (newOnes.length > 0) {
      console.log(`🚨 ${newOnes.length} Nouveaux produits trouvés !`);
      
      const isFirstRunOrMassive = oldProducts.length === 0 || newOnes.length > 50;
      
      if (!isFirstRunOrMassive) {
          await notifyDiscord(newOnes);
      } else {
          console.log("Trop de nouveaux produits d'un coup (initialisation), pas de notif Discord.");
      }

    } else {
      console.log("Pas de nouveau produit pour l'instant.");
    }

    saveProducts(currentProducts);
  } catch (err) {
    console.error("Erreur globale lors du check :", err);
  }
}

checkDrops(); 

setInterval(() => {
  checkDrops();
}, 10 * 60 * 1000); // regarde site chaque 10 minutes