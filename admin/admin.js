/* ============================================================
   TWC Admin Panel — admin.js
   Manages schedule, news, and flyers via Firebase Firestore.
   Images are referenced by URL (no Firebase Storage required).
   ============================================================ */

import { firebaseConfig, FIREBASE_ENABLED } from '../firebase-config.js';

// --- Check Firebase is configured ---
if (!FIREBASE_ENABLED) {
  document.getElementById('loginScreen').style.display  = 'none';
  document.getElementById('configNotice').style.display = 'flex';
  throw new Error('Firebase not configured.');
}

// --- Firebase imports ---
const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } =
  await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
const { getFirestore, doc, collection, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } =
  await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ============================================================
   AUTH
   ============================================================ */
const loginScreen = document.getElementById('loginScreen');
const dashboard   = document.getElementById('dashboard');
const loginForm   = document.getElementById('loginForm');
const loginError  = document.getElementById('loginError');
const loginBtn    = document.getElementById('loginBtn');
const signOutBtn  = document.getElementById('signOutBtn');

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = 'none';
    dashboard.style.display   = 'flex';
    initDashboard();
  } else {
    loginScreen.style.display = 'flex';
    dashboard.style.display   = 'none';
  }
});

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.style.display = 'none';
  loginBtn.textContent = 'Signing in…';
  loginBtn.disabled = true;
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById('loginEmail').value.trim(),
      document.getElementById('loginPassword').value
    );
  } catch (err) {
    loginError.textContent   = friendlyAuthError(err.code);
    loginError.style.display = 'block';
    loginBtn.textContent = 'Sign In';
    loginBtn.disabled = false;
  }
});

signOutBtn.addEventListener('click', () => signOut(auth));

function friendlyAuthError(code) {
  if (['auth/wrong-password','auth/user-not-found','auth/invalid-credential'].includes(code))
    return 'Incorrect email or password. Please try again.';
  if (code === 'auth/too-many-requests')
    return 'Too many failed attempts. Please wait a few minutes.';
  return 'Sign in failed. Check your credentials and try again.';
}

/* ============================================================
   TABS
   ============================================================ */
let dashboardInitialized = false;

function initDashboard() {
  if (dashboardInitialized) return;
  dashboardInitialized = true;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  loadSchedule();
  loadNews();
  loadCompetitions();
  loadFlyers();
}

/* ============================================================
   TOAST
   ============================================================ */
const adminToast = document.getElementById('adminToast');
let toastTimer;

function toast(msg, type = 'success') {
  clearTimeout(toastTimer);
  adminToast.textContent = msg;
  adminToast.className   = `admin-toast${type === 'error' ? ' error' : ''} show`;
  toastTimer = setTimeout(() => adminToast.classList.remove('show'), 3200);
}

