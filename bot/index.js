import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { commands } from "./commands.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const apiToken = process.env.API_TOKEN;

if (!token || !clientId || !guildId || !apiToken) {
  throw new Error("Missing DISCORD_TOKEN / DISCORD_CLIENT_ID / DISCORD_GUILD_ID / API_TOKEN in .env");
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log("[BOT] Slash commands registered");
}

async function post(path, body) {
  const res = await fetch(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", () => console.log(`[BOT] logged in as ${client.user.tag}`));

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;
  if (i.commandName !== "printer") return;

  const sub = i.options.getSubcommand();

  try {
    await i.deferReply({ ephemeral: true });

    if (sub === "led") {
      const state = i.options.getString("state", true);
      await post("/api/printer/led", { state });
      return i.editReply(`✅ Chamber light: **${state}**`);
    }

    return i.editReply("Unknown command.");
  } catch (e) {
    console.error(e);
    return i.editReply(`❌ ${e.message}`);
  }
});

await registerCommands();
client.login(token);