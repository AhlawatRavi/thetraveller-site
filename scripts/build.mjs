// Builds the site into dist/.
//
// With YOUTUBE_API_KEY set, it fetches the channel's current stats and every
// upload from the YouTube Data API. Without it, it builds from
// data/snapshot.json so the site always works, just with frozen numbers.
//
// Usage: node scripts/build.mjs

import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const CACHE = path.join(ROOT, ".cache", "shorts.json");

const API_KEY = process.env.YOUTUBE_API_KEY || "";
const HANDLE = process.env.CHANNEL_HANDLE || "@thetravellervibe";
const SITE_URL = (process.env.SITE_URL || "https://thetravellervibe.in").replace(/\/$/, "");

const readJson = async (file, fallback) =>
  existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : fallback;

// ---- YouTube Data API -------------------------------------------------------

async function yt(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", API_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${endpoint} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// "PT1H2M3S" -> 3723
function isoDuration(s) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(s || "");
  if (!m) return null;
  const [, d = 0, h = 0, min = 0, sec = 0] = m.map((x) => (x === undefined ? 0 : Number(x)));
  return d * 86400 + h * 3600 + min * 60 + sec;
}

// The channel RSS feed lists the latest 15 uploads, and links Shorts as /shorts/ID.
// The API has no "is this a Short" field, so this is the reliable signal for new uploads.
async function shortsFromRss(channelId) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  if (!res.ok) return {};
  const xml = await res.text();
  const found = {};
  for (const m of xml.matchAll(/<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<link rel="alternate" href="([^"]+)"/g)) {
    found[m[1]] = m[2].includes("/shorts/");
  }
  return found;
}

// Fallback for an upload that has dropped out of the RSS feed before we saw it:
// youtube.com/shorts/ID answers 200 for a Short and redirects to /watch otherwise.
async function shortsUrlCheck(id) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, {
      method: "HEAD",
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 (compatible; theTraveller-site-builder)" },
    });
    if (res.status === 200) return true;
    if (res.status >= 300 && res.status < 400 && (res.headers.get("location") || "").includes("/watch")) return false;
  } catch {}
  return null;
}

async function fetchFromYouTube(snapshot) {
  const ch = await yt("channels", { part: "snippet,statistics,contentDetails", forHandle: HANDLE });
  const channel = ch.items?.[0];
  if (!channel) throw new Error(`No channel found for handle ${HANDLE}`);
  const uploads = channel.contentDetails.relatedPlaylists.uploads;

  const ids = [];
  let pageToken = "";
  do {
    const page = await yt("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: 50, ...(pageToken && { pageToken }) });
    for (const item of page.items || []) ids.push(item.contentDetails.videoId);
    pageToken = page.nextPageToken || "";
  } while (pageToken && ids.length < 1000);

  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = await yt("videos", { part: "snippet,contentDetails,statistics,status", id: ids.slice(i, i + 50).join(",") });
    for (const v of batch.items || []) {
      if (v.status?.privacyStatus !== "public" || v.snippet.liveBroadcastContent === "upcoming") continue;
      videos.push({
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        duration: isoDuration(v.contentDetails.duration),
        views: Number(v.statistics.viewCount || 0),
      });
    }
  }

  // Work out which uploads are Shorts: remembered answers first, then RSS, then a URL check.
  const known = { ...Object.fromEntries(snapshot.videos.map((v) => [v.id, v.short])), ...(await readJson(CACHE, {})) };
  Object.assign(known, await shortsFromRss(channel.id));
  for (const v of videos) {
    if (v.id in known) continue;
    if (v.duration !== null && v.duration > 180) { known[v.id] = false; continue; }
    const answer = await shortsUrlCheck(v.id);
    if (answer !== null) known[v.id] = answer;
  }
  for (const v of videos) v.short = v.id in known ? known[v.id] : v.duration !== null && v.duration <= 60;
  await mkdir(path.dirname(CACHE), { recursive: true });
  await writeFile(CACHE, JSON.stringify(known));

  return {
    updatedAt: new Date().toISOString(),
    source: "youtube",
    channel: {
      id: channel.id,
      title: channel.snippet.title,
      handle: HANDLE,
      subscribers: Number(channel.statistics.subscriberCount || 0),
      videoCount: Number(channel.statistics.videoCount || videos.length),
    },
    videos,
  };
}

// ---- Build ------------------------------------------------------------------

const snapshot = await readJson(path.join(ROOT, "data", "snapshot.json"));
const curation = await readJson(path.join(ROOT, "config", "curation.json"));

let data;
if (API_KEY) {
  // No fallback here on purpose: if YouTube fails, the build fails and the
  // live site keeps its last good version instead of reverting to the snapshot.
  data = await fetchFromYouTube(snapshot);
  console.log(`Fetched ${data.videos.length} uploads from YouTube (${data.videos.filter((v) => v.short).length} Shorts), ${data.channel.subscribers} subscribers.`);
} else {
  data = snapshot;
  console.warn("YOUTUBE_API_KEY is not set: building from data/snapshot.json (numbers will not update).");
}

const payload = JSON.stringify({ data, curation }).replace(/</g, "\\u003c");
const template = await readFile(path.join(SRC, "index.html"), "utf8");
if (!template.includes("__SITE_DATA__")) throw new Error("src/index.html is missing the __SITE_DATA__ placeholder");
const html = template.replace("__SITE_DATA__", () => payload).replaceAll("__SITE_URL__", SITE_URL);

await rm(DIST, { recursive: true, force: true });
await cp(SRC, DIST, { recursive: true });
await writeFile(path.join(DIST, "index.html"), html);
await writeFile(path.join(DIST, "data.json"), JSON.stringify(data, null, 1));
console.log(`Built ${path.relative(ROOT, DIST)}/ (${data.source}, updated ${data.updatedAt}).`);