/* ============================================================
   HELPERS
   ============================================================ */
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,'0')} ${suffix}`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ============================================================
   SCHEDULE
   ============================================================ */
const scheduleList = document.getElementById('scheduleList');
const slotModal    = document.getElementById('slotModal');
const slotForm     = document.getElementById('slotForm');
let scheduleSlots  = [];

async function loadSchedule() {
  const snap = await getDoc(doc(db, 'schedule', 'main'));
  scheduleSlots = snap.exists() ? (snap.data().slots || []) : [];
  renderSchedule();
}

function renderSchedule() {
  if (!scheduleSlots.length) {
    scheduleList.innerHTML = `<div class="empty-state"><p>No practice slots yet.</p></div>`;
    return;
  }
  const sorted = [...scheduleSlots].sort((a, b) => a.order - b.order);
  scheduleList.innerHTML = sorted.map(slot => `
    <div class="slot-row" data-id="${escHtml(slot.id)}">
      <div class="slot-day">${escHtml(slot.day)}</div>
      <div class="slot-time" style="flex:1.5;">
        ${slot.title ? `<span style="display:block;color:var(--white);font-weight:600;">${escHtml(slot.title)}</span>` : ''}
        ${escHtml(fmtTime(slot.startTime))} – ${escHtml(fmtTime(slot.endTime))}
      </div>
      <div class="slot-loc">${escHtml(slot.location)}</div>
      ${slot.featured ? '<div class="slot-badge">Featured</div>' : ''}
      <div class="slot-actions">
        <button class="btn-icon edit-slot" data-id="${escHtml(slot.id)}" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="btn-icon danger delete-slot" data-id="${escHtml(slot.id)}" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
        </button>
      </div>
    </div>`).join('');

  scheduleList.querySelectorAll('.edit-slot').forEach(btn =>
    btn.addEventListener('click', () => openSlotModal(btn.dataset.id)));
  scheduleList.querySelectorAll('.delete-slot').forEach(btn =>
    btn.addEventListener('click', () => deleteSlot(btn.dataset.id)));
}

document.getElementById('addSlotBtn').addEventListener('click', () => openSlotModal(null));
document.getElementById('slotModalClose').addEventListener('click', closeSlotModal);
document.getElementById('slotCancelBtn').addEventListener('click', closeSlotModal);

function openSlotModal(id) {
  const slot = id ? scheduleSlots.find(s => s.id === id) : null;
  document.getElementById('slotModalTitle').textContent = slot ? 'Edit Practice' : 'Add Practice';
  document.getElementById('slotId').value        = slot?.id || '';
  document.getElementById('slotTitle').value      = slot?.title || '';
  document.getElementById('slotDay').value        = slot?.day || 'Tuesday';
  document.getElementById('slotStart').value      = slot?.startTime || '20:00';
  document.getElementById('slotEnd').value        = slot?.endTime || '21:00';
  document.getElementById('slotLocation').value   = slot?.location || 'NA Senior High School';
  document.getElementById('slotOrder').value      = slot?.order ?? (scheduleSlots.length + 1);
  document.getElementById('slotFeatured').checked = slot?.featured ?? false;
  slotModal.style.display = 'flex';
}
function closeSlotModal() { slotModal.style.display = 'none'; }

slotForm.addEventListener('submit', async e => {
  e.preventDefault();
  const id      = document.getElementById('slotId').value || crypto.randomUUID();
  const updated = {
    id,
    title:     document.getElementById('slotTitle').value.trim(),
    day:       document.getElementById('slotDay').value,
    startTime: document.getElementById('slotStart').value,
    endTime:   document.getElementById('slotEnd').value,
    location:  document.getElementById('slotLocation').value,
    order:     parseInt(document.getElementById('slotOrder').value) || 1,
    featured:  document.getElementById('slotFeatured').checked,
  };

  const idx = scheduleSlots.findIndex(s => s.id === id);
  if (idx > -1) scheduleSlots[idx] = updated;
  else          scheduleSlots.push(updated);

  await setDoc(doc(db, 'schedule', 'main'), { slots: scheduleSlots });
  closeSlotModal();
  renderSchedule();
  toast('Practice schedule saved!');
});

async function deleteSlot(id) {
  if (!confirm('Delete this practice slot?')) return;
  scheduleSlots = scheduleSlots.filter(s => s.id !== id);
  await setDoc(doc(db, 'schedule', 'main'), { slots: scheduleSlots });
  renderSchedule();
  toast('Practice slot deleted.');
}

/* ============================================================
   NEWS
   ============================================================ */
const newsList  = document.getElementById('newsList');
const newsModal = document.getElementById('newsModal');
const newsForm  = document.getElementById('newsForm');

// Live image preview from URL
const newsImageUrlInput  = document.getElementById('newsImageUrl');
const newsImagePreview   = document.getElementById('newsImagePreview');

newsImageUrlInput.addEventListener('input', () => {
  const url = newsImageUrlInput.value.trim();
  if (url) {
    newsImagePreview.src          = url;
    newsImagePreview.style.display = 'block';
  } else {
    newsImagePreview.style.display = 'none';
  }
});

async function loadNews() {
  const q    = query(collection(db, 'news'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  renderNewsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

function renderNewsList(posts) {
  if (!posts.length) {
    newsList.innerHTML = `<div class="empty-state"><p>No posts yet. Click "+ New Post" to get started.</p></div>`;
    return;
  }
  newsList.innerHTML = posts.map(p => {
    const date = p.date?.toDate
      ? p.date.toDate().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })
      : '';
    return `
      <div class="news-row" data-id="${escHtml(p.id)}">
        <div class="news-row-img">${p.imageUrl ? `<img src="${escHtml(p.imageUrl)}" alt="" />` : ''}</div>
        <div class="news-row-body">
          <div class="news-row-title">${escHtml(p.title)}</div>
          <div class="news-row-date">${date}</div>
        </div>
        <span class="news-row-status ${p.published ? 'status-published' : 'status-draft'}">${p.published ? 'Published' : 'Draft'}</span>
        <div class="news-row-actions">
          <button class="btn-icon edit-news" data-id="${escHtml(p.id)}" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon danger delete-news" data-id="${escHtml(p.id)}" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  newsList.querySelectorAll('.edit-news').forEach(btn =>
    btn.addEventListener('click', () => openNewsModal(btn.dataset.id)));
  newsList.querySelectorAll('.delete-news').forEach(btn =>
    btn.addEventListener('click', () => deleteNews(btn.dataset.id)));
}

