
require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");

const TOKEN = process.env.BOT2_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID_2;

const client = new Client();

client.on("ready", () => {
  console.log(`[Bot2] Logged in as ${client.user.username}`);
  startRandomCountingLoop();
});

async function startRandomCountingLoop() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  while (true) {
    const waitTime = randInt(3, 13) * 60 * 1000;
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
  console.log(`[Bot2][${status}] ${reason}`);
}

client.login(TOKEN);
