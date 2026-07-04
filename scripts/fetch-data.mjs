/**
 * Auto-fetch pipeline for krishvekriya12.github.io
 *
 * 1. Scrapes the Setubandh Tech developer profile on Google Play and pulls
 *    full details for every published app (icon, rating, installs,
 *    screenshots, description, category).
 * 2. Fetches pinned GitHub repos via the GraphQL API (falls back to
 *    top-starred repos when nothing is pinned).
 *
 * Outputs: data/apps.json, data/github.json
 * Run daily by .github/workflows/update-data.yml
 */
import gplay from 'google-play-scraper';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV_ID = '7084161944711464301';
const GITHUB_USER = 'krishvekriya12';
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

  // Professional work: apps built at previous companies, tracked by package ID.
  const tracked = JSON.parse(
    await readFile(path.join(ROOT, 'scripts', 'tracked-apps.json'), 'utf8')
  );
  const mine = new Set(myApps.map((a) => a.appId));
  const workApps = [];
  for (const appId of tracked.workApps) {
    if (mine.has(appId)) continue; // moved to own profile — don't duplicate
    const app = await fetchAppDetail(appId);
    if (app) {
      workApps.push(app);
      console.log(`  ✓ [work] ${app.title}`);
    }
    await sleep(600);
  }

  // Most-installed first so the strongest work leads each grid.
  myApps.sort((a, b) => (b.installs ?? 0) - (a.installs ?? 0));
  workApps.sort((a, b) => (b.installs ?? 0) - (a.installs ?? 0));
  return { myApps, workApps };
}

async function fetchGithub() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  let repos = [];

  if (token) {
    try {
      const query = `query {
        user(login: "${GITHUB_USER}") {
          pinnedItems(first: 6, types: REPOSITORY) {
            nodes {
              ... on Repository {
                name description url stargazerCount forkCount
                primaryLanguage { name color }
                pushedAt
              }
            }
          }
        }
      }`;
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      repos = (json?.data?.user?.pinnedItems?.nodes ?? [])
        .filter(Boolean)
        .map((r) => ({
          name: r.name,
          description: r.description,
          url: r.url,
          stars: r.stargazerCount,
          forks: r.forkCount,
          language: r.primaryLanguage?.name ?? null,
          languageColor: r.primaryLanguage?.color ?? null,
          pushedAt: r.pushedAt,
          pinned: true,
        }));
      console.log(`Fetched ${repos.length} pinned repos`);
    } catch (err) {
      console.warn('Pinned repo fetch failed:', err.message);
    }
  } else {
    console.warn('No GITHUB_TOKEN available — skipping pinned repos');
  }

  if (repos.length === 0) {
    // Fallback: top-starred public repos via unauthenticated REST.
    console.log('Falling back to top-starred repos');
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    const all = await res.json();
    if (Array.isArray(all)) {
      repos = all
        .filter((r) => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 6)
        .map((r) => ({
          name: r.name,
          description: r.description,
          url: r.html_url,
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language,
          languageColor: null,
          pushedAt: r.pushed_at,
          pinned: false,
        }));
    }
  }
  return repos;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const [{ myApps, workApps }, repos] = await Promise.all([fetchApps(), fetchGithub()]);

  if (myApps.length === 0 && workApps.length === 0) {
    // Never wipe good data with an empty scrape (Play layout change, block, etc.)
    console.error('Scrape returned 0 apps — keeping existing data/apps.json');
    process.exitCode = 1;
  } else {
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

  await writeFile(
    path.join(DATA_DIR, 'github.json'),
    JSON.stringify({ fetchedAt: new Date().toISOString(), user: GITHUB_USER, repos }, null, 2)
  );
  console.log(`Wrote data/github.json (${repos.length} repos)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