document.getElementById('addNewsBtn').addEventListener('click', () => openNewsModal(null));
document.getElementById('newsModalClose').addEventListener('click', closeNewsModal);
document.getElementById('newsCancelBtn').addEventListener('click', closeNewsModal);

async function openNewsModal(id) {
  newsImagePreview.style.display = 'none';
  newsImagePreview.src = '';

  document.getElementById('newsModalTitle').textContent = id ? 'Edit Post' : 'New Post';
  document.getElementById('newsDocId').value = id || '';

  if (id) {
    const snap = await getDoc(doc(db, 'news', id));
    if (snap.exists()) {
      const p = snap.data();
      document.getElementById('newsTitle').value       = p.title     || '';
      document.getElementById('newsContent').value     = p.content   || '';
      document.getElementById('newsImageUrl').value    = p.imageUrl  || '';
      document.getElementById('newsPublished').checked = p.published ?? true;
      if (p.imageUrl) {
        newsImagePreview.src          = p.imageUrl;
        newsImagePreview.style.display = 'block';
      }
    }
  } else {
    newsForm.reset();
    document.getElementById('newsPublished').checked = true;
  }
  newsModal.style.display = 'flex';
}
function closeNewsModal() { newsModal.style.display = 'none'; }

newsForm.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = document.getElementById('newsSaveBtn');
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;

  try {
    const id        = document.getElementById('newsDocId').value;
    const title     = document.getElementById('newsTitle').value.trim();
    const content   = document.getElementById('newsContent').value.trim();
    const imageUrl  = document.getElementById('newsImageUrl').value.trim() || null;
    const published = document.getElementById('newsPublished').checked;

    const data = { title, content, imageUrl, published, date: serverTimestamp() };

    if (id) await updateDoc(doc(db, 'news', id), data);
    else    await addDoc(collection(db, 'news'), data);

    closeNewsModal();
    await loadNews();
    toast('Post saved!');
  } catch (err) {
    toast('Error saving post: ' + err.message, 'error');
  } finally {
    saveBtn.textContent = 'Save Post';
    saveBtn.disabled = false;
  }
});

async function deleteNews(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  await deleteDoc(doc(db, 'news', id));
  await loadNews();
  toast('Post deleted.');
}

/* ============================================================
   FLYERS
   ============================================================ */
const flyerAdminGrid = document.getElementById('flyerAdminGrid');
const flyerModal     = document.getElementById('flyerModal');
const flyerForm      = document.getElementById('flyerForm');

