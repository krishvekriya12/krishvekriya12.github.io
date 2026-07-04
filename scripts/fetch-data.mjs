/**
 * Auto-fetch pipeline for krishvekriya12.github.io
 *
 * Scrapes the Setubandh Tech developer profile on Google Play and pulls
 * full details for every published app (icon, rating, installs,
 * screenshots, description, category), plus tracked professional-work
 * apps grouped by the company they were built at.
 *
 * Outputs: data/apps.json
 * Run daily by .github/workflows/update-data.yml
 */
import gplay from 'google-play-scraper';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV_ID = '7084161944711464301';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAppDetail(appId, listItem = null) {
  try {
    const d = await gplay.app({ appId });
    return {
      appId: d.appId,
      title: d.title,
      summary: d.summary,
      icon: d.icon,
      url: `https://play.google.com/store/apps/details?id=${d.appId}`,
      score: d.score ? Math.round(d.score * 10) / 10 : null,
      ratings: d.ratings ?? null,
      installs: d.maxInstalls ?? null,
      installsText: d.installs ?? null,
      genre: d.genre ?? null,
      screenshots: (d.screenshots ?? []).slice(0, 6),
      released: d.released ?? null,
      updated: d.updated ?? null,
      free: d.free ?? true,
    };
  } catch (err) {
    console.warn(`  ✗ Failed detail fetch for ${appId}: ${err.message}`);
    if (!listItem) return null; // tracked app unpublished/unavailable — skip it
    // Keep the app with list-level data so it still shows on the site.
    return {
      appId: listItem.appId,
      title: listItem.title,
      summary: listItem.summary ?? '',
      icon: listItem.icon,
      url: `https://play.google.com/store/apps/details?id=${listItem.appId}`,
      score: listItem.score ? Math.round(listItem.score * 10) / 10 : null,
      ratings: null,
      installs: null,
      installsText: null,
      genre: null,
      screenshots: [],
      released: null,
      updated: null,
      free: true,
    };
  }
}

async function fetchApps() {
  console.log('Fetching app list for developer', DEV_ID);
  const list = await gplay.developer({ devId: DEV_ID, num: 100 });
  console.log(`Found ${list.length} apps on the Setubandh Tech profile`);

  const myApps = [];
  for (const item of list) {
    const app = await fetchAppDetail(item.appId, item);
    if (app) {
      myApps.push(app);
      console.log(`  ✓ [mine] ${app.title}`);
    }
    await sleep(600); // be polite to Play's servers
  }

  // Professional work: apps built at previous companies, tracked by package ID
  // and tagged with the company they were built at.
  const tracked = JSON.parse(
    await readFile(path.join(ROOT, 'scripts', 'tracked-apps.json'), 'utf8')
  );
  const mine = new Set(myApps.map((a) => a.appId));
  const workApps = [];
  for (const entry of tracked.workApps) {
    const appId = typeof entry === 'string' ? entry : entry.appId;
    const company = typeof entry === 'string' ? null : entry.company ?? null;
    if (mine.has(appId)) continue; // moved to own profile — don't duplicate
    const app = await fetchAppDetail(appId);
    if (app) {
      workApps.push({ ...app, company });
      console.log(`  ✓ [work · ${company ?? 'unknown'}] ${app.title}`);
    }
    await sleep(600);
  }

  // Most-installed first so the strongest work leads each grid.
  myApps.sort((a, b) => (b.installs ?? 0) - (a.installs ?? 0));
  workApps.sort((a, b) => (b.installs ?? 0) - (a.installs ?? 0));
  return { myApps, workApps };
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const { myApps, workApps } = await fetchApps();

  if (myApps.length === 0 && workApps.length === 0) {
    // Never wipe good data with an empty scrape (Play layout change, block, etc.)
    console.error('Scrape returned 0 apps — keeping existing data/apps.json');
    process.exitCode = 1;
    return;
  }

  const all = [...myApps, ...workApps];
  const totalInstalls = all.reduce((s, a) => s + (a.installs ?? 0), 0);
  await writeFile(
    path.join(DATA_DIR, 'apps.json'),
    JSON.stringify(
      {
        developer: 'Setubandh Tech',
        devUrl: `https://play.google.com/store/apps/dev?id=${DEV_ID}`,
        fetchedAt: new Date().toISOString(),
        totalApps: all.length,
        totalInstalls,
        myApps,
        workApps,
      },
      null,
      2
    )
  );
  console.log(
    `Wrote data/apps.json (${myApps.length} own + ${workApps.length} work apps, ~${totalInstalls} installs)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
