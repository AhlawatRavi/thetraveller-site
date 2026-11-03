# theTraveller website: setup guide

This folder is your website. Once it's set up, it updates itself **every hour** from your YouTube channel:

- subscriber count and number of videos
- view counts on every video and Short
- **Latest uploads** and **Latest Shorts**: new uploads appear on their own
- **Most watched** videos and Shorts, re-ranked by views
- **Pick a route** tabs: new videos are sorted in by words in their title (fort, temple, beach, Delhi…)

It runs on **GitHub Pages**, which is free. Your only cost is the domain (thetravellervibe.in).

Setup takes about 30 minutes, once. You need:

1. A **Google account** (the one that owns your YouTube channel is fine)
2. A free **GitHub account**: sign up at https://github.com/signup
3. Your domain **thetravellervibe.in**, bought on GoDaddy (step 5; you can do it last)

---

## Step 1: Get a YouTube key (free, 10 minutes)

The site needs a "key" to read your public channel numbers from YouTube.

1. Go to https://console.cloud.google.com and sign in with your Google account.
2. At the top, click the project picker, then **New project**. Name it `theTraveller website` and click **Create**. Make sure the new project is selected at the top.
3. Open https://console.cloud.google.com/apis/library/youtube.googleapis.com and click **Enable** on **YouTube Data API v3**.
4. Go to **APIs & Services → Credentials**, click **Create credentials → API key**.
5. Click **Edit API key** (or the key's name). Under **API restrictions**, choose **Restrict key** and tick only **YouTube Data API v3**. Click **Save**.
6. Copy the key (a long code starting with `AIza…`). Keep it private; you'll paste it into GitHub in step 3.

You don't need to add a card or pay: this free key allows 10,000 units a day, and the site uses about 170.

## Step 2: Put the website on GitHub (10 minutes)

1. Sign in at https://github.com and click **+ → New repository** (top right).
2. Name it `thetraveller-site`. Choose **Public** (free GitHub Pages needs a public repository; your key stays secret anyway). Click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Open this folder (`D:\Claude\thetraveller-site`) in File Explorer, select **everything inside it** (including the `.github` folder), and drag it onto the GitHub page. Don't upload the `dist` or `.cache` folders if you see them.
5. Click **Commit changes**.

> **Check:** on GitHub you should see the folders `.github`, `config`, `data`, `scripts`, `src`. If `.github` is missing, click **Add file → Create new file**, type `.github/workflows/deploy.yml` as the name, paste in the contents of that file from this folder, and click **Commit changes**.

## Step 3: Give GitHub your YouTube key

1. In your repository, open **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `YOUTUBE_API_KEY`. Secret: paste your key from step 1. Click **Add secret**.

The key is stored encrypted. It's never put on the website and nobody visiting can see it.

## Step 4: Turn on the website

1. In your repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open the **Actions** tab, click **Update and publish site** on the left, then **Run workflow → Run workflow**.
4. Wait about 1–2 minutes until a green tick appears.
5. Your site is now live at `https://YOUR-GITHUB-NAME.github.io/thetraveller-site/`. The footer should say **"Updated …"** with today's date.

From now on it rebuilds itself every hour. You don't have to do anything.

## Step 5: Use your own address (thetravellervibe.in)

After buying the domain on GoDaddy:

**On GitHub**
1. **Settings → Pages → Custom domain**: type `thetravellervibe.in` and click **Save**.
2. **Settings → Secrets and variables → Actions → Variables tab → New repository variable**: name `SITE_URL`, value `https://thetravellervibe.in`. This makes link previews on WhatsApp and other apps use your domain.

**On GoDaddy** (My Products → your domain → **DNS**)
1. If there's an existing **A** record with name `@` (often "Parked"), delete it.
2. Add **four A records**, each with name `@`:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
3. Add a **CNAME** record: name `www`, value `YOUR-GITHUB-NAME.github.io`.
   (If a `www` CNAME already exists, edit it instead.)

It can take from a few minutes up to 24 hours to start working. When it does, go back to **Settings → Pages** and tick **Enforce HTTPS** so the address bar shows the padlock.

**Recommended:** protect your domain on GitHub. In your *account* settings (click your photo → **Settings → Pages**), click **Add a domain**, enter `thetravellervibe.in`, and follow the steps. This stops anyone else from using your domain on GitHub.

---

## Changing what the site shows

Most of the site is automatic. The hand-picked parts live in `config/curation.json`. To change it, open that file on GitHub, click the **pencil icon**, edit, then click **Commit changes**. The site updates in about 2 minutes.

| You want to… | Change this in `curation.json` |
|---|---|
| Give a video a nicer title, place or map coordinates | Add it under `"videos"`, using the ID from its YouTube link (the part after `v=`) |
| Give a Short a nicer title | Add it under `"shorts"` (the ID is the part after `/shorts/`) |
| Hide a video or Short (for example non-travel clips) | Add its ID to the `"hide"` list |
| Put a video in a different route tab | Add `"VIDEO_ID": "forts"` (or `temples`, `coast`, `north`) inside `"assign"` |
| Keep a video out of every route tab | Add `"VIDEO_ID": "none"` inside `"assign"` |
| Make a route tab catch more videos | Add words to that route's `"keywords"` list |

New videos you don't add here still appear. They just use your YouTube title (shortened) and show the upload month instead of map coordinates.

## Is it working?

- **Actions tab:** a new green tick roughly every hour. A red cross means that run failed; the live site keeps showing the last good version.
- **Site footer:** "Updated *date, time* IST". If it says "Numbers from 3 Nov 2026", the YouTube key isn't set (step 3).

## Troubleshooting

| Problem | Fix |
|---|---|
| Red cross, error mentions `403` or `API key not valid` | Check the secret in step 3 is named exactly `YOUTUBE_API_KEY`, and that YouTube Data API v3 is enabled (step 1.3) |
| Red cross on the **deploy** step | Settings → Pages → Source must be **GitHub Actions** (step 4) |
| Site shows old numbers | Actions tab → **Update and publish site** → **Run workflow** |
| Hourly updates stopped | Actions tab → **Update and publish site**. If it says the workflow is disabled, click **Enable workflow** |
| Domain shows a GoDaddy page | DNS not updated yet; wait, and recheck the four A records in step 5 |

## What's in this folder

| Path | What it is |
|---|---|
| `src/index.html` | The page design (layout, colours, text) |
| `src/logo.webp`, `src/logo-runner.webp` | Your two logos |
| `config/curation.json` | Your hand-picked titles, hidden clips and route tabs |
| `data/snapshot.json` | A saved copy of your channel from 3 Nov 2026, used only until the YouTube key is set |
| `scripts/build.mjs` | Fetches YouTube data and builds the site |
| `.github/workflows/deploy.yml` | Tells GitHub to run the build every hour and publish it |

To preview on your own computer (optional; needs [Node.js](https://nodejs.org)): run `node scripts/build.mjs` in this folder, then open `dist/index.html` in your browser.
