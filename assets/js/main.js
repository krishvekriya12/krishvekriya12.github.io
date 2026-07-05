/* Krish Vekariya — portfolio
   Renders live Play Store data from /data/apps.json
   (refreshed daily by .github/workflows/update-data.yml) */

(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- preloader ---------- */
  const pre = $('#preloader');
  if (pre) {
    if (REDUCED) {
      pre.remove();
    } else {
      document.body.classList.add('locked');
      const num = $('#preNum');
      const bar = $('#preBar');
      let p = 0;
      const tick = setInterval(() => {
        p = Math.min(100, p + 6 + Math.random() * 16);
        num.textContent = Math.floor(p);
        bar.style.width = p + '%';
        if (p >= 100) {
          clearInterval(tick);
          setTimeout(() => {
            pre.classList.add('done');
            document.body.classList.remove('locked');
            setTimeout(() => pre.remove(), 850);
          }, 200);
        }
      }, 70);
    }
  }

  /* ---------- nav (mobile dropdown) ---------- */
  const burger = $('#navBurger');
  const menu = $('#navMenu');
  burger.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      menu.hidden = true;
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
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

  const STAR_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.1 6.7 7.4.8-5.5 5 1.6 7.3L12 18.2 5.4 21.8 7 14.5l-5.5-5 7.4-.8z"/></svg>';
  const DOWNLOAD_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13m0 0-4.5-4.5M12 16l4.5-4.5"/><path d="M4 20h16"/></svg>';

  const starRow = (score) => score
    ? `<span class="star">${STAR_ICON}</span> ${score.toFixed(1)}`
    : `<span class="star">${STAR_ICON}</span> New`;

  /* ---------- app cards ---------- */
  const appCard = (app, { shots = false } = {}) => {
    const installs = shortInstalls(app.installsText);
    return `
    <button class="app-card reveal" data-app="${esc(app.appId)}" aria-haspopup="dialog">
      <div class="app-top">
        <img class="app-icon" src="${esc(app.icon)}" alt="" loading="lazy" width="58" height="58">
        <div class="app-id">
          <div class="app-name">${esc(decode(app.title))}</div>
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
        ${installs ? `<span>${DOWNLOAD_ICON} ${esc(installs)} installs</span>` : ''}
        <span class="free-tag">${app.free ? 'Free' : 'Paid'}</span>
      </div>
    </button>`;
  };

  /* ---------- work apps grouped by company ---------- */
  const COMPANY_ORDER = ['Susamp Infotech', 'SmartOnSolution'];

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
        <div class="apps-grid">${list.map((a) => appCard(a, { shots: true })).join('')}</div>
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
      <div class="modal-hero">
        <div class="modal-head">
          <img src="${esc(app.icon)}" alt="">
          <div class="m-id">
            <h3>${esc(decode(app.title))}</h3>
            <div class="app-genre">${esc(app.genre || '')}</div>
          </div>
          <a class="m-play" href="${esc(app.url)}" target="_blank" rel="noopener">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3.6 1.8 13.7 12 3.6 22.2c-.4-.2-.6-.7-.6-1.2V3c0-.5.2-1 .6-1.2zm11.5 8.7L5.9 1.3l11.6 6.7-2.4 2.5zm2.4 1.5 3 1.7c.9.5.9 1.7 0 2.2l-3 1.7-2.7-2.8 2.7-2.8zm-2.4 4.5 2.4 2.5L5.9 22.7l9.2-9.2 2.4 2.5-2.4-2.5z"/></svg>
            Get it on Google Play
          </a>
        </div>
      </div>
      <div class="modal-stats">
        <span class="mstat">${STAR_ICON} <b>${app.score ? app.score.toFixed(1) : 'New'}</b>${app.ratings ? ` · ${app.ratings.toLocaleString()} ratings` : ''}</span>
        ${app.installsText ? `<span class="mstat"><b>${esc(app.installsText)}</b> installs</span>` : ''}
        ${app.released ? `<span class="mstat">Released <b>${esc(app.released)}</b></span>` : ''}
        ${app.company ? `<span class="mstat">Built at <b>${esc(app.company)}</b></span>` : ''}
      </div>
      <p class="modal-desc">${esc(decode(app.summary))}</p>
      ${app.screenshots?.length ? `
      <div class="modal-shots-wrap">
        <div class="modal-shots">
          ${app.screenshots.map((s) => `<img src="${esc(s)}" alt="${esc(app.title)} screenshot" loading="lazy">`).join('')}
        </div>
        ${app.screenshots.length > 1 ? `
        <button class="shots-nav prev" type="button" aria-label="Previous screenshot"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
        <button class="shots-nav next" type="button" aria-label="Next screenshot"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>` : ''}
      </div>` : ''}`;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('#modalClose').focus();

    const shotsTrack = $('.modal-shots', modalBody);
    if (shotsTrack) {
      const prevBtn = $('.shots-nav.prev', modalBody);
      const nextBtn = $('.shots-nav.next', modalBody);
      const step = () => (shotsTrack.querySelector('img')?.offsetWidth || 260) + 10;
      const updateNav = () => {
        const max = shotsTrack.scrollWidth - shotsTrack.clientWidth - 2;
        prevBtn.classList.toggle('hide', shotsTrack.scrollLeft <= 2);
        nextBtn.classList.toggle('hide', shotsTrack.scrollLeft >= max);
      };
      prevBtn?.addEventListener('click', () => shotsTrack.scrollBy({ left: -step(), behavior: 'smooth' }));
      nextBtn?.addEventListener('click', () => shotsTrack.scrollBy({ left: step(), behavior: 'smooth' }));
      shotsTrack.addEventListener('scroll', updateNav, { passive: true });
      $$('img', shotsTrack).forEach((img) => img.addEventListener('load', updateNav));
      updateNav();
    }

    $$('.modal-shots img', modalBody).forEach((img, i) => {
      img.style.transitionDelay = `${i * 0.05}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('shot-in')));
    });
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

  /* ---------- animated stat count-up ---------- */
  const animateNum = (el, finalText) => {
    const m = String(finalText).match(/^([\d.]+)(.*)$/);
    if (!m || REDUCED) { el.textContent = finalText; return; }
    const target = parseFloat(m[1]);
    const suffix = m[2];
    const decimals = (m[1].split('.')[1] || '').length;
    const dur = 1100;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  let statsFinal = null;
  let statRowSeen = false;
  let statsDone = false;
  const yearsEl = $('[data-stat="years"]');
  const yearsTarget = yearsEl.textContent;
  const maybeRunStats = () => {
    if (statsDone || !statsFinal || !statRowSeen) return;
    statsDone = true;
    animateNum($('[data-stat="apps"]'), statsFinal.apps);
    animateNum($('[data-stat="installs"]'), statsFinal.installs);
    animateNum(yearsEl, yearsTarget);
  };
  const statRow = $('.stat-row');
  if (statRow) {
    const statIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { statRowSeen = true; maybeRunStats(); statIO.disconnect(); }
      });
    }, { threshold: 0.3 });
    statIO.observe(statRow);
  }

  /* ---------- data loading ---------- */
  const loadApps = async () => {
    const res = await fetch('data/apps.json');
    if (!res.ok) throw new Error('apps.json missing');
    const data = await res.json();

    allApps = [...(data.myApps || []), ...(data.workApps || [])];

    // stats
    const installs = shortInstalls(String(data.totalInstalls)) || '1M+';
    statsFinal = { apps: `${allApps.length}+`, installs: `${installs.replace('+', '')}+` };
    maybeRunStats();

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
    $('#myApps').innerHTML = '<p style="color:var(--muted);font-family:var(--font-jakarta);font-size:0.85rem">Could not load app data — see them all on <a href="https://play.google.com/store/apps/dev?id=7084161944711464301">Google Play</a>.</p>';
  });

  /* ---------- nav inverts over the dark tail ---------- */
  const darkTail = $('.dark-tail');
  const navWrap = $('#nav');
  if (darkTail && navWrap) {
    const navInvert = () => {
      const r = darkTail.getBoundingClientRect();
      navWrap.classList.toggle('nav-dark', r.top < 92 && r.bottom > 36);
    };
    window.addEventListener('scroll', navInvert, { passive: true });
    window.addEventListener('resize', navInvert, { passive: true });
    navInvert();
  }

  /* ---------- contact form (FormSubmit AJAX) ---------- */
  const form = $('#contactForm');
  const formMsg = $('#formMsg');
  const formBtn = $('#formBtn');
  if (form) {
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
        formMsg.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Message sent — I usually reply within a day.';
        formMsg.classList.add('ok');
        form.reset();
      } catch {
        formMsg.innerHTML = 'Could not send right now — email me directly at <a href="mailto:krishvekriya44@gmail.com">krishvekriya44@gmail.com</a>.';
        formMsg.classList.add('err');
      } finally {
        formBtn.disabled = false;
        formBtn.firstChild.textContent = 'Send message ';
      }
    });
  }

  /* ---------- footer year ---------- */
  $('#year').textContent = new Date().getFullYear();

  /* ---------- hero phone: live clock ---------- */
  const feedClock = $('#feedClock');
  if (feedClock) {
    const tickClock = () => {
      feedClock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };
    tickClock();
    setInterval(tickClock, 30000);
  }

  /* ---------- hero phone: like counts drift up slowly ---------- */
  if (!REDUCED) {
    const likeEls = $$('.like-count');
    if (likeEls.length) {
      setInterval(() => {
        const el = likeEls[Math.floor(Math.random() * likeEls.length)];
        const base = parseInt(el.dataset.base, 10);
        const cur = parseInt(el.textContent, 10);
        if (cur < base + 9) {
          el.textContent = cur + 1;
          el.classList.add('bump');
          setTimeout(() => el.classList.remove('bump'), 350);
        }
      }, 5000);
    }
  }

  /* ---------- hero phone: magnetic tilt ---------- */
  const phone = $('.phone');
  const heroDevice = $('.hero-device');
  if (phone && heroDevice && !REDUCED && window.matchMedia('(pointer: fine)').matches) {
    heroDevice.addEventListener('mousemove', (e) => {
      const r = heroDevice.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      phone.style.transform = `rotateY(${(px * 14).toFixed(2)}deg) rotateX(${(-py * 14).toFixed(2)}deg)`;
    });
    heroDevice.addEventListener('mouseleave', () => { phone.style.transform = ''; });
  }

  /* ---------- hero blobs: scroll parallax ---------- */
  const blobs = $$('.blob');
  if (blobs.length && !REDUCED) {
    let ticking = false;
    const parallax = () => {
      const y = window.scrollY;
      blobs.forEach((b, i) => { b.style.transform = `translateY(${(y * (0.06 + i * 0.03)).toFixed(1)}px)`; });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(parallax); ticking = true; }
    }, { passive: true });
  }
})();
