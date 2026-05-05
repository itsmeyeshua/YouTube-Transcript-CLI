#!/usr/bin/env node
"use strict";

const { YoutubeTranscript } = require("youtube-transcript");
const clipboardy = require("clipboardy");
const chalk = require("chalk");

function printUsage() {
  console.log(`
${chalk.bold.cyan("YouTube Transcript Fetcher")}

${chalk.bold("Usage:")}
  ${chalk.green("./transcript")} ${chalk.yellow("[LINK] [LANG] [FROM] [TO]")} ${chalk.magenta("[--no-timestamps]")}

${chalk.bold("Arguments:")}
  ${chalk.yellow("LINK")}              YouTube video URL or video ID               ${chalk.gray("(required)")}
  ${chalk.yellow("LANG")}              Language code: en, ar, fr, es, de …        ${chalk.gray('(default: "en")')}
  ${chalk.yellow("FROM")}              Start time  – any of: 0  90  1:30  00:01:30 ${chalk.gray("(default: beginning)")}
  ${chalk.yellow("TO")}                End   time  – same formats as FROM          ${chalk.gray("(default: end)")}

${chalk.bold("Flags:")}
  ${chalk.magenta("--no-timestamps")}  Hide [HH:MM:SS] timestamps from output      ${chalk.gray("(default: shown)")}
  ${chalk.magenta("-nt")}              Shorthand for --no-timestamps

${chalk.bold("Time formats supported:")}
  ${chalk.gray("seconds only :")}  90
  ${chalk.gray("mm:ss        :")}  1:30  or  01:30
  ${chalk.gray("hh:mm:ss     :")}  1:22:0  or  00:15:10

${chalk.bold("Examples:")}
  ${chalk.green("./transcript")} https://youtu.be/VIDEO_ID
  ${chalk.green("./transcript")} https://youtu.be/VIDEO_ID fr
  ${chalk.green("./transcript")} https://youtu.be/VIDEO_ID en 1:30 3:00
  ${chalk.green("./transcript")} https://youtu.be/VIDEO_ID en 1:30 3:00 ${chalk.magenta("--no-timestamps")}
  ${chalk.green("./transcript")} https://www.youtube.com/watch?v=VIDEO_ID ar 00:01:00 00:05:30
  ${chalk.green("./transcript")} VIDEO_ID en 0 1:22:0 ${chalk.magenta("-nt")}
`);
}

