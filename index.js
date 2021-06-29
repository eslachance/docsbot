const Discord = require("discord.js");
const client = new Discord.Client({
  presence: {
    activity: {
      name: "+enmap <method>",
      type: "WATCHING",
    }
  }
});
const fetch = require("node-fetch");

const { prefix, token } = require("./config.json");
const findEmbed = require("./findEmbed");

client.on("ready", () => {
  console.log("[READY]", `${client.user.tag}, ready to serve ${client.users.cache.size} users in ${client.guilds.cache.size} servers.`, "Ready!");
});

const randos = [
  "The hell you think this is, the dictionary? I don't know everything, and certainly not `{word}`!",
  "`{word}`? `{word}`???? Since when was *that* an enmap feature?",
  "I'll have you know, punk, that I only do Enmap, and `{word}` is definitely not enmap!"
];

client.on("message", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command === 'enmap') {
    if (args[0] === 'info') {
      const data = await fetch('https://api.npms.io/v2/package/enmap').then(r => r.json());
      const {
        metadata: {
          version,
          releases,
        },
        npm: {
          downloads,
          dependentsCount,
          starsCount: npmStars,
        },
        github: {
          starsCount: ghStars,
          forksCount,
          commits,
        }
      } = data.collected;
      const msgdata = `= Enmap Stats & Info =
• Current Version  :: ${version}
• Downloads        :: ${downloads.reduce((c, a) => c + a.count, 0)}
• Releases         :: ${releases.reduce((c, a) => c + a.count, 0)}
• Commits          :: ${commits.reduce((c, a) => c + a.count, 0)}
• Stars            :: ${npmStars} (NPM), ${ghStars} (Github)

= Extra Data =
• Github Forks     :: ${forksCount}
• NPM Dependents   :: ${dependentsCount}

= This Bot =
• Servers          :: ${client.guilds.cache.size}
• Users            :: ${client.users.cache.size}
`;
      return message.channel.send(`\`\`\`asciidoc
${msgdata}
\`\`\`
Invite me: <https://discord.com/oauth2/authorize?client_id=738797867321393263&permissions=0&scope=bot>`);
    }
    const embed = findEmbed(args.join(" "));
    const m = await message.channel.send(embed ? ({ embed }) : randos.random().replace(/{word}/g, args.join(" ")));
    client.docResponses.set(message.id, m.id);
  }
});

client.on("messageDelete", async (message) => {
  if (!message.author.bot && client.docResponses.has(message.id)) {
    const msg = await message.channel.fetchMessage(client.docResponses.get(message.id)).catch();
    if (msg) msg.delete().catch();
  }
});

client.on("messageUpdate", async (client, om, nm) => {
  return; // TODO: FIX THIS
  const settings = client.getSettings(nm.guild);
  nm.settings = settings;
  const prefix = client.getPrefix(nm);

  // For the docs command
  if (!nm.author.bot && client.docsEnabled && nm.content.startsWith(prefix)) {
    const query = nm.content.slice(prefix.length).trim().split(/ +/).slice(1).join(" ");
    const embed = findEmbed(query);
    if (client.docResponses.has(nm.id)) {
      const msg = await nm.channel.fetchMessage(client.docResponses.get(nm.id)).catch(() => null);
      if (msg) {
        const m = await msg.edit(embed ? ({ embed }) : randos.random().replace(/{word}/g, query));
        return client.docResponses.set(nm.id, m.id);
      }
    }
    const m = await nm.channel.send(embed ? ({ embed }) : randos.random().replace(/{word}/g, query));
    client.docResponses.set(nm.id, m.id);
  }
});

const fs = require("fs");
fs.exists("./data", res => {
  if (!res) console.warn("[log] [Warn]The docs command is disabled, please run `npm i -g jsdoc` and `npm run docs` to enable the command");
});

// Needed for the messageUpdate and messageDelete support of the docs commmand
client.docResponses = new Map();
// Make sure client.docResponses doesn't eat more and more memory, until the bot crashes
const cachInterval = 2 * 60 * 60 * 1000;
let cache = [];
let bool = true;
setInterval(() => {
  if (bool) cache = [...client.docResponses.keys()];
  else cache.forEach(c => client.docResponses.delete(c));
  bool = !bool;
}, cachInterval);


client.login(token);

// I'm a big fat cheater and I edit core prototypes.
Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};