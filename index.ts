import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";

const emojis: { batteryIndicators: string[]; chargingIndicator: string } = {
  batteryIndicators: [
    "<:battery0:1164975377651879946>",
    "<:battery25:1164975379124080661>",
    "<:battery50:1164975382227849346>",
    "<:battery75:1164975384757026826>",
    "<:battery100:1164975386099187712>",
  ],
  chargingIndicator: "⚡",
};

type BatStatus = {
  percentage: number;
  isCharging: boolean;
};

async function getBattery(): Promise<BatStatus | null> {
  const { stdout, stderr } = Bun.spawn(["acpi", "-b"]);

  const stdoutStr = await new Response(stdout).text();
  const stderrStr = await new Response(stderr).text();

  if (stderrStr.trim() || !stdoutStr.trim()) {
    console.log(stderrStr);
    return null;
  }

  // stupid regex that chatgpt generated
  const regexPattern = /(\d+)%|(\w+),/g;

  let matches;
  let percentage = null;
  let chargingStatus = null;

  while ((matches = regexPattern.exec(stdoutStr.trim())) !== null) {
    if (matches[1]) {
      percentage = matches[1];
    } else if (matches[2]) {
      chargingStatus = matches[2];
    }
  }

  if (!chargingStatus || percentage == null) {
    return null;
  }

  return {
    percentage: +percentage,
    isCharging: chargingStatus === "Charging",
  };
}

async function setBotStatus(client: Client<true>) {
  let batRes = await getBattery();
  if (!batRes) {
    console.log("Failed to get battery percentage");
    return;
  }

  const step = 100 / (emojis.batteryIndicators.length - 1);
  const index = Math.round(batRes.percentage / step);

  const str =
    (batRes.isCharging ? `${emojis.chargingIndicator} ` : "") +
    // `${emojis.batteryIndicators[index]} ` +
    `Baterija: ${batRes.percentage}% ` +
    (batRes.isCharging ? "(lādējas)" : "");

  console.log("set presence");
  client.user.setPresence({
    activities: [
      {
        state: str,
        type: ActivityType.Custom,
        name: '-'
      },
    ],
  });
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const INTERVAL_SECONDS = 60;

client.once(Events.ClientReady, (c) => {
  console.log(`Ielogojies ${c.user.tag}`);
  setBotStatus(c);
  setInterval(() => setBotStatus(c), INTERVAL_SECONDS * 1000);
});

client.login(process.env.TOKEN);
