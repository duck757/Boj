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
}, 270000); // 4.5 mins

const { Client } = require("discord.js-selfbot-v13");
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client();
let recentCounters = new Map();
let selfCounted = 0;
let lastUserMessage = Date.now();
let skipUntil = 0;

// 💫 Dynamic personality
let personalityDelayMin = 45;
let personalityDelayMax = 160;

setInterval(() => {
  personalityDelayMin = Math.floor(Math.random() * 40) + 30;
  personalityDelayMax = Math.floor(Math.random() * 60) + 120;
}, 30 * 60 * 1000);

client.on("ready", () => {
  console.log(`[Login] Logged in as ${client.user.username}`);
});

client.on("messageCreate", async (message) => {
  if (message.channel.id !== CHANNEL_ID) return;

  const now = Date.now();
  const number = parseInt(message.content.trim());
  if (isNaN(number)) return;

  if (message.author.id !== client.user.id) {
    lastUserMessage = now;
    recentCounters.set(message.author.id, now);
  }

  for (const [id, time] of recentCounters.entries()) {
    if (now - time > 90000) recentCounters.delete(id);
  }

  const activePeople = recentCounters.size;
  const isSoloMode = activePeople === 1;

  if (now < skipUntil) {
    const minLeft = Math.ceil((skipUntil - now) / 60000);
    logStatus("Skipping", "On cooldown", { skipMinutes: minLeft });
    return;
  }

  if (message.author.id === client.user.id) return;

  if (now - lastUserMessage > 2 * 60 * 1000) {
    const mins = randInt(5, 15);
    skipUntil = now + mins * 60 * 1000;
    logStatus("Skipping", "Idle channel", { skipMinutes: mins });
    return;
  }

  const skipChance = Math.random() < Math.random() * 0.5;
  if (skipChance) {
    logStatus("Skipping", "Rolled chance");
    return;
  }

  const baseDelay = getHumanDelay(activePeople);
  const delay = addJitter(baseDelay);
  logStatus("Thinking", "Group delay", {
    delaySec: Math.floor(delay / 1000),
    activePeople,
    selfCounted,
  });

  await sleep(delay);

  const latest = (await message.channel.messages.fetch({ limit: 1 })).first();
  const latestNumber = parseInt(latest.content.trim());

  if (!latest || latest.id !== message.id || latestNumber !== number) {
    logStatus("Canceled", "Someone else counted");
    const retryDelay = addJitter(randInt(10000, 20000));
    logStatus("Retrying", "After cancel", {
      delaySec: Math.floor(retryDelay / 1000),
    });
    await sleep(retryDelay);

    const after = (await message.channel.messages.fetch({ limit: 1 })).first();
    const newNumber = parseInt(after.content.trim());
    if (!after || isNaN(newNumber)) return;

    const newNext = newNumber + 1;
    await message.channel.sendTyping();
    await sleep(randInt(1000, 3000));

    const confirm = (await message.channel.messages.fetch({ limit: 1 })).first();
    const checkNum = parseInt(confirm.content.trim());
    if (confirm.id !== after.id || checkNum !== newNumber) return;

    await message.channel.send(`${newNext}`);
    logStatus("Counting", `Retry sent ${newNext}`);
    handleSelfCount(isSoloMode);
    return;
  }

  const next = number + 1;
  await message.channel.sendTyping();
  await sleep(randInt(1000, 3000));

  const latestCheck = (await message.channel.messages.fetch({ limit: 1 })).first();
  const check = parseInt(latestCheck.content.trim());
  if (!latestCheck || latestCheck.id !== latest.id || check !== number) return;

  await message.channel.send(`${next}`);
  logStatus("Counting", `Sent ${next}`);
  handleSelfCount(isSoloMode);
});

function handleSelfCount(isSolo) {
  if (isSolo) {
    selfCounted++;
    if (selfCounted >= 6) {
      const mins = randInt(4, 7);
      skipUntil = Date.now() + mins * 60 * 1000;
      logStatus("Skipping", "6 solo counts", { skipMinutes: mins });
      selfCounted = 0;
    }
  } else {
    selfCounted = 0;
  }
}

function getHumanDelay(active) {
  if (active >= 4) return randInt(2000, 5000);
  if (active === 1) return randInt(60000, 180000);
  return randInt(personalityDelayMin * 1000, personalityDelayMax * 1000);
}

function addJitter(ms) {
  return ms + randInt(-200, 200) + (Math.random() < 0.1 ? randInt(0, 2000) : 0);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function logStatus(status, reason = "", data = {}) {
  let line = `[${status}] ${reason}`;
  if (data.delaySec) line += ` | ⏱ ${data.delaySec}s`;
  if (data.skipMinutes) line += ` | ⏳ ${data.skipMinutes}m`;
  if (data.activePeople !== undefined) line += ` | 👥 ${data.activePeople} active`;
  if (data.selfCounted !== undefined) line += ` | 🔢 ${data.selfCounted}`;
  console.log(line);
}

client.login(TOKEN);