// Live image preview from URL
const flyerImageUrlInput = document.getElementById('flyerImageUrl');
const flyerImagePreview  = document.getElementById('flyerImagePreview');

flyerImageUrlInput.addEventListener('input', () => {
  const url = flyerImageUrlInput.value.trim();
  if (url) {
    flyerImagePreview.src          = url;
    flyerImagePreview.style.display = 'block';
  } else {
    flyerImagePreview.style.display = 'none';
  }
});

async function loadFlyers() {
  const q    = query(collection(db, 'flyers'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  renderFlyerGrid(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

function renderFlyerGrid(flyers) {
  if (!flyers.length) {
    flyerAdminGrid.innerHTML = `<div class="empty-state"><p>No flyers yet. Click "+ Add Flyer" to get started.</p></div>`;
    return;
  }
  flyerAdminGrid.innerHTML = flyers.map(f => `
    <div class="flyer-admin-card" data-id="${escHtml(f.id)}">
      <img src="${escHtml(f.imageUrl)}" alt="${escHtml(f.title)}" loading="lazy" />
      <div class="flyer-admin-footer">
        <span class="flyer-admin-title">${escHtml(f.title)}</span>
        <div class="flyer-admin-actions">
          <button class="btn-icon danger delete-flyer" data-id="${escHtml(f.id)}" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
          </button>
        </div>
      </div>
    </div>`).join('');

  flyerAdminGrid.querySelectorAll('.delete-flyer').forEach(btn =>
    btn.addEventListener('click', () => deleteFlyer(btn.dataset.id)));
}

document.getElementById('addFlyerBtn').addEventListener('click', openFlyerModal);
document.getElementById('flyerModalClose').addEventListener('click', closeFlyerModal);
document.getElementById('flyerCancelBtn').addEventListener('click', closeFlyerModal);

function openFlyerModal() {
  flyerForm.reset();
  flyerImagePreview.style.display = 'none';
  flyerImagePreview.src = '';
  flyerModal.style.display = 'flex';
}
function closeFlyerModal() { flyerModal.style.display = 'none'; }

flyerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = document.getElementById('flyerSaveBtn');
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;

  try {
    const title       = document.getElementById('flyerTitle').value.trim();
    const description = document.getElementById('flyerDescription').value.trim();
    const imageUrl    = document.getElementById('flyerImageUrl').value.trim();
    const published   = document.getElementById('flyerPublished').checked;

    await addDoc(collection(db, 'flyers'), { title, description, imageUrl, published, date: serverTimestamp() });

    closeFlyerModal();
    await loadFlyers();
    toast('Flyer added!');
  } catch (err) {
    toast('Error adding flyer: ' + err.message, 'error');
  } finally {
    saveBtn.textContent = 'Add Flyer';
    saveBtn.disabled = false;
  }
});

async function deleteFlyer(id) {
  if (!confirm('Delete this flyer? This cannot be undone.')) return;
  await deleteDoc(doc(db, 'flyers', id));
  await loadFlyers();
  toast('Flyer deleted.');
}

/* ============================================================
   COMPETITIONS
   ============================================================ */
const compListEl = document.getElementById('compList');
const compModal  = document.getElementById('compModal');
const compForm   = document.getElementById('compForm');

async function loadCompetitions() {
  const q    = query(collection(db, 'competitions'), orderBy('date', 'asc'));
  const snap = await getDocs(q);
  renderCompList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

function renderCompList(events) {
  if (!events.length) {
    compListEl.innerHTML = `<div class="empty-state"><p>No events yet. Click "+ Add Event" to get started.</p></div>`;
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  compListEl.innerHTML = events.map(ev => {
    const eventDate = new Date(ev.date + 'T00:00:00');
    const checkDate = ev.endDate ? new Date(ev.endDate + 'T00:00:00') : eventDate;
    const isPast    = checkDate < today;
    const dateStr   = ev.endDate && ev.endDate !== ev.date
      ? `${fmtDateShort(ev.date)} – ${fmtDateShort(ev.endDate)}`
      : fmtDateShort(ev.date);
    return `
      <div class="slot-row" data-id="${escHtml(ev.id)}" style="${isPast ? 'opacity:0.55' : ''}">
        <div class="slot-day" style="width:auto;min-width:90px;">${dateStr}</div>
        <div class="slot-time" style="flex:1.5;">${escHtml(ev.name)}</div>
        <div class="slot-loc">${escHtml(ev.location || '—')}</div>
        <span class="news-row-status ${isPast ? 'status-draft' : 'status-published'}" style="flex-shrink:0;">${isPast ? 'Past' : 'Upcoming'}</span>
        <div class="slot-actions">
          <button class="btn-icon edit-comp" data-id="${escHtml(ev.id)}" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon danger delete-comp" data-id="${escHtml(ev.id)}" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  compListEl.querySelectorAll('.edit-comp').forEach(btn =>
    btn.addEventListener('click', () => openCompModal(btn.dataset.id)));
  compListEl.querySelectorAll('.delete-comp').forEach(btn =>
    btn.addEventListener('click', () => deleteComp(btn.dataset.id)));
}

document.getElementById('addCompBtn').addEventListener('click', () => openCompModal(null));
document.getElementById('compModalClose').addEventListener('click', closeCompModal);
document.getElementById('compCancelBtn').addEventListener('click', closeCompModal);

async function openCompModal(id) {
  document.getElementById('compModalTitle').textContent = id ? 'Edit Event' : 'Add Competition';
  document.getElementById('compDocId').value = id || '';

  if (id) {
    const snap = await getDoc(doc(db, 'competitions', id));
    if (snap.exists()) {
      const ev = snap.data();
      document.getElementById('compName').value          = ev.name        || '';
      document.getElementById('compDate').value          = ev.date        || '';
      document.getElementById('compEndDate').value       = ev.endDate     || '';
      document.getElementById('compLocation').value      = ev.location    || '';
      document.getElementById('compDivisions').value     = ev.divisions   || '';
      document.getElementById('compNotes').value         = ev.notes       || '';
      document.getElementById('compLink').value          = ev.link        || '';
      document.getElementById('compPublished').checked   = ev.published   ?? true;
    }
  } else {
    compForm.reset();
    document.getElementById('compPublished').checked = true;
  }
  compModal.style.display = 'flex';
}
function closeCompModal() { compModal.style.display = 'none'; }

compForm.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = document.getElementById('compSaveBtn');
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;

  try {
    const id = document.getElementById('compDocId').value;
    const data = {
      name:      document.getElementById('compName').value.trim(),
      date:      document.getElementById('compDate').value,
      endDate:   document.getElementById('compEndDate').value || null,
      location:  document.getElementById('compLocation').value.trim(),
      divisions: document.getElementById('compDivisions').value.trim(),
      notes:     document.getElementById('compNotes').value.trim(),
      link:      document.getElementById('compLink').value.trim() || null,
      published: document.getElementById('compPublished').checked,
    };

    if (id) await updateDoc(doc(db, 'competitions', id), data);
    else    await addDoc(collection(db, 'competitions'), data);

    closeCompModal();
    await loadCompetitions();
    toast('Event saved!');
  } catch (err) {
    toast('Error saving event: ' + err.message, 'error');
  } finally {
    saveBtn.textContent = 'Save Event';
    saveBtn.disabled = false;
  }
});

async function deleteComp(id) {
  if (!confirm('Delete this event? This cannot be undone.')) return;
  await deleteDoc(doc(db, 'competitions', id));
  await loadCompetitions();
  toast('Event deleted.');
}

function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ============================================================
   CLOSE MODALS ON OVERLAY CLICK
   ============================================================ */
[slotModal, newsModal, compModal, flyerModal].forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
});
