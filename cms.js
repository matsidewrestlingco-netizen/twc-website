/* ============================================================
   cms.js — Main site Firebase content loader
   Reads schedule, news, flyers, and competitions from
   Firestore and updates the DOM. Fails gracefully if
   Firebase is not configured.
   ============================================================ */

import { firebaseConfig, FIREBASE_ENABLED } from './firebase-config.js';

if (!FIREBASE_ENABLED) {
  console.info('[TWC CMS] Firebase not configured — showing default content.');
} else {
  loadFirebaseContent();
}

async function loadFirebaseContent() {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, doc, collection, getDocs, getDoc, query, orderBy } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const app = initializeApp(firebaseConfig);
    const db  = getFirestore(app);

    await Promise.all([
      loadSchedule(db, { doc, getDoc }),
      loadNews(db, { collection, query, getDocs, orderBy }),
      loadFlyers(db, { collection, query, getDocs, orderBy }),
      loadCompetitions(db, { collection, query, getDocs, orderBy }),
      loadSponsors(db, { collection, query, getDocs, orderBy }),
    ]);
  } catch (err) {
    console.warn('[TWC CMS] Could not load Firebase content:', err.message);
  }
}

/* ---- Practice Schedule ---- */
async function loadSchedule(db, { doc, getDoc }) {
  const snap = await getDoc(doc(db, 'schedule', 'main'));
  if (!snap.exists()) return;

  const { slots } = snap.data();
  if (!slots || !slots.length) return;

  const grid = document.getElementById('scheduleGrid');
  if (!grid) return;

  const sorted = [...slots].sort((a, b) => a.order - b.order);

  grid.innerHTML = sorted.map(slot => {
    const featured = slot.featured;
    return `
      <div class="schedule-card${featured ? ' schedule-card--featured' : ''}">
        ${featured ? '<div class="schedule-featured-tag">Featured</div>' : ''}
        <div class="schedule-day">${escHtml(slot.day)}</div>
        ${slot.title ? `<div class="schedule-title">${escHtml(slot.title)}</div>` : ''}
        <div class="schedule-time">${escHtml(fmtTime(slot.startTime))} – ${escHtml(fmtTime(slot.endTime))}</div>
        <div class="schedule-loc">${escHtml(slot.location)}</div>
        <div class="schedule-badge">Weekly</div>
      </div>`;
  }).join('');
}

/* ---- News ---- */
async function loadNews(db, { collection, query, getDocs, orderBy }) {
  const q    = query(collection(db, 'news'), orderBy('date', 'desc'));
  const snap = await getDocs(q);

  const newsGrid  = document.getElementById('newsGrid');
  const newsEmpty = document.getElementById('newsEmpty');
  if (!newsGrid) return;

  const published = snap.docs.filter(d => d.data().published !== false);
  if (!published.length) return; // leave the empty state visible

  if (newsEmpty) newsEmpty.style.display = 'none';

  newsGrid.innerHTML = published.map(d => {
    const p    = d.data();
    const date = p.date?.toDate
      ? p.date.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    return `
      <article class="news-card">
        ${p.imageUrl ? `<div class="news-img"><img src="${escHtml(p.imageUrl)}" alt="${escHtml(p.title)}" loading="lazy" /></div>` : ''}
        <div class="news-body">
          ${date ? `<time class="news-date">${date}</time>` : ''}
          <h3 class="news-title">${escHtml(p.title)}</h3>
          <p class="news-content">${escHtml(p.content)}</p>
        </div>
      </article>`;
  }).join('');
}

/* ---- Flyers ---- */
async function loadFlyers(db, { collection, query, getDocs, orderBy }) {
  const q    = query(collection(db, 'flyers'), orderBy('date', 'desc'));
  const snap = await getDocs(q);

  const flyersWrap = document.getElementById('flyersWrap');
  const flyersGrid = document.getElementById('flyersGrid');
  if (!flyersWrap || !flyersGrid) return;

  const published = snap.docs.filter(d => d.data().published !== false);
  if (!published.length) return;

  flyersGrid.innerHTML = published.map(d => {
    const p = d.data();
    return `
      <a class="flyer-card" href="${escHtml(p.imageUrl)}" target="_blank" rel="noopener">
        <img src="${escHtml(p.imageUrl)}" alt="${escHtml(p.title)}" loading="lazy" />
        <div class="flyer-label">${escHtml(p.title)}</div>
      </a>`;
  }).join('');

  flyersWrap.style.display = '';
}

