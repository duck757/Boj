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

const delayCycle = [
  { base: 2, range: 0.2 },
  { base: 5, range: 0.2 },
  { base: 13, range: 0.2 },
];
let delayIndex = 0;

client.on("ready", () => {
  console.log(`[Login] Logged in as ${client.user.username}`);
  startRandomCountingLoop();
});

async function startRandomCountingLoop() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  while (true) {
    const { base, range } = delayCycle[delayIndex % delayCycle.length];
    delayIndex++;

    const waitMins = randFloat(base - range, base + range);
    const waitTime = Math.floor(waitMins * 60 * 1000);

    logStatus("Sleeping", `Waiting ${waitMins.toFixed(2)} minutes`);
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

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function logStatus(status, reason) {
  console.log(`[${status}] ${reason}`);
}

client.login(TOKEN);