function parseTime(str) {
  if (!str || str.trim() === "") 
    return null;
  str = str.trim();
  const parts = str.split(":").map(Number);
  if (parts.some(isNaN)) 
    throw new Error(`Invalid time format: "${str}". Use seconds (90), mm:ss (1:30) or hh:mm:ss (00:01:30).`);
  if (parts.length === 1) 
    return parts[0];
  if (parts.length === 2) 
    return parts[0] * 60 + parts[1];
  if (parts.length === 3) 
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  throw new Error(`Invalid time format: "${str}".`);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function extractVideoId(input) {
  try {
    if (!input.startsWith("http")) {
      input = "https://" + input;
    }
    const url = new URL(input);
    const host = url.hostname;

    const isYouTube =
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host.endsWith(".youtube-nocookie.com");

    if (!isYouTube)
      throw new Error("Invalid YouTube URL");

    if (url.hostname === "youtu.be") 
      return url.pathname.slice(1).split(/[?#]/)[0];
    const v = url.searchParams.get("v");
    if (v) 
      return v;
    const match = url.pathname.match(/(?:embed|shorts|v|live)\/([^/?&]+)/);
    if (match) 
      return match[1];
  } catch(err) {
    if (err.message === "Invalid YouTube URL")
      throw err;

    if (/^[A-Za-z0-9_-]{11}$/.test(input)) 
      return input;
  }
  throw new Error(`Could not extract a video ID from: "${input}"`);
}

async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs[0] === "--help" || rawArgs[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  const showTimestamps = !rawArgs.includes("--no-timestamps") && !rawArgs.includes("-nt");
  const args = rawArgs.filter((a) => a !== "--no-timestamps" && a !== "-nt");

  const [linkArg, langArg = "en", fromArg, toArg] = args;

  let videoId;
  try {
    videoId = extractVideoId(linkArg);
  } catch (e) {
    console.error(chalk.red("\n✖ " + e.message + "\n"));
    process.exit(1);
  }

  let fromSec = null;
  let toSec = null;
  try {
    fromSec = parseTime(fromArg);
    toSec = parseTime(toArg);
  } catch (e) {
    console.error(chalk.red("\n✖ " + e.message + "\n"));
    process.exit(1);
  }

  if (fromSec !== null && toSec !== null && fromSec >= toSec) {
    console.error(chalk.red("\n✖ FROM time must be less than TO time.\n"));
    process.exit(1);
  }

  const fromLabel = fromSec !== null ? formatTime(fromSec) : "start";
  const toLabel = toSec !== null ? formatTime(toSec) : "end";
  const timeRange = fromSec !== null || toSec !== null ? ` · ${fromLabel} → ${toLabel}` : "";

  console.log(
    chalk.cyan(`\nFetching transcript`) +
    chalk.gray(` [${langArg.toUpperCase()}${timeRange}]`) +
    chalk.cyan(" for ") +
    chalk.bold(videoId)
  );

  let rawEntries;
  try {
    rawEntries = await YoutubeTranscript.fetchTranscript(videoId, { lang: langArg });
  } catch (err) {
    const msg = err.message || String(err);
    if (langArg !== "en" && (msg.toLowerCase().includes("no transcripts") || msg.toLowerCase().includes("could not find"))) {
      console.warn(chalk.yellow(`⚠  No transcript for lang="${langArg}", falling back to "en"…`));
      try {
        rawEntries = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
      } catch (e2) {
        console.error(chalk.red("\n✖ Could not fetch transcript: " + (e2.message || e2)));
        console.error(chalk.gray("  Make sure the video has captions enabled.\n"));
        process.exit(1);
      }
    } else {
      console.error(chalk.red("\n✖ Could not fetch transcript: " + msg));
      console.error(chalk.gray("  Make sure the video has captions and the language code is correct.\n"));
      process.exit(1);
    }
  }

  // entries that overlap the desired time range
  const entries = rawEntries.filter((entry) => {
    const startSec = entry.offset / 1000;
    const endSec = startSec + entry.duration / 1000;
    if (fromSec !== null && endSec <= fromSec) 
      return false;
    if (toSec !== null && startSec >= toSec) 
      return false;
    return true;
  });

  if (entries.length === 0) {
    console.warn(chalk.yellow("\n⚠  No transcript entries found in the given time range.\n"));
    process.exit(0);
  }

  const lines = entries.map((e) => {
    const ts = formatTime(e.offset / 1000);
    const text = e.text.replace(/\n/g, " ").trim();
    return showTimestamps ? `[${ts}] ${text}` : text;
  });
  const output = lines.join("\n");

  const actualFrom = formatTime(entries[0].offset / 1000);
  const actualTo = formatTime(entries[entries.length - 1].offset / 1000);
  const tsLabel = showTimestamps ? "" : chalk.gray(" · timestamps hidden");

  console.log(
    chalk.bold.green("\n✔ Transcript fetched! ") +
    chalk.gray(`${entries.length} segments · ${actualFrom} → ${actualTo}`) +
    tsLabel + "\n"
  );
  console.log(chalk.gray("─".repeat(65)));

  entries.forEach((entry) => {
    const ts = formatTime(entry.offset / 1000);
    const text = entry.text.replace(/\n/g, " ").trim();
    if (showTimestamps) {
      process.stdout.write(chalk.bold.blue(`[${ts}]`) + "  " + text + "\n");
    } else {
      process.stdout.write(text + "\n");
    }
  });

  console.log(chalk.gray("─".repeat(65)));

  try {
    clipboardy.writeSync(output);
    console.log(chalk.green("\n📋 Transcript copied to clipboard!\n"));
  } catch {
    console.log(chalk.yellow("\n⚠  Could not copy to clipboard (headless/SSH environment). Transcript is printed above.\n"));
  }
}

main();
