import "dotenv/config";
import { commands } from "./commands.js";
import { Client, GatewayIntentBits, REST, Routes, MessageFlags } from "discord.js";
import { EventSource } from "eventsource";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const apiToken = process.env.API_TOKEN;
const notifyChannelId = process.env.DISCORD_NOTIFY_CHANNEL_ID;
if (!notifyChannelId) throw new Error("Missing DISCORD_NOTIFY_CHANNEL_ID in .env");

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

async function get(path) {
    const res = await fetch(`http://localhost:3000${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

function formatEvent(ev) {
    const s = ev.summary || {};
    const file = s.file ? `\n**File:** ${s.file}` : "";
    const prog = (typeof s.progress === "number") ? `\n**Progress:** ${s.progress}%` : "";
    const layer = (s.layer != null) ? `\n**Layer:** ${s.layer}${s.totalLayers ? ` / ${s.totalLayers}` : ""}` : "";
    const rem = s.remaining != null ? `\n**Remaining:** ${s.remaining}` : "";

    switch (ev.type) {
        case "print_started":
            return `🖨️ **Print started**${file}${prog}${layer}${rem}`;
        case "print_finished":
            return `✅ **Print finished**${file}${prog}${layer}`;
        case "print_paused":
            return `⏸️ **Print paused**${file}${prog}${layer}`;
        case "print_error":
            return `⚠️ **Printer error / stopped**${file}${prog}${layer}`;
        case "progress_milestone":
            return `📈 **Progress milestone:** ${ev.milestone}%${file}`;
        case "state_changed":
            return `🔄 **State changed:** \`${ev.from}\` → \`${ev.to}\`${file}`;
        default:
            return `ℹ️ **Event:** ${ev.type}${file}`;
    }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
    console.log(`[BOT] logged in as ${client.user.tag}`);

    const channel = await client.channels.fetch(notifyChannelId);
    if (!channel || !channel.isTextBased()) {
        console.error("[BOT] Notify channel not found or not text-based");
        return;
    }

    // Connect to SSE stream
    const es = new EventSource(`http://localhost:3000/api/events?token=${encodeURIComponent(process.env.API_TOKEN)}`);

    es.onopen = () => console.log("[BOT] event stream connected");
    es.onerror = (e) => console.error("[BOT] event stream error", e);

    es.onmessage = async (msg) => {
        try {
            const ev = JSON.parse(msg.data);
            const text = formatEvent(ev);
            await channel.send(text);
        } catch (e) {
            console.error("[BOT] failed to handle event:", e.message);
        }
    };
});

client.on("interactionCreate", async (i) => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName !== "printer") return;

    const sub = i.options.getSubcommand();

    try {
        const sub = i.options.getSubcommand();

        const ephemeral = (sub !== "status"); // status public, everything else private
        await i.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });

        if (sub === "status") {
            const data = await get("/api/printer/status/pretty");
            const s = data.summary;

            if (!s.ok) {
                return i.editReply(`⚠️ No telemetry yet. Last seen: ${data.mqtt.lastSeenAt || "never"}`);
            }

            const lines = [
                `**State:** ${s.state ?? "unknown"}`,
                `**File:** ${s.file ?? "unknown"}`,
                `**Progress:** ${s.progress ?? "?"}%`,
                `**Layer:** ${s.layer ?? "?"}${s.totalLayers ? ` / ${s.totalLayers}` : ""}`,
                `**Remaining:** ${s.remaining ?? "?"}`,
                `**Nozzle:** ${s.nozzle ?? "?"}°C`,
                `**Bed:** ${s.bed ?? "?"}°C`,
            ];

            return i.editReply(lines.join("\n"));
        }

        if (sub === "led") {
            const state = i.options.getString("state", true);
            await post("/api/printer/led", { state });
            return i.editReply(`✅ Chamber light: **${state}**`);
        }

        if (sub === "morse") {
            const text = i.options.getString("text", true);
            const result = await post("/api/printer/morse", { text });
            return i.editReply(`📡 Sending Morse on chamber light: **${text}**`);
        }

        return i.editReply("Unknown command.");
    } catch (e) {
        console.error(e);
        return i.editReply(`❌ ${e.message}`);
    }
});

await registerCommands();
client.login(token);