require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");
const path = require("path");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Auth Google Drive
const keyData = Buffer.from(process.env.GOOGLE_KEY_BASE64, "base64").toString("utf8");
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(keyData),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

let lastSeenFileId = null;

async function checkDriveFolder() {
  try {
    const res = await drive.files.list({
      q: `'${process.env.FOLDER_ID}' in parents and trashed = false`,
      orderBy: "createdTime desc",
      pageSize: 1,
      fields: "files(id, name, webViewLink, createdTime)",
    });

    const file = res.data.files[0];
    if (!file) return;

    if (file.id !== lastSeenFileId) {
      lastSeenFileId = file.id;
      const channel = await client.channels.fetch(process.env.CHANNEL_ID);
      await channel.send(`📄 Nouveau document ajouté : **${file.name}**\n🔗 ${file.webViewLink}`);
      console.log(`Nouveau fichier détecté : ${file.name}`);
    }
  } catch (error) {
    console.error("Erreur dans checkDriveFolder :", error);
  }
}

client.once("ready", () => {
  console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
  checkDriveFolder();
  setInterval(checkDriveFolder, 5 * 60 * 1000); // toutes les 5 minutes
});

client.login(process.env.DISCORD_TOKEN);