/* ---- Competitions ---- */
async function loadCompetitions(db, { collection, query, getDocs, orderBy }) {
  const q    = query(collection(db, 'competitions'), orderBy('date', 'asc'));
  const snap = await getDocs(q);

  const compList  = document.getElementById('compList');
  const compEmpty = document.getElementById('compEmpty');
  if (!compList) return;

  const allDocs = snap.docs.filter(d => d.data().published !== false);
  if (!allDocs.length) return; // leave the empty state visible

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [];
  const past     = [];

  allDocs.forEach(d => {
    const data     = d.data();
    const eventDate = new Date(data.date + 'T00:00:00');
    const checkDate = data.endDate ? new Date(data.endDate + 'T00:00:00') : eventDate;
    if (checkDate < today) past.push(data);
    else                   upcoming.push(data);
  });

  if (compEmpty) compEmpty.style.display = 'none';

  const renderCard = (comp, isPast) => {
    const dateStr = formatCompDate(comp.date, comp.endDate);
    return `
      <div class="comp-card${isPast ? ' comp-card--past' : ''}${comp.travel ? ' comp-card--travel' : ''}">
        ${comp.travel && !isPast ? '<div class="comp-travel-tag">&#9992; Travel Event</div>' : ''}
        <div class="comp-date-block">
          <span class="comp-month">${fmtMonth(comp.date)}</span>
          <span class="comp-day">${fmtDay(comp.date)}</span>
        </div>
        <div class="comp-body">
          <div class="comp-top">
            <h3 class="comp-name">${escHtml(comp.name)}</h3>
            ${isPast ? '<span class="comp-badge comp-badge--past">Past</span>' : '<span class="comp-badge comp-badge--upcoming">Upcoming</span>'}
          </div>
          <div class="comp-meta">
            ${comp.location ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>${escHtml(comp.location)}</span>` : ''}
            ${dateStr ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${dateStr}</span>` : ''}
            ${comp.divisions ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>${escHtml(comp.divisions)}</span>` : ''}
          </div>
          ${comp.notes ? `<p class="comp-notes">${escHtml(comp.notes)}</p>` : ''}
          ${comp.link ? `<a class="comp-link" href="${escHtml(comp.link)}" target="_blank" rel="noopener">Register / More Info &rarr;</a>` : ''}
        </div>
      </div>`;
  };

  compList.innerHTML =
    upcoming.map(c => renderCard(c, false)).join('') +
    (past.length ? `<div class="comp-past-divider"><span>Past Events</span></div>` + past.reverse().map(c => renderCard(c, true)).join('') : '');
}

/* ---- Sponsors ---- */
async function loadSponsors(db, { collection, query, getDocs, orderBy }) {
  const q    = query(collection(db, 'sponsors'), orderBy('order', 'asc'));
  const snap = await getDocs(q);

  const grid = document.getElementById('sponsorsGrid');
  if (!grid || snap.empty) return;

  grid.innerHTML = snap.docs.map(d => {
    const s = d.data();
    const inner = s.logoUrl
      ? `<img src="${escHtml(s.logoUrl)}" alt="${escHtml(s.name)}" style="max-width:100%;max-height:90px;object-fit:contain;" />`
      : `<div class="sponsor-logo-placeholder">${escHtml(s.name)}</div>`;
    return s.website
      ? `<a class="sponsor-card" href="${escHtml(s.website)}" target="_blank" rel="noopener" title="${escHtml(s.name)}">${inner}</a>`
      : `<div class="sponsor-card">${inner}</div>`;
  }).join('') +
  `<div class="sponsor-card sponsor-card--open"><div class="sponsor-open-text">Your Business<br>Here</div></div>`;
}

/* ---- Helpers ---- */
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,'0')} ${suffix}`;
}

function fmtMonth(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function fmtDay(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').getDate();
}

function formatCompDate(start, end) {
  if (!start) return '';
  const opts = { month: 'long', day: 'numeric', year: 'numeric' };
  const s = new Date(start + 'T00:00:00').toLocaleDateString('en-US', opts);
  if (!end || end === start) return s;
  const e = new Date(end + 'T00:00:00').toLocaleDateString('en-US', opts);
  return `${s} – ${e}`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
