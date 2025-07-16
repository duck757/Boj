require("dotenv").config();

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

client.on("ready", () => {
  console.log(`[Login] Logged in as ${client.user.username}`);
  startRandomCountingLoop();
});

async function startRandomCountingLoop() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  while (true) {
    const pacificNow = new Date().toLocaleString("en-US", {
  timeZone: "America/Los_Angeles",
});
const hour = new Date(pacificNow).getHours();

let minDelay, maxDelay;

if (hour >= 10 && hour < 21) {
  minDelay = 3;
  maxDelay = 7;
} else {
  minDelay = 7;
  maxDelay = 15;
}

const waitTime = randInt(minDelay, maxDelay) * 60 * 1000;
logStatus("Sleep Config", `Hour (PT): ${hour} | Range: ${minDelay}–${maxDelay} mins`);
    logStatus("Sleeping", `Waiting ${Math.floor(waitTime / 60000)} mins`);
    await sleep(waitTime);

    let retryAttempts = 0;

    while (retryAttempts <= 2) {
      const latest = (await channel.messages.fetch({ limit: 1 })).first();
      const latestNumber = parseInt(latest?.content.trim());

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
