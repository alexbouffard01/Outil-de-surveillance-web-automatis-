import fetch from "node-fetch";
import fs from "fs";
import "dotenv/config"; 

const CONFIG = {
  DATA_FILE: "./data/products.json",
  CHECK_INTERVAL: 10 * 60 * 1000, 
  SITES: [
    { name: "Kitschalos", jsonUrl: "https://kitschalos.com/collections/jellycat/products.json", baseUrl: "https://kitschalos.com/products/" },
    { name: "Chat Perché", jsonUrl: "https://chatperche.ca/collections/jelly-cat/products.json", baseUrl: "https://chatperche.ca/products/" },
    { name: "Clément", jsonUrl: "https://clement.ca/collections/jellycat/products.json", baseUrl: "https://clement.ca/products/" },
    { name: "Billie Le Kid", jsonUrl: "https://www.billielekid.com/collections/jellycat/products.json", baseUrl: "https://www.billielekid.com/products/" },
    { name: "Momease", jsonUrl: "https://www.momease.ca/collections/jellycat/products.json", baseUrl: "https://www.momease.ca/products/" },
    { name: "Crocus & Ivy", jsonUrl: "https://www.crocusandivy.ca/collections/jellycat-plush-toys/products.json", baseUrl: "https://www.crocusandivy.ca/products/" },
    { name: "Veille sur toi", jsonUrl: "https://veillesurtoi.com/collections/jellycat/products.json", baseUrl: "https://veillesurtoi.com/products/" }
  ]
};

async function fetchProductsFromSite(site) {
  try {
    const res = await fetch(`${site.jsonUrl}?limit=250`);
    if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
    const data = await res.json();

    return (data.products || []).filter(p => {
        const vendor = (p.vendor || "").toLowerCase();
        return site.name !== "Clément" || vendor.includes("jellycat");
      }).map(p => {
        // 1. PRIX
        let price = "N/A";
        if (p.variants && p.variants.length > 0) {
          price = p.variants[0].price;
        }

        // 2. DATE (Essentiel pour le tri)
        const date = p.published_at || p.created_at || p.updated_at;

        // 3. IMAGE
        const image = p.images && p.images.length > 0 ? p.images[0].src : null;

        return {
          id: p.id,
          name: p.title,
          link: site.baseUrl + p.handle,
          siteName: site.name,
          dateAdded: date, 
          price: price,
          image: image
        };
      });
  } catch (error) {
    console.error(`[${site.name}] Échec: ${error.message}`);
    return []; 
  }
}

const DataManager = {
  save: (data) => {
    if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
    fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(data, null, 2));
  }
};

async function main() {
  console.log(`\nScan en cours...`);
  const results = await Promise.all(CONFIG.SITES.map(s => fetchProductsFromSite(s)));
  const currentProducts = results.flat();
  
  if (currentProducts.length > 0) {
    console.log(`TEST (Doit afficher un prix et une date) :`);
    console.log(`   - Prix : ${currentProducts[0].price} $`);
    console.log(`   - Date : ${currentProducts[0].dateAdded}`);
  }

  DataManager.save(currentProducts);
  console.log(`Base de données mise à jour : ${currentProducts.length} produits.`);
}

main();

setInterval(main, CONFIG.CHECK_INTERVAL);