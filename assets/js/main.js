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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3.2c0-1.16 1.26-1.87 2.26-1.28l11.3 6.8c.98.59.98 2.05 0 2.64l-11.3 6.8C7.26 18.68 6 17.97 6 16.8V3.2z"/></svg>
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

  /* ---------- hero phone: code -> build -> app story loop ---------- */
  const phases = $$('.phase');
  if (phases.length) {
    const dots = $$('.phone-dots .dot');
    const showNow = (name) => {
      phases.forEach((p) => p.classList.toggle('active', p.dataset.phase === name));
      dots.forEach((d) => d.classList.toggle('active', d.dataset.dot === name));
    };
    // fade the outgoing phase out fully before fading the next one in, so the
    // two very different screens (editor vs. app UI) never show ghosted together
    const setActive = (name, cb) => {
      const current = phases.find((p) => p.classList.contains('active'));
      if (!current) { showNow(name); cb?.(); return; }
      current.classList.remove('active');
      setTimeout(() => { showNow(name); cb?.(); }, 380);
    };

    const playCode = () => {
      const lines = $$('.phase-code .code-line');
      lines.forEach((l) => l.classList.remove('shown'));
      lines.forEach((l, i) => setTimeout(() => l.classList.add('shown'), 200 * i));
    };

    const playBuild = () => {
      const lines = $$('.phase-build .build-line');
      const fill = $('.build-bar-fill');
      lines.forEach((l) => l.classList.remove('shown'));
      fill.style.transition = 'none';
      fill.style.width = '0%';
      lines.forEach((l, i) => setTimeout(() => l.classList.add('shown'), 240 * i));
      setTimeout(() => {
        fill.style.transition = 'width 1.3s ease';
        fill.style.width = '100%';
      }, 900);
    };

    if (REDUCED) {
      showNow('app');
    } else {
      const order = ['code', 'build', 'app'];
      const durations = { code: 4400, build: 3600, app: 5600 };
      let i = 0;
      const advance = () => {
        const name = order[i];
        i = (i + 1) % order.length;
        setActive(name, () => {
          if (name === 'code') playCode();
          if (name === 'build') playBuild();
        });
        setTimeout(advance, durations[name]);
      };
      advance();
    }
  }

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

  /* ---------- GitHub canvas heatmap + live stats ---------- */
  (function initGitHub() {
    const GH_USER = 'krishvekriya12';
    const canvas   = document.getElementById('ghCanvas');
    const tooltip  = document.getElementById('ghTooltip');
    const reposEl  = document.getElementById('ghRepos');
    const followersEl = document.getElementById('ghFollowers');
    const followingEl = document.getElementById('ghFollowing');
    const yearEl   = document.getElementById('ghYear');
    const totalEl  = document.getElementById('ghTotalContribs');

    if (!canvas) return;

    /* ---- Colors matching GitHub dark theme ---- */
    const COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
    const BG     = '#0d1117';
    const TEXT   = '#8b949e';
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAYS   = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

    const CELL = 11, GAP = 3, STEP = CELL + GAP;
    const LEFT = 30; // day labels width
    const TOP  = 20; // month labels height

    /* ---- Build contribution weeks from flat array ---- */
    function buildWeeks(contributions) {
      if (!contributions || !contributions.length) return [];
      const weeks = [];
      let week = [];

      // Pad first week so Sunday is col 0
      const firstDow = new Date(contributions[0].date).getDay();
      for (let i = 0; i < firstDow; i++) week.push(null);

      for (const c of contributions) {
        const dow = new Date(c.date).getDay();
        if (dow === 0 && week.length > 0) { weeks.push(week); week = []; }
        week.push(c);
      }
      // pad last week
      while (week.length < 7) week.push(null);
      weeks.push(week);
      return weeks;
    }

    /* ---- Render canvas ---- */
    function render(weeks) {
      const dpr = window.devicePixelRatio || 1;
      const W = LEFT + weeks.length * STEP;
      const H = TOP + 7 * STEP;

      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // Font
      ctx.font = `11px -apple-system, "Segoe UI", sans-serif`;
      ctx.fillStyle = TEXT;

      // Month labels
      let lastMonth = -1;
      weeks.forEach((week, wi) => {
        const day = week.find(d => d !== null);
        if (day) {
          const m = new Date(day.date).getMonth();
          if (m !== lastMonth) {
            ctx.fillText(MONTHS[m], LEFT + wi * STEP, TOP - 6);
            lastMonth = m;
          }
        }
      });

      // Day labels (Mon, Wed, Fri)
      DAYS.forEach((lbl, i) => {
        if (lbl) ctx.fillText(lbl, 0, TOP + i * STEP + CELL);
      });

      // Cells
      weeks.forEach((week, wi) => {
        week.forEach((day, di) => {
          if (!day) return;
          const level = Math.min(4, day.level || 0);
          ctx.fillStyle = COLORS[level];
          const x = LEFT + wi * STEP;
          const y = TOP + di * STEP;
          ctx.beginPath();
          const r = 2;
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + CELL - r, y);
          ctx.quadraticCurveTo(x + CELL, y, x + CELL, y + r);
          ctx.lineTo(x + CELL, y + CELL - r);
          ctx.quadraticCurveTo(x + CELL, y + CELL, x + CELL - r, y + CELL);
          ctx.lineTo(x + r, y + CELL);
          ctx.quadraticCurveTo(x, y + CELL, x, y + CELL - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fill();
        });
      });

      // Store weeks on canvas for tooltip lookup
      canvas._weeks = weeks;
    }

    /* ---- Tooltip on hover ---- */
    canvas.addEventListener('mousemove', (e) => {
      const weeks = canvas._weeks;
      if (!weeks || !tooltip) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wi = Math.floor((mx - LEFT) / STEP);
      const di = Math.floor((my - TOP) / STEP);
      if (wi < 0 || wi >= weeks.length || di < 0 || di > 6) {
        tooltip.classList.remove('show'); return;
      }
      const day = weeks[wi] && weeks[wi][di];
      if (!day) { tooltip.classList.remove('show'); return; }
      const count = day.count || 0;
      const label = count === 0
        ? `No contributions on ${day.date}`
        : `${count} contribution${count > 1 ? 's' : ''} on ${day.date}`;
      tooltip.textContent = label;

      // Position tooltip above the cell
      const cellX = LEFT + wi * STEP;
      const cellY = TOP + di * STEP;
      tooltip.style.left = (cellX + CELL / 2 - tooltip.offsetWidth / 2) + 'px';
      tooltip.style.top  = (cellY - tooltip.offsetHeight - 8) + 'px';
      tooltip.classList.add('show');
    });
    canvas.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.classList.remove('show');
    });

    /* ---- Fetch contributions via github-contributions-api ---- */
    const API_URL = `https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`;
    const CONTRIBS_KEY = `gh_contribs_${GH_USER}`;
    const CONTRIBS_TS  = `gh_contribs_ts_${GH_USER}`;
    const TTL = 6 * 60 * 60 * 1000; // 6 h

    function tryCache(key, ts) {
      const raw = localStorage.getItem(key);
      const t   = parseInt(localStorage.getItem(ts) || '0', 10);
      if (raw && Date.now() - t < TTL) {
        try { return JSON.parse(raw); } catch(_) {}
      }
      return null;
    }

    function drawFallback() {
      // Draw placeholder grid of 53 weeks × 7 days at level 0
      const today = new Date();
      const fake = [];
      for (let i = 364; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        fake.push({ date: d.toISOString().slice(0, 10), count: 0, level: 0 });
      }
      render(buildWeeks(fake));
    }

    // Try cache first
    const cached = tryCache(CONTRIBS_KEY, CONTRIBS_TS);
    if (cached) {
      const weeks = buildWeeks(cached.contributions || cached);
      render(weeks);
      if (totalEl) totalEl.textContent = (cached.contributions || cached)
        .reduce((s, d) => s + (d.count || 0), 0).toLocaleString();
    } else {
      drawFallback();
    }

    fetch(API_URL)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const contribs = data.contributions || data;
        localStorage.setItem(CONTRIBS_KEY, JSON.stringify(data));
        localStorage.setItem(CONTRIBS_TS,  String(Date.now()));
        render(buildWeeks(contribs));
        if (totalEl) totalEl.textContent = contribs
          .reduce((s, d) => s + (d.count || 0), 0).toLocaleString();
      })
      .catch(() => { if (!cached) drawFallback(); });

    /* ---- GitHub profile stats ---- */
    const STATS_KEY = `gh_stats_${GH_USER}`;
    const STATS_TS  = `gh_stats_ts_${GH_USER}`;

    function applyStats(d) {
      if (reposEl)    reposEl.textContent    = d.public_repos ?? '—';
      if (followersEl) followersEl.textContent = d.followers ?? '—';
      if (followingEl) followingEl.textContent = d.following ?? '—';
      if (yearEl && d.created_at)
        yearEl.textContent = new Date(d.created_at).getFullYear();
    }

    const cachedStats = tryCache(STATS_KEY, STATS_TS);
    if (cachedStats) applyStats(cachedStats);

    fetch(`https://api.github.com/users/${GH_USER}`, {
      headers: { Accept: 'application/vnd.github.v3+json' }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        applyStats(d);
        localStorage.setItem(STATS_KEY, JSON.stringify(d));
        localStorage.setItem(STATS_TS, String(Date.now()));
      })
      .catch(() => {});

  })();

})();
