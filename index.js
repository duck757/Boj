require("dotenv").config();

const IGNORED_USERS = [
  "1393467249511239821",
  "1351759100920205365",
  "1369645780167557253"
];

console.log("[DEBUG] Loaded IGNORED_USERS:", IGNORED_USERS);

const express = require("express");
const app = express();
app.get("/healthz", (_, res) => res.send("OK"));
app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ KeepAlive running on port ${process.env.PORT || 3000}`);
});

const { fetch } = require("undici");
const SELF_URL = process.env.SELF_URL;
setInterval(() => {
  fetch(SELF_URL).catch(() => {});
}, 270000); // every 4.5 minutes

const { Client } = require("discord.js-selfbot-v13");
const client = new Client();

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

let isCountingPaused = false;

client.on("ready", () => {
  console.log(`[Login] Logged in as ${client.user.username}`);
  startRandomCountingLoop();
});

client.on("messageCreate", async (msg) => {
  
  if (IGNORED_USERS.includes(msg.author.id)) return;

  // === Pause on Ping ===
  if (msg.mentions.has(client.user)) {
    isCountingPaused = true;
    logStatus("Paused", `Bot was pinged in #${msg.channel.name}`);

    // Auto-resume after 30 minutes
    setTimeout(() => {
      isCountingPaused = false;
      logStatus("Resumed", "Pause duration over");
    }, 30 * 60 * 1000);
  }

  // === Giveaway Auto-Join ===
  const giveawayChannelIds = [
    "1078181149333004368",
    "1359710675005603881",
  ];

  try {
    if (
      giveawayChannelIds.includes(msg.channel.id) &&
      msg.embeds.length &&
      (
        msg.content.toLowerCase().includes("react with 🎉") ||
        msg.embeds[0]?.description?.toLowerCase().includes("giveaway")
      )
    ) {
      await msg.react("🎉");
      logStatus("Giveaway", `🎉 Joined giveaway in #${msg.channel.name}`);
    }
  } catch (err) {
    logStatus("Error", `Giveaway reaction failed: ${err.message}`);
  }
});

async function startRandomCountingLoop() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  while (true) {
    while (isCountingPaused) {
      logStatus("Paused", "Waiting until unpaused...");
      await sleep(60000); // Check every 1 minute
    }

    const waitTime = randInt(1, 3) * 60 * 1000;
    logStatus("Sleeping", `Waiting ${Math.floor(waitTime / 60000)} mins`);
    await sleep(waitTime);

    let retryAttempts = 0;

    while (retryAttempts <= 2) {
      const latest = (await channel.messages.fetch({ limit: 1 })).first();
      const latestNumber = parseInt(latest?.content.trim());

      if (IGNORED_USERS.includes(latest.author.id)) {
  logStatus("Ignored", `Last message was by ignored user (${latest.author.username}) — skipping`);
  break;
      }
      
      if (!latest || isNaN(latestNumber)) {
        logStatus("Skipping", "Latest message is not a number");
        break;
      }

      if (latest.author.id === client.user.id) {
        logStatus("Skipping", "Last message was from self — solo not allowed");
        break;
      }

      const next = latestNumber + 1;

      await channel.sendTyping();
      await sleep(randInt(1000, 3000)); // Human-like delay

      const confirm = (await channel.messages.fetch({ limit: 1 })).first();
      const confirmNum = parseInt(confirm?.content.trim());

      if (
        !confirm ||
        confirm.id !== latest.id ||
        confirmNum !== latestNumber
      ) {
        retryAttempts++;
        if (retryAttempts > 2) {
          logStatus("Canceled", "Sniped again. Giving up this round.");
          break;
        }

        logStatus("Retrying", `Sniped — retrying immediately (attempt ${retryAttempts})`);
        continue;
      }

      await channel.send(`${next}`);
      logStatus("Counting", `Sent ${next}`);
      break;
    }
  }
}

// === Utilities ===
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function logStatus(status, reason) {
  console.log(`[${status}] ${reason}`);
}

client.login(TOKEN);
