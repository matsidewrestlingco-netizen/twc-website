/* ============================================================
   cms.js — Main site Firebase content loader
   Reads schedule, news, and flyers from Firestore and
   updates the DOM. Fails gracefully if not configured.
   ============================================================ */

import { firebaseConfig, FIREBASE_ENABLED } from './firebase-config.js';

if (!FIREBASE_ENABLED) {
  console.info('[TWC CMS] Firebase not configured — showing default content.');
} else {
  loadFirebaseContent();
}

async function loadFirebaseContent() {
  try {
    const { initializeApp }    = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, doc, collection, getDocs, getDoc, query, where, orderBy } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const app = initializeApp(firebaseConfig);
    const db  = getFirestore(app);

    await Promise.all([
      loadSchedule(db, { doc, getDoc }),
      loadNews(db, { collection, query, getDocs, where, orderBy }),
      loadFlyers(db, { collection, query, getDocs, where, orderBy }),
    ]);
  } catch (err) {
    console.warn('[TWC CMS] Could not load Firebase content:', err.message);
  }
}

/* ---- Schedule ---- */
async function loadSchedule(db, { doc, getDoc }) {
  const snap = await getDoc(doc(db, 'schedule', 'main'));
  if (!snap.exists()) return;

  const { slots } = snap.data();
  if (!slots || !slots.length) return;

  const grid = document.getElementById('scheduleGrid');
  if (!grid) return;

  const sorted = [...slots].sort((a, b) => a.order - b.order);

  grid.innerHTML = sorted.map((slot, i) => {
    const featured = slot.featured;
    return `
      <div class="schedule-card${featured ? ' schedule-card--featured' : ''}">
        ${featured ? '<div class="schedule-featured-tag">Featured</div>' : ''}
        <div class="schedule-day">${escHtml(slot.day)}</div>
        <div class="schedule-time">${escHtml(slot.startTime)} – ${escHtml(slot.endTime)}</div>
        <div class="schedule-loc">${escHtml(slot.location)}</div>
        <div class="schedule-badge">Weekly</div>
      </div>`;
  }).join('');
}

/* ---- News ---- */
async function loadNews(db, { collection, query, getDocs, where, orderBy }) {
  const q    = query(collection(db, 'news'), where('published', '==', true), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const newsSection = document.getElementById('news');
  const newsGrid    = document.getElementById('newsGrid');
  const navNews     = document.getElementById('navNewsLink');
  if (!newsSection || !newsGrid) return;

  newsGrid.innerHTML = snap.docs.map(d => {
    const p = d.data();
    const date = p.date?.toDate ? p.date.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
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

  newsSection.style.display = '';
  if (navNews) navNews.style.display = '';
}

/* ---- Flyers ---- */
async function loadFlyers(db, { collection, query, getDocs, where, orderBy }) {
  const q    = query(collection(db, 'flyers'), where('published', '==', true), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const flyersWrap = document.getElementById('flyersWrap');
  const flyersGrid = document.getElementById('flyersGrid');
  if (!flyersWrap || !flyersGrid) return;

  flyersGrid.innerHTML = snap.docs.map(d => {
    const p = d.data();
    return `
      <a class="flyer-card" href="${escHtml(p.imageUrl)}" target="_blank" rel="noopener">
        <img src="${escHtml(p.imageUrl)}" alt="${escHtml(p.title)}" loading="lazy" />
        <div class="flyer-label">${escHtml(p.title)}</div>
      </a>`;
  }).join('');

  flyersWrap.style.display = '';

  // Also make sure the news section is visible
  const newsSection = document.getElementById('news');
  if (newsSection) newsSection.style.display = '';
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
