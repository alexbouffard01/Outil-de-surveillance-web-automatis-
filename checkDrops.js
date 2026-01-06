/**
 * PROJET : Jellycat Tracker Automatisé
 * AUTEUR : Alexandra Bouffard 
 * DESCRIPTION : Surveille plusieurs boutiques Shopify pour détecter les nouveaux produits Jellycat
 * et envoie des notifications en temps réel via un Webhook Discord.
 */

import fetch from "node-fetch";
import fs from "fs";
import "dotenv/config"; 

// --- CONFIGURATION GLOBALE ---
const CONFIG = {
  DATA_FILE: "./data/products.json", // Fichier de stockage pour la persistance des données
  WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL, // URL secrète récupérée depuis le fichier .env
  CHECK_INTERVAL: 10 * 60 * 1000, // Fréquence de vérification (10 minutes)
  SITES: [
    { name: "Kitsch", jsonUrl: "https://kitschalos.com/collections/jellycat/products.json", baseUrl: "https://kitschalos.com/products/" },
    { name: "Chat Perché", jsonUrl: "https://chatperche.ca/collections/jelly-cat/products.json", baseUrl: "https://chatperche.ca/products/" },
    { name: "Clément", jsonUrl: "https://clement.ca/collections/jellycat/products.json", baseUrl: "https://clement.ca/products/" },
    { name: "Billie Le Kid", jsonUrl: "https://www.billielekid.com/collections/jellycat/products.json", baseUrl: "https://www.billielekid.com/products/" },
    { name: "Momease", jsonUrl: "https://www.momease.ca/collections/jellycat/products.json", baseUrl: "https://www.momease.ca/products/" },
    { name: "Crocus & Ivy", jsonUrl: "https://www.crocusandivy.ca/collections/jellycat-plush-toys/products.json", baseUrl: "https://www.crocusandivy.ca/products/" },
    { name: "Veille sur toi", jsonUrl: "https://veillesurtoi.com/collections/jellycat/products.json", baseUrl: "https://veillesurtoi.com/products/" }
  ]
};

/**
 * Récupère les produits d'un site spécifique via son API JSON Shopify.
 * @param {Object} site - L'objet contenant les informations du site (nom, url).
 * @returns {Promise<Array>} Liste d'objets produits formatés.
 */
async function fetchProductsFromSite(site) {
  try {
    // On demande 250 produits pour couvrir tout l'inventaire en une requête
    const res = await fetch(`${site.jsonUrl}?limit=250`);
    if (!res.ok) throw new Error(`Status HTTP: ${res.status}`);
    
    const data = await res.json();

    return (data.products || [])
      .filter(p => {
        // Filtrage de sécurité : on s'assure que le fabricant est bien Jellycat (ex : Clément)
        const vendor = p.vendor ? p.vendor.toLowerCase() : "";
        return site.name !== "Clément" || vendor.includes("jellycat");
      })
      .map(p => ({
        id: p.id,
        name: p.title,
        link: site.baseUrl + p.handle,
        siteName: site.name,
        updated_at: p.updated_at
      }));
  } catch (error) {
    console.error(`[${site.name}] Erreur de récupération: ${error.message}`);
    return []; // On retourne un tableau vide pour ne pas bloquer les autres sites
  }
}

/**
 * Gère la lecture et l'écriture des données sur le disque.
 * Utile pour comparer les produits entre deux scans.
 */
const DataManager = {
  load: () => {
    if (!fs.existsSync(CONFIG.DATA_FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(CONFIG.DATA_FILE));
    } catch (e) { return []; }
  },
  save: (data) => {
    if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
    fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(data, null, 2));
  }
};

/**
 * Prépare et envoie le message de notification à Discord.
 * @param {Array} newItems - Liste des nouveaux produits détectés.
 */
async function sendNotification(newItems) {
  if (newItems.length === 0) return;

  // On limite à 10 produits par message pour éviter de dépasser la limite de caractères de Discord
  const chunks = newItems.slice(0, 10);
  const content = "🧸 **ALERTE : NOUVEAUX JELLYCATS DÉTECTÉS !**\n\n" + 
                  chunks.map(p => `• **${p.name}**\n📍 *Source : ${p.siteName}*\n🔗 ${p.link}`).join("\n\n");

  try {
    await fetch(CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
  } catch (err) {
    console.error("Erreur lors de l'envoi Discord:", err);
  }
}

/**
 * Logique principale : Orchestre le scan, la comparaison et la sauvegarde
 */
async function main() {
  console.log(`\n[${new Date().toLocaleTimeString()}] Début du scan sur ${CONFIG.SITES.length} sites...`);
  
  // Exécution asynchrone parallèle : tous les sites sont scannés en même temps
  const results = await Promise.all(CONFIG.SITES.map(s => fetchProductsFromSite(s)));
  
  // Fusionne tous les tableaux de produits en un seul
  const currentProducts = results.flat();
  const oldProducts = DataManager.load();

  // Détection des nouveautés : on regarde si le lien existe déjà dans l'ancienne liste
  const newItems = currentProducts.filter(p => !oldProducts.some(op => op.link === p.link));

  if (newItems.length > 0) {
    // Sécurité : Si le fichier était vide ou s'il y a trop de produits (>50), on ne notifie pas (initialisation)
    const isFirstRun = oldProducts.length === 0;
    const isMassiveDrop = newItems.length > 50;

    if (!isFirstRun && !isMassiveDrop) {
      await sendNotification(newItems);
      console.log(`🚨 ${newItems.length} nouveautés trouvées et envoyées !`);
    } else {
      console.log(`📦 Initialisation : ${newItems.length} produits ajoutés à la base de données.`);
    }
  } else {
    console.log("✅ Scan terminé : Aucun nouveau produit.");
  }

  // Persistance des données pour le prochain cycle
  DataManager.save(currentProducts);
}

// --- INITIALISATION ---
main(); // Exécution immédiate au lancement
setInterval(main, CONFIG.CHECK_INTERVAL); // Planification récurrente