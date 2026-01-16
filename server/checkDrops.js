import fetch from "node-fetch";
import fs from "fs";
import "dotenv/config"; 

const CONFIG = {
  DATA_FILE: "./data/products.json",
  WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL, 
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

async function sendDiscordNotification(product) {
  if (!CONFIG.WEBHOOK_URL) return;
  if (!product.available) return; // Pas de notif si épuisé

  const embed = {
    title: `NOUVEAU JELLYCAT DÉTECTÉ !`,
    description: `**${product.name}** est disponible !`,
    color: 5763719, // Vert
    fields: [
      { name: "Prix", value: `${product.price} $`, inline: true },
      { name: "Boutique", value: product.siteName, inline: true }
    ],
    thumbnail: { url: product.image },
    url: product.link
  };

  try {
    // On attend un peu pour ne pas se faire bloquer par Discord si on envoie trop vite
    await new Promise(r => setTimeout(r, 500));
    await fetch(CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });
    console.log(`📨 Notification envoyée pour ${product.name}`);
  } catch (err) { console.error("Erreur Discord:", err); }
}

async function fetchProductsFromSite(site) {
  try {
    const res = await fetch(`${site.jsonUrl}?limit=250`);
    if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
    const data = await res.json();

    return (data.products || []).filter(p => {
        const vendor = (p.vendor || "").toLowerCase();
        return site.name !== "Clément" || vendor.includes("jellycat");
      }).map(p => {
        let price = "N/A";
        let isAvailable = false;
        if (p.variants && p.variants.length > 0) {
          price = p.variants[0].price;
          isAvailable = p.variants[0].available;
        }
        const date = p.published_at || p.created_at || p.updated_at;
        const image = p.images && p.images.length > 0 ? p.images[0].src : null;

        return {
          id: p.id, name: p.title, link: site.baseUrl + p.handle, siteName: site.name,
          dateAdded: date, price: price, image: image, available: isAvailable
        };
      });
  } catch (error) {
    console.error(`[${site.name}] Échec: ${error.message}`);
    return []; 
  }
}

const DataManager = {
  load: () => {
    if (!fs.existsSync(CONFIG.DATA_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(CONFIG.DATA_FILE)); } catch (e) { return []; }
  },
  save: (data) => {
    if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
    fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(data, null, 2));
  }
};

async function main() {
  console.log(`\n[${new Date().toLocaleTimeString()}] Scan en cours...`);
  
  const oldProducts = DataManager.load();
  const oldIds = new Set(oldProducts.map(p => p.id));
  // Est-ce la toute première fois qu'on lance le script ?
  const isFirstRun = oldProducts.length === 0;

  const results = await Promise.all(CONFIG.SITES.map(s => fetchProductsFromSite(s)));
  const currentProducts = results.flat();
  
  if (isFirstRun) {
    console.log(`PREMIER LANCEMENT : ${currentProducts.length} produits trouvés.`);
    console.log(`Mode silencieux activé : Aucune notification ne sera envoyée cette fois-ci.`);
    console.log(`Base de données initialisée. Les prochaines nouveautés seront notifiées !`);
  } else {
    // Ce n'est pas la première fois, on cherche les vraies nouveautés
    let newCount = 0;
    for (const product of currentProducts) {
      if (!oldIds.has(product.id)) {
        console.log(`✨ NOUVEAU: ${product.name}`);
        await sendDiscordNotification(product); 
        newCount++;
      }
    }
    if (newCount === 0) console.log("Rien de nouveau pour l'instant. 💤");
  }

  DataManager.save(currentProducts);
}

main();
setInterval(main, CONFIG.CHECK_INTERVAL);