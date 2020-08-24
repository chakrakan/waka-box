require("dotenv").config();
const { WakaTimeClient } = require("wakatime-client");
const Octokit = require("@octokit/rest");

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  WAKATIME_API_KEY: wakatimeApiKey
} = process.env;

const wakatime = new WakaTimeClient(wakatimeApiKey);

const octokit = new Octokit({ auth: `token ${githubToken}` });
const today = new Date();
const yesterday = new Date(Date.now() - 864e5);

async function main() {
  const stats = await wakatime.getMySummary({
    dateRange: {
      startDate: yesterday.toISOString(),
      endDate: today.toISOString()
    }
  });
  await updateGist(stats);
}

async function updateGist(stats) {
  let gist;
  try {
    gist = await octokit.gists.get({ gist_id: gistId });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
  }

  const lines = [];

  // check if "today" data is populated for the day
  if (stats.data[1].languages.length) {
    for (let i = 0; i < Math.min(stats.data[1].languages.length, 20); i++) {
      const data = stats.data[1].languages[i];
      const { name, percent, text: time } = data;

      const line = [
        name.padEnd(11),
        time.padEnd(14),
        generateBarChart(percent, 21),
        String(percent.toFixed(1)).padStart(5) + "%"
      ];

      lines.push(line.join(" "));
    }
    lines.push(`\nLast Activity: ${today}\n`);
  }

  if (lines.length == 0) return;

  try {
    // Get original filename to update that same file
    const filename = Object.keys(gist.data.files)[0];
    console.debug(lines);
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `💻 Kan's Coding Activity`,
          content: lines.join("\n")
        }
      }
    });
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
}

function generateBarChart(percent, size) {
  const syms = "░▏▎▍▌▋▊▉█";

  const frac = Math.floor((size * 8 * percent) / 100);
  const barsFull = Math.floor(frac / 8);
  if (barsFull >= size) {
    return syms.substring(8, 9).repeat(size);
  }
  const semi = frac % 8;

  return [syms.substring(8, 9).repeat(barsFull), syms.substring(semi, semi + 1)]
    .join("")
    .padEnd(size, syms.substring(0, 1));
}

(async () => {
  await main();
})();
