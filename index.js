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
}, 270000); // every 4.5 mins

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
    const waitTime = randInt(7, 20) * 60 * 1000; // 10–20 mins
    logStatus("Sleeping", `Waiting ${Math.floor(waitTime / 60000)} mins`);
    await sleep(waitTime);

    const latest = (await channel.messages.fetch({ limit: 1 })).first();
    const latestNumber = parseInt(latest?.content.trim());

    if (!latest || isNaN(latestNumber)) {
      logStatus("Skipping", "Latest message is not a number");
      continue;
    }

    if (latest.author.id === client.user.id) {
      logStatus("Skipping", "Last message was from self — solo not allowed");
      continue;
    }

    const next = latestNumber + 1;

    await channel.sendTyping();
    await sleep(randInt(1000, 3000)); // human-like delay
    await channel.send(`${next}`);
    logStatus("Counting", `Sent ${next}`);
  }
}

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

