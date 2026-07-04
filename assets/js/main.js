/* Krish Vekariya — portfolio
   Renders live Play Store data from /data/apps.json
   (refreshed daily by .github/workflows/update-data.yml) */

(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#navBurger');
  const links = $('#navLinks');
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
      burger.classList.remove('open');
    }
  });

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
  );
  const observeReveals = (root = document) => $$('.reveal', root).forEach((el) => io.observe(el));
  observeReveals();

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Play Store strings arrive HTML-encoded — decode before re-escaping
  const decode = (s) => String(s ?? '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

  // "1,000,000+" -> "1M+", "50+" -> "50+"
  const shortInstalls = (txt) => {
    if (!txt) return null;
    const n = parseInt(txt.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(n)) return txt;
    const plus = txt.includes('+') ? '+' : '';
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' + plus;
    if (n >= 1e3) return (n / 1e3).toFixed(n % 1e3 ? 1 : 0) + 'K' + plus;
    return n + plus;
  };

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return ''; }
  };

  const starRow = (score) => score
    ? `<span class="star">★</span> ${score.toFixed(1)}`
    : `<span class="star">★</span> New`;

  /* ---------- app cards ---------- */
  const appCard = (app, { shots = false } = {}) => {
    const installs = shortInstalls(app.installsText);
    return `
    <button class="app-card reveal" data-app="${esc(app.appId)}" aria-haspopup="dialog">
      <div class="app-top">
        <img class="app-icon" src="${esc(app.icon)}" alt="" loading="lazy" width="58" height="58">
        <div class="app-id">
          <div class="app-name">${esc(app.title)}</div>
          <div class="app-genre">${esc(app.genre || 'Android app')}</div>
        </div>
        <span class="app-open" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17 17 7M9 7h8v8"/></svg>
        </span>
      </div>
      <p class="app-sum">${esc(decode(app.summary))}</p>
      ${shots && app.screenshots?.length ? `
      <div class="app-shots">
        ${app.screenshots.slice(0, 4).map((s) => `<img src="${esc(s)}" alt="${esc(app.title)} screenshot" loading="lazy">`).join('')}
      </div>` : ''}
      <div class="app-meta">
        <span>${starRow(app.score)}</span>
        ${installs ? `<span>⤓ ${esc(installs)} installs</span>` : ''}
        <span class="free-tag">${app.free ? 'Free' : 'Paid'}</span>
      </div>
    </button>`;
  };

  /* ---------- work apps grouped by company ---------- */
  const COMPANY_ORDER = ['SusampInfotech', 'SmartonSolution'];

  const workGroups = (apps) => {
    const groups = new Map();
    for (const app of apps) {
      const co = app.company || 'Other companies';
      if (!groups.has(co)) groups.set(co, []);
      groups.get(co).push(app);
    }
    const ordered = [
      ...COMPANY_ORDER.filter((c) => groups.has(c)),
      ...[...groups.keys()].filter((c) => !COMPANY_ORDER.includes(c)),
    ];
    return ordered.map((company) => {
      const list = groups.get(company);
      const installs = list.reduce((s, a) => s + (a.installs ?? 0), 0);
      const installsTxt = installs ? `${shortInstalls(String(installs))}+ installs` : '';
      return `
      <div class="work-group">
        <div class="work-co reveal">
          <span class="work-co-name">${esc(company)}</span>
          <span class="work-co-tag">Company</span>
          <span class="work-co-meta">${list.length} app${list.length > 1 ? 's' : ''}${installsTxt ? ' · ' + installsTxt : ''}</span>
        </div>
        <div class="apps-grid compact">${list.map((a) => appCard(a)).join('')}</div>
      </div>`;
    }).join('');
  };

  /* ---------- modal ---------- */
  const modal = $('#appModal');
  const modalBody = $('#modalBody');
  let allApps = [];
  let lastFocus = null;

  const openModal = (appId) => {
    const app = allApps.find((a) => a.appId === appId);
    if (!app) return;
    lastFocus = document.activeElement;
    modalBody.innerHTML = `
      <div class="modal-head">
        <img src="${esc(app.icon)}" alt="">
        <div>
          <h3>${esc(app.title)}</h3>
          <div class="app-genre">${esc(app.genre || '')}</div>
        </div>
      </div>
      <div class="modal-stats">
        <span class="mstat">★ <b>${app.score ? app.score.toFixed(1) : 'New'}</b>${app.ratings ? ` · ${app.ratings.toLocaleString()} ratings` : ''}</span>
        ${app.installsText ? `<span class="mstat"><b>${esc(app.installsText)}</b> installs</span>` : ''}
        ${app.released ? `<span class="mstat">Released <b>${esc(app.released)}</b></span>` : ''}
        ${app.company ? `<span class="mstat">Built at <b>${esc(app.company)}</b></span>` : ''}
      </div>
      <p class="modal-desc">${esc(decode(app.summary))}</p>
      ${app.screenshots?.length ? `
      <div class="modal-shots">
        ${app.screenshots.map((s) => `<img src="${esc(s)}" alt="${esc(app.title)} screenshot" loading="lazy">`).join('')}
      </div>` : ''}
      <a class="btn btn-solid" href="${esc(app.url)}" target="_blank" rel="noopener">
        Get it on Google Play
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M7 17 17 7M9 7h8v8"/></svg>
      </a>`;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('#modalClose').focus();
  };

  const closeModal = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  };
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.app-card');
    if (card) openModal(card.dataset.app);
  });

  /* ---------- data loading ---------- */
  const loadApps = async () => {
    const res = await fetch('data/apps.json');
    if (!res.ok) throw new Error('apps.json missing');
    const data = await res.json();

    allApps = [...(data.myApps || []), ...(data.workApps || [])];

    // hero stats
    $('[data-stat="apps"]').innerHTML = `${allApps.length}<em>+</em>`;
    const installs = shortInstalls(String(data.totalInstalls)) || '1M+';
    $('[data-stat="installs"]').innerHTML = `${installs.replace('+', '')}<em>+</em>`;

    // sync badges
    const when = fmtDate(data.fetchedAt);
    ['syncTime1', 'syncTime2'].forEach((id) => { const el = $('#' + id); if (el) el.textContent = `last sync ${when}`; });
    const f = $('#syncFooter'); if (f) f.textContent = when;

    // grids
    $('#myApps').innerHTML = (data.myApps || []).map((a) => appCard(a, { shots: true })).join('');
    $('#workApps').innerHTML = workGroups(data.workApps || []);
    observeReveals($('#myApps'));
    observeReveals($('#workApps'));
  };

  loadApps().catch((err) => {
    console.error(err);
    $('#myApps').innerHTML = '<p style="color:var(--muted);font-family:var(--font-mono);font-size:0.8rem">Could not load app data — see them all on <a href="https://play.google.com/store/apps/dev?id=7084161944711464301" style="color:var(--green)">Google Play</a>.</p>';
  });

  /* ---------- marquee (duplicate track for seamless loop) ---------- */
  const track = $('#marqueeTrack');
  track.innerHTML += track.innerHTML;

  /* ---------- contact form (FormSubmit AJAX) ---------- */
  const form = $('#contactForm');
  const formMsg = $('#formMsg');
  const formBtn = $('#formBtn');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    formBtn.disabled = true;
    formBtn.firstChild.textContent = 'Sending… ';
    formMsg.className = 'form-msg';
    try {
      const res = await fetch('https://formsubmit.co/ajax/krishvekriya44@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          message: form.message.value,
          _subject: `Portfolio inquiry from ${form.name.value}`,
          _template: 'table',
          _captcha: 'false',
        }),
      });
      if (!res.ok) throw new Error('send failed');
      formMsg.textContent = '✓ Message sent — I usually reply within a day.';
      formMsg.classList.add('ok');
      form.reset();
    } catch {
      formMsg.innerHTML = 'Could not send right now — email me directly at <a href="mailto:krishvekriya44@gmail.com" style="color:var(--green)">krishvekriya44@gmail.com</a>.';
      formMsg.classList.add('err');
    } finally {
      formBtn.disabled = false;
      formBtn.firstChild.textContent = 'Send message ';
    }
  });

  /* ---------- footer year ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
