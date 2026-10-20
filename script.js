/* ============================================================
   CAMPUS CONNECT — script.js
   Plain Vanilla JavaScript · No frameworks
   Backend: http://localhost:5000
   API prefix: /api
   Routes (from dist/index.js):
     /api/auth/signup|login|me|logout|profile|change-password|
            forgot-password|reset-password|google/status
     /api/events          GET/POST/:id/report/:id/status
     /api/polls           GET(auth)/POST/:id/vote/:id/close
     /api/lostfound       GET/POST/:id/:id/status
     /api/complaints      GET/POST/:id/status
     /api/cgpa/saved      GET/POST/DELETE/:id
     /api/leaderboard     GET/GET(me)/POST(opt-in)
     /api/opportunities   GET/POST/:id/messages
     /api/notifications   GET/PATCH(read-all)/:id/read
     /api/admin/metrics|users|users/:id/status|audit-logs
   ============================================================ */

/* ── CONFIG ─────────────────────────────────────────────── */
const API_BASE = 'https://two22-7yks.onrender.com';
const API      = `${API_BASE}/api`;

/* ── STATE ──────────────────────────────────────────────── */
const state = {
  token:     localStorage.getItem('cc_token') || null,
  user:      null,
  semesters: [],
};

/* ============================================================
   CORE UTILITIES
   ============================================================ */

/** Authenticated fetch */
async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

/** Toast notification */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  el.addEventListener('click', () => el.remove());
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

/** Button loading state */
function setLoading(btn, on) {
  btn.disabled = on;
  const t = btn.querySelector('.btn-text');
  const s = btn.querySelector('.btn-spinner');
  if (t) t.style.display = on ? 'none' : '';
  if (s) s.classList.toggle('hidden', !on);
}

/** Show / hide alert box */
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `form-${type}`;
  el.classList.remove('hidden');
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

/** Date formatters */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Badge class helpers */
function statusBadge(status) {
  const m = {
    PUBLISHED: 'badge-green', APPROVED: 'badge-green', ACTIVE: 'badge-green', OPEN: 'badge-green',
    PENDING: 'badge-chartreuse', IN_PROGRESS: 'badge-lavender',
    RESOLVED: 'badge-lavender', RETURNED: 'badge-lavender', CLOSED: 'badge-gray',
    REJECTED: 'badge-tomato', SUSPENDED: 'badge-tomato', HIDDEN: 'badge-tomato',
    LOST: 'badge-tomato', FOUND: 'badge-chartreuse',
  };
  return m[status] || 'badge-gray';
}
function catBadge(cat) {
  const m = {
    TECHNICAL: 'badge-lavender', CULTURAL: 'badge-chartreuse', SPORTS: 'badge-tomato',
    HACKATHON: 'badge-lavender', PROJECT: 'badge-chartreuse',
    INTERNSHIP: 'badge-tomato', RESEARCH: 'badge-lavender', STUDY_GROUP: 'badge-green',
    WORKSHOP: 'badge-chartreuse', SEMINAR: 'badge-lavender',
  };
  return m[cat] || 'badge-gray';
}

/** User initials */
function initials(name = '') {
  return (name || '').trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/** Simple debounce */
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ============================================================
   SIDEBAR / MOBILE NAV
   ============================================================ */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}
document.getElementById('btn-sidebar-open').addEventListener('click', openSidebar);
document.getElementById('btn-sidebar-close').addEventListener('click', closeSidebar);
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

/* ============================================================
   MODALS
   ============================================================ */
function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); });
});

/* ============================================================
   ROUTER
   ============================================================ */
const SECTIONS = ['dashboard','events','polls','lostfound','opportunities',
                  'leaderboard','complaints','cgpa','admin','profile'];
const SECTION_TITLES = {
  dashboard: 'Dashboard', events: 'Events', polls: 'Polls',
  lostfound: 'Lost & Found', opportunities: 'Opportunities',
  leaderboard: 'CGPA Leaderboard', complaints: 'Lab Complaints',
  cgpa: 'CGPA Calculator', admin: 'Admin Panel', profile: 'My Profile',
};
const SECTION_LOADERS = {
  dashboard: loadDashboard, events: loadEvents, polls: loadPolls,
  lostfound: loadLostFound, opportunities: loadOpportunities,
  leaderboard: loadLeaderboard, complaints: loadComplaints,
  cgpa: initCgpa, admin: loadAdmin, profile: loadProfile,
};

function navigateTo(section) {
  if (!SECTIONS.includes(section)) section = 'dashboard';
  document.querySelectorAll('.nav-link').forEach(l =>
    l.classList.toggle('active', l.dataset.section === section));
  document.querySelectorAll('.section').forEach(s =>
    s.classList.toggle('active', s.id === `section-${section}`));
  document.getElementById('topbar-title').textContent = SECTION_TITLES[section] || section;
  if (SECTION_LOADERS[section]) SECTION_LOADERS[section]();
  closeSidebar();
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(link.dataset.section);
  });
});

/* ============================================================
   AUTH VIEWS
   ============================================================ */
function showAuthView(id) {
  document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

document.getElementById('goto-signup').addEventListener('click',           () => showAuthView('view-signup'));
document.getElementById('goto-login').addEventListener('click',            () => showAuthView('view-login'));
document.getElementById('goto-forgot').addEventListener('click',           () => showAuthView('view-forgot'));
document.getElementById('goto-login-from-forgot').addEventListener('click',() => showAuthView('view-login'));

/* ── Password toggles ─────────────────────────────────────── */
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = document.getElementById(btn.dataset.target);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    const icon = btn.querySelector('i');
    if (icon) { icon.dataset.lucide = show ? 'eye-off' : 'eye'; lucide.createIcons(); }
  });
});

/* ============================================================
   LOGIN
   ============================================================ */
document.getElementById('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('login-error');
  const btn = document.getElementById('btn-login');
  setLoading(btn, true);
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email:    document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value,
      }),
    });
    handleAuthSuccess(data);
  } catch (err) {
    showAlert('login-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   SIGNUP
   ============================================================ */
document.getElementById('form-signup').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('signup-error');
  hideAlert('signup-success');
  const btn = document.getElementById('btn-signup');

  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;

  if (!name || name.length < 2) {
    return showAlert('signup-error', 'Please enter your full name (at least 2 characters)');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showAlert('signup-error', 'Please enter a valid email address');
  }
  if (password.length < 8) {
    return showAlert('signup-error', 'Password must be at least 8 characters');
  }
  if (password !== confirm) {
    return showAlert('signup-error', 'Passwords do not match');
  }

  setLoading(btn, true);
  try {
    const data = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    handleAuthSuccess(data);
    toast('Welcome to Campus Connect! 🎓', 'success');
  } catch (err) {
    showAlert('signup-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   FORGOT PASSWORD
   ============================================================ */
document.getElementById('form-forgot').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('forgot-error');
  hideAlert('forgot-success');
  const btn = document.getElementById('btn-forgot');
  setLoading(btn, true);
  try {
    const data = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: document.getElementById('forgot-email').value.trim() }),
    });
    showAlert('forgot-success', data.message, 'success');
    // Dev: if backend returns a reset link, show it
    if (data.resetLink) {
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = 'Click here to reset (dev only)';
      a.style.cssText = 'display:block;margin-top:.5rem;color:var(--chartreuse)';
      a.addEventListener('click', ev => {
        ev.preventDefault();
        try {
          const tok = new URL(data.resetLink).searchParams.get('token');
          if (tok) { resetTokenInput.value = tok; showAuthView('view-reset'); }
        } catch {}
      });
      document.getElementById('forgot-success').appendChild(a);
    }
  } catch (err) {
    showAlert('forgot-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   RESET PASSWORD
   ============================================================ */
const resetTokenInput = document.createElement('input');
resetTokenInput.type = 'hidden';
resetTokenInput.id   = 'reset-token-value';
document.getElementById('form-reset').appendChild(resetTokenInput);

// Pre-fill token from URL
(function() {
  const p = new URLSearchParams(window.location.search);
  if (p.get('token')) resetTokenInput.value = p.get('token');
})();

document.getElementById('form-reset').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('reset-error');
  hideAlert('reset-success');
  const btn      = document.getElementById('btn-reset');
  const token    = resetTokenInput.value;
  const password = document.getElementById('reset-password').value;
  const confirm  = document.getElementById('reset-confirm').value;

  if (!token)            return showAlert('reset-error', 'Missing reset token — use the link from your email.');
  if (password.length < 8) return showAlert('reset-error', 'Password must be at least 8 characters');
  if (password !== confirm)  return showAlert('reset-error', 'Passwords do not match');

  setLoading(btn, true);
  try {
    const data = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    showAlert('reset-success', data.message, 'success');
    toast('Password reset! Sign in now.', 'success');
    setTimeout(() => showAuthView('view-login'), 2000);
  } catch (err) {
    showAlert('reset-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   GOOGLE AUTH
   ============================================================ */
document.getElementById('btn-google-login').addEventListener('click', async () => {
  try {
    const s = await apiFetch('/auth/google/status');
    if (!s.configured) { toast('Google sign-in is not configured on this server.', 'error'); return; }
    window.location.href = `${API}/auth/google`;
  } catch {
    toast('Google sign-in unavailable.', 'error');
  }
});

/* ── OAuth callback token in URL ──────────────────────────── */
function handleOAuthCallback() {
  const p = new URLSearchParams(window.location.search);
  const t = p.get('token');
  if (t) {
    state.token = t;
    localStorage.setItem('cc_token', t);
    window.history.replaceState({}, '', window.location.pathname);
    return true;
  }
  const err = p.get('error');
  if (err) toast(`Sign-in failed: ${err}`, 'error');
  return false;
}

/* ============================================================
   AUTH FLOW
   ============================================================ */
function handleAuthSuccess(data) {
  if (data.token) {
    state.token = data.token;
    localStorage.setItem('cc_token', data.token);
  }
  state.user = data.user;
  enterApp();
}

function enterApp() {
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-app').classList.add('active');
  updateNavUser();
  fetchNotifications();
  navigateTo('dashboard');
}

function updateNavUser() {
  const u = state.user;
  if (!u) return;
  document.getElementById('nav-avatar').textContent   = initials(u.name);
  document.getElementById('nav-username').textContent = u.name || u.email;
  document.getElementById('nav-role').textContent     = u.role || 'STUDENT';
  // Admin nav link
  if (u.role === 'ADMIN' || u.role === 'MODERATOR') {
    document.getElementById('nav-admin-link').classList.remove('hidden');
  }
}

/* ============================================================
   LOGOUT
   ============================================================ */
document.getElementById('btn-logout').addEventListener('click', async () => {
  try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
  state.token = null;
  state.user  = null;
  localStorage.removeItem('cc_token');
  document.getElementById('page-app').classList.remove('active');
  document.getElementById('page-auth').classList.add('active');
  showAuthView('view-login');
  toast('Logged out successfully', 'info');
});

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
async function fetchNotifications() {
  if (!state.token) return;
  try {
    const data   = await apiFetch('/notifications');
    const notifs = data.notifications || [];
    const unread = notifs.filter(n => !n.read).length;
    const badge  = document.getElementById('notif-count');
    if (unread > 0) { badge.textContent = unread; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
    renderNotifList(notifs);
  } catch {}
}

function renderNotifList(notifs) {
  const list = document.getElementById('notif-list');
  if (!notifs.length) {
    list.innerHTML = '<p class="empty-state">No notifications yet.</p>';
    return;
  }
  list.innerHTML = notifs.slice(0, 15).map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-item-title">${n.title || n.type || 'Notification'}</div>
      <div class="notif-item-body">${n.body || n.message || ''}</div>
    </div>
  `).join('');
}

document.getElementById('btn-notif').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('notif-panel').classList.toggle('hidden');
});
document.getElementById('btn-read-all').addEventListener('click', async () => {
  if (!state.token) return;
  try {
    // Use PATCH /read-all — note: must come before /:id/read in routing
    await apiFetch('/notifications/read-all', { method: 'PATCH' });
    document.getElementById('notif-count').classList.add('hidden');
    document.querySelectorAll('.notif-item').forEach(el => el.classList.remove('unread'));
  } catch {}
});
document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel');
  const btn   = document.getElementById('btn-notif');
  if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
    panel.classList.add('hidden');
  }
});

/* ============================================================
   INIT — restore session on page load
   ============================================================ */
async function init() {
  lucide.createIcons();

  // Check for reset-password token in URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('token')) {
    resetTokenInput.value = params.get('token');
    document.getElementById('page-auth').classList.add('active');
    showAuthView('view-reset');
    return;
  }

  // Check for OAuth callback token
  handleOAuthCallback();

  if (state.token) {
    try {
      const data = await apiFetch('/auth/me');
      state.user = data.user;
      enterApp();
    } catch {
      state.token = null;
      localStorage.removeItem('cc_token');
      document.getElementById('page-auth').classList.add('active');
    }
  } else {
    document.getElementById('page-auth').classList.add('active');
  }
}

/* ============================================================
   DASHBOARD
   ============================================================ */
async function loadDashboard() {
  // Show spinner placeholders
  document.getElementById('dash-events').innerHTML = '<div class="loading-spinner"></div>';
  document.getElementById('dash-polls').innerHTML  = '<div class="loading-spinner"></div>';

  try {
    // Fetch events and opportunities without auth; polls need auth
    const [evtData, lfData, oppData] = await Promise.all([
      apiFetch('/events'),
      apiFetch('/lostfound'),
      apiFetch('/opportunities'),
    ]);

    const events = evtData.events || [];
    const lf     = lfData.items   || [];
    const opps   = oppData.opportunities || [];

    document.getElementById('stat-events').textContent = events.filter(e => e.status === 'PUBLISHED').length;
    document.getElementById('stat-lost').textContent   = lf.filter(i => i.status === 'OPEN').length;
    document.getElementById('stat-opps').textContent   = opps.filter(o => o.status === 'OPEN').length;

    // Recent published events
    const recent = events.filter(e => e.status === 'PUBLISHED').slice(0, 4);
    document.getElementById('dash-events').innerHTML = recent.length
      ? recent.map(e => `
          <div class="dash-mini-item">
            <div class="dash-mini-title">${e.title}</div>
            <div class="dash-mini-meta">📅 ${fmtDate(e.eventDate)} · 📍 ${e.venue}</div>
          </div>
        `).join('')
      : '<p class="empty-state">No upcoming events.</p>';

    // Polls — needs auth
    if (state.token) {
      try {
        const pollData = await apiFetch('/polls');
        const polls = (pollData.polls || []).filter(p => p.status === 'ACTIVE');
        document.getElementById('stat-polls').textContent = polls.length;
        document.getElementById('dash-polls').innerHTML = polls.slice(0, 3).map(p => `
          <div class="dash-mini-item">
            <div class="dash-mini-title">${p.question}</div>
            <div class="dash-mini-meta">${p.totalVotes} vote${p.totalVotes !== 1 ? 's' : ''} · Expires ${fmtDate(p.expiresAt)}</div>
          </div>
        `).join('') || '<p class="empty-state">No active polls.</p>';
      } catch {
        document.getElementById('stat-polls').textContent = '—';
        document.getElementById('dash-polls').innerHTML = '<p class="empty-state">Sign in to see polls.</p>';
      }
    } else {
      document.getElementById('stat-polls').textContent = '—';
      document.getElementById('dash-polls').innerHTML = '<p class="empty-state">Sign in to see polls.</p>';
    }
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

/* ============================================================
   EVENTS
   ============================================================ */
async function loadEvents() {
  const container = document.getElementById('events-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const cat = document.getElementById('event-cat-filter').value;
    const url = cat && cat !== 'ALL' ? `/events?category=${cat}` : '/events';
    const data = await apiFetch(url);
    renderEvents(data.events || [], container);
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed to load events: ${err.message}</p>`;
  }
}

function renderEvents(events, container) {
  if (!events.length) { container.innerHTML = '<p class="empty-state">No events found.</p>'; return; }
  container.innerHTML = events.map(e => `
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-card-title">${escHtml(e.title)}</span>
        <span class="badge ${statusBadge(e.status)}">${e.status}</span>
      </div>
      <div class="item-card-meta">
        <span class="badge ${catBadge(e.category)}">${e.category}</span>
        <span>📅 ${fmtDateTime(e.eventDate)}</span>
        <span>📍 ${escHtml(e.venue)}</span>
      </div>
      <div class="item-card-desc">${escHtml(e.description)}</div>
      <div class="item-card-footer">
        ${e.registrationLink ? `<a href="${e.registrationLink}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">Register ↗</a>` : ''}
        ${e.organizerName ? `<span style="font-size:.8rem;color:var(--text-muted)">By ${escHtml(e.organizerName)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

document.getElementById('event-cat-filter').addEventListener('change', loadEvents);

document.getElementById('btn-create-event').addEventListener('click', () => {
  if (!state.user) { toast('Please sign in to post events', 'error'); return; }
  openModal('modal-create-event');
});

document.getElementById('form-create-event').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('create-event-error');
  const btn = document.getElementById('btn-submit-event');
  setLoading(btn, true);
  try {
    await apiFetch('/events', {
      method: 'POST',
      body: JSON.stringify({
        title:            document.getElementById('evt-title').value.trim(),
        description:      document.getElementById('evt-desc').value.trim(),
        category:         document.getElementById('evt-cat').value,
        eventDate:        document.getElementById('evt-date').value,
        venue:            document.getElementById('evt-venue').value.trim(),
        registrationLink: document.getElementById('evt-reg-link').value.trim() || undefined,
      }),
    });
    closeModal('modal-create-event');
    document.getElementById('form-create-event').reset();
    toast('Event submitted — pending approval ✅', 'success');
    loadEvents();
  } catch (err) {
    showAlert('create-event-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   POLLS
   ============================================================ */
async function loadPolls() {
  const container = document.getElementById('polls-list');
  container.innerHTML = '<div class="loading-spinner"></div>';

  if (!state.token) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem">
        <p style="color:var(--text-muted);margin-bottom:1rem">Sign in to view and vote on polls.</p>
        <button class="btn btn-primary" onclick="document.getElementById('page-app').classList.remove('active');document.getElementById('page-auth').classList.add('active')">Sign In</button>
      </div>`;
    return;
  }

  try {
    const data  = await apiFetch('/polls');
    const polls = data.polls || [];
    if (!polls.length) { container.innerHTML = '<p class="empty-state" style="grid-column:1/-1">No polls available.</p>'; return; }
    container.innerHTML = polls.map(renderPollCard).join('');
    // Wire vote buttons
    container.querySelectorAll('.poll-option[data-poll-id]').forEach(opt => {
      opt.addEventListener('click', () => castVote(opt.dataset.pollId, opt.dataset.optId));
    });
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

function renderPollCard(poll) {
  const total    = poll.totalVotes || 0;
  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
  const isClosed  = poll.status !== 'ACTIVE' || isExpired;

  const optionsHtml = (poll.options || []).map(opt => {
    const pct   = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
    const voted = poll.userVoteId === opt.id;
    return `
      <div class="poll-option ${voted ? 'voted' : ''}"
           data-poll-id="${poll.id}" data-opt-id="${opt.id}"
           style="cursor:${isClosed ? 'default' : 'pointer'};pointer-events:${isClosed ? 'none' : 'auto'}">
        <div class="poll-option-bar" style="width:${pct}%"></div>
        <span>${escHtml(opt.text)}${voted ? ' ✓' : ''}</span>
        <span class="poll-option-pct">${pct}%</span>
      </div>`;
  }).join('');

  return `
    <div class="poll-card" id="poll-${poll.id}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
        <span class="badge ${isClosed ? 'badge-gray' : 'badge-green'}">${isClosed ? 'CLOSED' : 'ACTIVE'}</span>
        <span style="font-size:.78rem;color:var(--text-muted)">Expires ${fmtDate(poll.expiresAt)}</span>
      </div>
      <div class="poll-question">${escHtml(poll.question)}</div>
      ${poll.description ? `<div class="poll-desc">${escHtml(poll.description)}</div>` : ''}
      <div class="poll-options">${optionsHtml}</div>
      <div class="poll-footer">
        <span>${total} vote${total !== 1 ? 's' : ''}</span>
        ${poll.userVoteId ? '<span style="color:var(--lavender)">✓ Voted</span>' : (isClosed ? '' : '<span style="color:var(--text-muted)">Click to vote</span>')}
      </div>
    </div>`;
}

async function castVote(pollId, optId) {
  if (!state.user) { toast('Sign in to vote', 'error'); return; }
  try {
    const data = await apiFetch(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId: optId }),
    });
    // Re-render just this card
    const card = document.getElementById(`poll-${pollId}`);
    if (card) {
      const newCard = document.createElement('div');
      newCard.innerHTML = renderPollCard(data.poll);
      const newEl = newCard.firstElementChild;
      card.replaceWith(newEl);
      // Re-wire vote buttons on this card
      newEl.querySelectorAll('.poll-option[data-poll-id]').forEach(opt => {
        opt.addEventListener('click', () => castVote(opt.dataset.pollId, opt.dataset.optId));
      });
    }
    toast('Vote recorded! ✅', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ============================================================
   LOST & FOUND
   ============================================================ */
async function loadLostFound() {
  const container = document.getElementById('lf-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const type = document.getElementById('lf-type-filter').value;
    const cat  = document.getElementById('lf-cat-filter').value;
    let url = '/lostfound';
    const q = [];
    if (type)              q.push(`type=${type}`);
    if (cat && cat !== 'ALL') q.push(`category=${encodeURIComponent(cat)}`);
    if (q.length) url += '?' + q.join('&');
    const data = await apiFetch(url);
    renderLostFound(data.items || [], container);
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

function renderLostFound(items, container) {
  if (!items.length) { container.innerHTML = '<p class="empty-state">No items reported.</p>'; return; }
  container.innerHTML = items.map(item => `
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-card-title">${escHtml(item.title)}</span>
        <span class="badge ${item.type === 'LOST' ? 'badge-tomato' : 'badge-green'}">${item.type}</span>
      </div>
      <div class="item-card-meta">
        <span class="badge badge-gray">${item.category}</span>
        <span>📍 ${escHtml(item.location)}</span>
        <span>📅 ${fmtDate(item.date || item.createdAt)}</span>
      </div>
      <div class="item-card-desc">${escHtml(item.description)}</div>
      ${item.contactInfo ? `<div style="font-size:.82rem;color:var(--text-muted);margin-top:.3rem">📞 ${escHtml(item.contactInfo)}</div>` : ''}
      <div class="item-card-footer">
        <span class="badge ${statusBadge(item.status)}">${item.status}</span>
      </div>
    </div>
  `).join('');
}

document.getElementById('lf-type-filter').addEventListener('change', loadLostFound);
document.getElementById('lf-cat-filter').addEventListener('change', loadLostFound);

document.getElementById('btn-create-lf').addEventListener('click', () => {
  if (!state.user) { toast('Sign in to report items', 'error'); return; }
  openModal('modal-create-lf');
});

document.getElementById('form-create-lf').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('create-lf-error');
  const btn = document.getElementById('btn-submit-lf');
  setLoading(btn, true);
  try {
    await apiFetch('/lostfound', {
      method: 'POST',
      body: JSON.stringify({
        title:       document.getElementById('lf-title').value.trim(),
        type:        document.getElementById('lf-type').value,
        category:    document.getElementById('lf-cat').value,
        location:    document.getElementById('lf-location').value.trim(),
        description: document.getElementById('lf-desc').value.trim(),
        contactInfo: document.getElementById('lf-contact').value.trim() || undefined,
      }),
    });
    closeModal('modal-create-lf');
    document.getElementById('form-create-lf').reset();
    toast('Item reported successfully! ✅', 'success');
    loadLostFound();
  } catch (err) {
    showAlert('create-lf-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   OPPORTUNITIES
   ============================================================ */
async function loadOpportunities() {
  const container = document.getElementById('opp-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const cat = document.getElementById('opp-cat-filter').value;
    const url = cat && cat !== 'ALL' ? `/opportunities?category=${cat}` : '/opportunities';
    const data = await apiFetch(url);
    renderOpportunities(data.opportunities || [], container);
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

function renderOpportunities(opps, container) {
  if (!opps.length) { container.innerHTML = '<p class="empty-state">No opportunities posted yet.</p>'; return; }
  container.innerHTML = opps.map(o => `
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-card-title">${escHtml(o.title)}</span>
        <span class="badge ${statusBadge(o.status)}">${o.status}</span>
      </div>
      <div class="item-card-meta">
        <span class="badge ${catBadge(o.category)}">${o.category}</span>
        <span>👥 Team: ${o.teamSize}</span>
        <span>By: ${escHtml(o.creatorAlias || 'Anonymous')}</span>
      </div>
      <div class="item-card-desc">${escHtml(o.description)}</div>
      ${o.requiredSkills && o.requiredSkills.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.5rem">
          ${o.requiredSkills.map(s => `<span class="badge badge-lavender">${escHtml(s)}</span>`).join('')}
        </div>` : ''}
      <div class="item-card-footer">
        <span style="font-size:.78rem;color:var(--text-muted)">${fmtDate(o.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

document.getElementById('opp-cat-filter').addEventListener('change', loadOpportunities);

document.getElementById('btn-create-opp').addEventListener('click', () => {
  if (!state.user) { toast('Sign in to post opportunities', 'error'); return; }
  openModal('modal-create-opp');
});

document.getElementById('form-create-opp').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('create-opp-error');
  const btn = document.getElementById('btn-submit-opp');
  setLoading(btn, true);
  try {
    await apiFetch('/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        title:          document.getElementById('opp-title').value.trim(),
        description:    document.getElementById('opp-desc').value.trim(),
        category:       document.getElementById('opp-cat').value,
        teamSize:       parseInt(document.getElementById('opp-team').value) || 4,
        requiredSkills: document.getElementById('opp-skills').value,
      }),
    });
    closeModal('modal-create-opp');
    document.getElementById('form-create-opp').reset();
    toast('Opportunity posted! ✅', 'success');
    loadOpportunities();
  } catch (err) {
    showAlert('create-opp-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   LEADERBOARD
   ============================================================ */
async function loadLeaderboard() {
  const container = document.getElementById('lb-list');
  container.innerHTML = '<div class="loading-spinner"></div>';

  // My status
  if (state.token) {
    try {
      const me   = await apiFetch('/leaderboard/me');
      const s    = me.status || {};
      const card = document.getElementById('lb-status-card');
      const btnJoin  = document.getElementById('btn-lb-optin');
      const btnLeave = document.getElementById('btn-lb-optout');
      if (s.isOptedIn) {
        card.classList.remove('hidden');
        document.getElementById('lb-status-text').textContent =
          `You're on the board — Rank #${s.currentRank || '?'} · CGPA ${s.cgpa || '?'} · ${s.milestone}`;
        btnJoin.classList.add('hidden');
        btnLeave.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
        btnJoin.classList.remove('hidden');
        btnLeave.classList.add('hidden');
      }
    } catch {}
  }

  try {
    const milestone = document.getElementById('lb-milestone-filter').value;
    let url = '/leaderboard';
    if (milestone && milestone !== 'ALL') url += `?milestone=${encodeURIComponent(milestone)}`;
    const data = await apiFetch(url);
    const entries = data.leaderboard || data.entries || [];
    renderLeaderboard(entries, container);
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

function renderLeaderboard(entries, container) {
  if (!entries.length) { container.innerHTML = '<p class="empty-state">No entries yet. Be the first!</p>'; return; }
  container.innerHTML = `
    <table class="lb-table">
      <thead>
        <tr><th>Rank</th><th>Name</th><th>Dept</th><th>Batch</th><th>CGPA</th><th>Milestone</th><th>✓</th></tr>
      </thead>
      <tbody>
        ${entries.map(e => {
          const rankCls = e.rank <= 3 ? `lb-rank-${e.rank}` : '';
          const name = e.isAnonymous ? (e.alias || 'Anonymous') : (e.displayName || 'Student');
          return `
          <tr>
            <td><span class="lb-rank ${rankCls}">#${e.rank}</span></td>
            <td>${escHtml(name)}</td>
            <td style="color:var(--text-muted)">${escHtml(e.department || '—')}</td>
            <td style="color:var(--text-muted)">${escHtml(e.batch || '—')}</td>
            <td style="font-weight:700;color:var(--chartreuse)">${e.cgpa}</td>
            <td style="color:var(--text-muted)">${e.milestone || '—'}</td>
            <td>${e.verified ? '✅' : '—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

document.getElementById('lb-milestone-filter').addEventListener('change', loadLeaderboard);

document.getElementById('btn-lb-optin').addEventListener('click', async () => {
  if (!state.user) { toast('Sign in to join leaderboard', 'error'); return; }
  try {
    await apiFetch('/leaderboard/opt-in', {
      method: 'POST',
      body: JSON.stringify({ isOptedIn: true, isAnonymous: false }),
    });
    toast('Joined the leaderboard! 🏆', 'success');
    loadLeaderboard();
  } catch (err) { toast(err.message, 'error'); }
});

document.getElementById('btn-lb-optout').addEventListener('click', async () => {
  try {
    await apiFetch('/leaderboard/opt-in', {
      method: 'POST',
      body: JSON.stringify({ isOptedIn: false, isAnonymous: false }),
    });
    toast('Removed from leaderboard', 'info');
    loadLeaderboard();
  } catch (err) { toast(err.message, 'error'); }
});

/* ============================================================
   LAB COMPLAINTS
   ============================================================ */
async function loadComplaints() {
  const container = document.getElementById('complaints-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const data = await apiFetch('/complaints');
    renderComplaints(data.complaints || [], container);
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

function renderComplaints(complaints, container) {
  if (!complaints.length) { container.innerHTML = '<p class="empty-state">No complaints filed yet.</p>'; return; }
  container.innerHTML = complaints.map(c => `
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-card-title">${escHtml(c.lab)} — ${escHtml(c.systemNumber)}</span>
        <span class="badge ${statusBadge(c.status)}">${c.status}</span>
      </div>
      <div class="item-card-meta">
        <span>🏢 ${escHtml(c.floor || '—')}</span>
        <span>🔖 Ref: ${escHtml(c.referenceId || '—')}</span>
        <span>📅 ${fmtDate(c.createdAt)}</span>
      </div>
      <div class="item-card-desc">${escHtml(c.description)}</div>
      ${c.adminNotes ? `<div style="font-size:.82rem;color:var(--text-muted);margin-top:.4rem"><strong>Admin note:</strong> ${escHtml(c.adminNotes)}</div>` : ''}
      ${c.resolvedAt ? `<div style="font-size:.78rem;color:#4ade80;margin-top:.3rem">✅ Resolved ${fmtDate(c.resolvedAt)}</div>` : ''}
    </div>
  `).join('');
}

document.getElementById('btn-create-complaint').addEventListener('click', () => openModal('modal-create-complaint'));

document.getElementById('form-create-complaint').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('create-complaint-error');
  hideAlert('create-complaint-success');
  const btn = document.getElementById('btn-submit-complaint');
  setLoading(btn, true);
  try {
    const data = await apiFetch('/complaints', {
      method: 'POST',
      body: JSON.stringify({
        floor:        document.getElementById('cmp-floor').value,
        lab:          document.getElementById('cmp-lab').value.trim(),
        systemNumber: document.getElementById('cmp-sys').value.trim(),
        description:  document.getElementById('cmp-desc').value.trim(),
      }),
    });
    const refId = data.complaint?.referenceId || data.referenceId || 'N/A';
    showAlert('create-complaint-success', `Complaint filed! Reference: ${refId}`, 'success');
    document.getElementById('form-create-complaint').reset();
    toast(`Complaint filed — Ref: ${refId}`, 'success');
    loadComplaints();
    setTimeout(() => closeModal('modal-create-complaint'), 2500);
  } catch (err) {
    showAlert('create-complaint-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   CGPA CALCULATOR
   ============================================================ */
let semCounter = 0;

function initCgpa() {
  if (state.semesters.length === 0) addSemester();
  loadSavedCgpa();
}

function addSemester() {
  semCounter++;
  state.semesters.push({ id: semCounter, courses: [{ name: '', credits: 4, grade: 9 }] });
  renderSemesters();
}

function renderSemesters() {
  const container = document.getElementById('semesters-container');
  container.innerHTML = state.semesters.map((sem, semIdx) => `
    <div class="semester-block" id="sem-${sem.id}">
      <div class="semester-block-header">
        <span>Semester ${semIdx + 1}</span>
        <div style="display:flex;gap:.4rem">
          <button class="btn btn-sm btn-secondary" onclick="addCourse(${sem.id})">+ Course</button>
          ${state.semesters.length > 1
            ? `<button class="btn btn-sm btn-danger" onclick="removeSemester(${sem.id})">Remove</button>`
            : ''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.4rem;font-size:.75rem;color:var(--text-muted);margin-bottom:.3rem">
        <span>Course</span><span>Credits</span><span>Grade (0–10)</span><span></span>
      </div>
      ${sem.courses.map((c, ci) => `
        <div class="course-row">
          <input type="text" placeholder="Course name" value="${escHtml(c.name)}"
            oninput="updateCourse(${sem.id},${ci},'name',this.value)" />
          <input type="number" min="1" max="6" value="${c.credits}"
            oninput="updateCourse(${sem.id},${ci},'credits',this.value)" />
          <input type="number" min="0" max="10" step="0.1" value="${c.grade}"
            oninput="updateCourse(${sem.id},${ci},'grade',this.value)" />
          <button class="btn-remove" onclick="removeCourse(${sem.id},${ci})" title="Remove course">✕</button>
        </div>
      `).join('')}
      <div style="font-size:.85rem;color:var(--text-muted);margin-top:.5rem;display:flex;justify-content:space-between;align-items:center">
        <span>Semester GPA: <strong style="color:var(--chartreuse)">${calcSemGpa(sem).toFixed(2)}</strong></span>
        <span>${sem.courses.reduce((a, c) => a + Number(c.credits), 0)} credits</span>
      </div>
      ${state.user ? `
        <button class="btn btn-sm btn-primary" style="margin-top:.5rem;width:100%" onclick="saveSemester(${sem.id})">
          💾 Save Semester ${semIdx + 1}
        </button>` : ''}
    </div>
  `).join('');
  lucide.createIcons();
  updateCgpaResult();
}

window.addSemester   = addSemester;
window.removeSemester = id => {
  state.semesters = state.semesters.filter(s => s.id !== id);
  renderSemesters();
};
window.addCourse = id => {
  const sem = state.semesters.find(s => s.id === id);
  if (sem) { sem.courses.push({ name: '', credits: 4, grade: 9 }); renderSemesters(); }
};
window.removeCourse = (id, ci) => {
  const sem = state.semesters.find(s => s.id === id);
  if (sem && sem.courses.length > 1) { sem.courses.splice(ci, 1); renderSemesters(); }
};
window.updateCourse = (id, ci, field, val) => {
  const sem = state.semesters.find(s => s.id === id);
  if (sem) { sem.courses[ci][field] = field === 'name' ? val : parseFloat(val) || 0; updateCgpaResult(); }
};

function calcSemGpa(sem) {
  const tc = sem.courses.reduce((a, c) => a + Number(c.credits), 0);
  if (!tc) return 0;
  return sem.courses.reduce((a, c) => a + Number(c.credits) * Number(c.grade), 0) / tc;
}

function updateCgpaResult() {
  let tc = 0, ws = 0;
  state.semesters.forEach(sem => sem.courses.forEach(c => {
    tc += Number(c.credits);
    ws += Number(c.credits) * Number(c.grade);
  }));
  document.getElementById('cgpa-result').textContent = tc > 0 ? (ws / tc).toFixed(2) : '—';
}

window.saveSemester = async id => {
  if (!state.user) { toast('Sign in to save results', 'error'); return; }
  const sem    = state.semesters.find(s => s.id === id);
  if (!sem) return;
  const semNum = state.semesters.indexOf(sem) + 1;
  try {
    await apiFetch('/cgpa/saved', {
      method: 'POST',
      body: JSON.stringify({
        semesterNumber: semNum,
        courses:        sem.courses,
        gpa:            calcSemGpa(sem),
        totalCredits:   sem.courses.reduce((a, c) => a + Number(c.credits), 0),
      }),
    });
    toast(`Semester ${semNum} saved! ✅`, 'success');
    loadSavedCgpa();
  } catch (err) { toast(err.message, 'error'); }
};

async function loadSavedCgpa() {
  const container = document.getElementById('cgpa-saved-list');
  if (!state.user) {
    container.innerHTML = '<p class="empty-state">Sign in to see saved semesters.</p>';
    return;
  }
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const data    = await apiFetch('/cgpa/saved');
    const results = data.results || [];
    if (!results.length) { container.innerHTML = '<p class="empty-state">No saved results yet.</p>'; return; }

    // Calculate overall CGPA from saved
    let tc = 0, ws = 0;
    results.forEach(r => { tc += r.totalCredits; ws += r.totalCredits * r.gpa; });
    const overall = tc > 0 ? (ws / tc).toFixed(2) : '—';

    container.innerHTML = `
      <div style="padding:.75rem 1rem;background:var(--bg3);border-radius:var(--radius-sm);margin-bottom:.75rem;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600;font-size:.9rem">Overall CGPA</span>
        <span style="font-size:1.5rem;font-weight:800;color:var(--chartreuse)">${overall}</span>
      </div>
      ${results.map(r => `
        <div style="padding:.6rem 1rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;font-size:.9rem">Semester ${r.semesterNumber}</div>
            <div style="font-size:.78rem;color:var(--text-muted)">${r.totalCredits} credits · ${fmtDate(r.createdAt)}</div>
          </div>
          <span style="font-weight:700;color:var(--chartreuse);font-size:1.1rem">${r.gpa.toFixed(2)}</span>
        </div>
      `).join('')}`;
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

document.getElementById('btn-add-semester').addEventListener('click', addSemester);

/* ============================================================
   ADMIN PANEL
   ============================================================ */
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`admin-tab-${tab.dataset.tab}`)?.classList.add('active');
    const loaders = {
      metrics:         loadAdminMetrics,
      users:           loadAdminUsers,
      'events-mod':    loadAdminEvents,
      'complaints-mod':loadAdminComplaints,
      audit:           loadAdminAudit,
    };
    if (loaders[tab.dataset.tab]) loaders[tab.dataset.tab]();
  });
});

async function loadAdmin() {
  if (!state.user || (state.user.role !== 'ADMIN' && state.user.role !== 'MODERATOR')) {
    document.getElementById('section-admin').innerHTML =
      '<p class="empty-state" style="padding:4rem;font-size:1.1rem">🔒 Admin access only.</p>';
    return;
  }
  loadAdminMetrics();
}

async function loadAdminMetrics() {
  const container = document.getElementById('admin-metrics');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const data = await apiFetch('/admin/metrics');
    const m    = data.metrics || {};
    const items = [
      { label: 'Total Users',      val: m.totalUsers,          color: 'var(--lavender)'   },
      { label: 'Active Users',     val: m.activeUsers,         color: 'var(--chartreuse)' },
      { label: 'Suspended',        val: m.suspendedUsers,      color: 'var(--tomato)'     },
      { label: 'Events Published', val: m.publishedEvents,     color: 'var(--lavender)'   },
      { label: 'Active Polls',     val: m.activePolls,         color: 'var(--chartreuse)' },
      { label: 'Open Complaints',  val: m.openComplaints,      color: 'var(--tomato)'     },
      { label: 'Lost & Found Open',val: m.lostFoundOpen,       color: 'var(--lavender)'   },
      { label: 'Actions (24h)',    val: m.moderationActions24h, color:'var(--chartreuse)' },
    ];
    container.innerHTML = items.map(s => `
      <div class="stat-card">
        <div>
          <div class="stat-val" style="color:${s.color}">${s.val ?? 0}</div>
          <div class="stat-label">${s.label}</div>
        </div>
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

async function loadAdminUsers() {
  const container = document.getElementById('admin-users-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const search = document.getElementById('admin-user-search').value;
    const role   = document.getElementById('admin-user-role').value;
    let url = '/admin/users';
    const q = [];
    if (search) q.push(`search=${encodeURIComponent(search)}`);
    if (role)   q.push(`role=${role}`);
    if (q.length) url += '?' + q.join('&');
    const data  = await apiFetch(url);
    const users = data.users || [];
    if (!users.length) { container.innerHTML = '<p class="empty-state">No users found.</p>'; return; }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${users.map(u => `
          <tr>
            <td>${escHtml(u.name)}</td>
            <td style="color:var(--text-muted)">${escHtml(u.email)}</td>
            <td><span class="badge badge-lavender">${u.role}</span></td>
            <td><span class="badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-tomato'}">${u.status}</span></td>
            <td>
              ${u.status === 'ACTIVE'
                ? `<button class="btn btn-sm btn-danger" onclick="updateUserStatus('${u.id}','SUSPENDED')">Suspend</button>`
                : `<button class="btn btn-sm btn-success" onclick="updateUserStatus('${u.id}','ACTIVE')">Activate</button>`}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

window.updateUserStatus = async (uid, status) => {
  try {
    await apiFetch(`/admin/users/${uid}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`User ${status === 'ACTIVE' ? 'activated ✅' : 'suspended 🚫'}`, 'success');
    loadAdminUsers();
  } catch (err) { toast(err.message, 'error'); }
};

document.getElementById('admin-user-search').addEventListener('input', debounce(loadAdminUsers, 400));
document.getElementById('admin-user-role').addEventListener('change', loadAdminUsers);

async function loadAdminEvents() {
  const container = document.getElementById('admin-events-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const data   = await apiFetch('/events');          // use regular events endpoint
    const events = (data.events || []).filter(e => e.status === 'PENDING');
    if (!events.length) {
      container.innerHTML = '<p class="empty-state">No pending events to review.</p>';
      return;
    }
    container.innerHTML = events.map(e => `
      <div class="item-card">
        <div class="item-card-header">
          <span class="item-card-title">${escHtml(e.title)}</span>
          <span class="badge ${statusBadge(e.status)}">${e.status}</span>
        </div>
        <div class="item-card-meta">
          <span class="badge ${catBadge(e.category)}">${e.category}</span>
          <span>${fmtDate(e.eventDate)}</span>
          <span>${escHtml(e.venue)}</span>
        </div>
        <div class="item-card-desc">${escHtml(e.description)}</div>
        <div class="item-card-footer">
          <button class="btn btn-sm btn-success" onclick="adminEvtAction('${e.id}','PUBLISHED')">✅ Approve</button>
          <button class="btn btn-sm btn-danger"  onclick="adminEvtAction('${e.id}','REJECTED')">❌ Reject</button>
        </div>
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

window.adminEvtAction = async (id, status) => {
  try {
    await apiFetch(`/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    toast(`Event ${status === 'PUBLISHED' ? 'approved ✅' : 'rejected'}`, 'success');
    loadAdminEvents();
  } catch (err) { toast(err.message, 'error'); }
};

async function loadAdminComplaints() {
  const container = document.getElementById('admin-complaints-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const data       = await apiFetch('/complaints');
    const complaints = data.complaints || [];
    if (!complaints.length) { container.innerHTML = '<p class="empty-state">No complaints.</p>'; return; }
    container.innerHTML = complaints.map(c => `
      <div class="item-card">
        <div class="item-card-header">
          <span class="item-card-title">${escHtml(c.lab)} — ${escHtml(c.systemNumber)}</span>
          <span class="badge ${statusBadge(c.status)}">${c.status}</span>
        </div>
        <div class="item-card-meta">
          <span>${escHtml(c.floor)}</span>
          <span>Ref: ${escHtml(c.referenceId || '—')}</span>
          <span>${fmtDate(c.createdAt)}</span>
        </div>
        <div class="item-card-desc">${escHtml(c.description)}</div>
        ${c.status !== 'RESOLVED' ? `
          <div class="item-card-footer">
            <button class="btn btn-sm btn-success" onclick="adminCmpStatus('${c.id}','RESOLVED')">✅ Resolve</button>
            <button class="btn btn-sm btn-secondary" onclick="adminCmpStatus('${c.id}','IN_PROGRESS')">🔄 In Progress</button>
          </div>` : ''}
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

window.adminCmpStatus = async (id, status) => {
  try {
    await apiFetch(`/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    toast(`Complaint ${status === 'RESOLVED' ? 'resolved ✅' : 'updated'}`, 'success');
    loadAdminComplaints();
  } catch (err) { toast(err.message, 'error'); }
};

async function loadAdminAudit() {
  const container = document.getElementById('admin-audit-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const data = await apiFetch('/admin/audit-logs');
    const logs = data.logs || [];
    if (!logs.length) { container.innerHTML = '<p class="empty-state">No audit logs.</p>'; return; }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Date</th></tr></thead>
        <tbody>${logs.slice(0, 60).map(l => `
          <tr>
            <td><span class="badge badge-lavender" style="font-size:.65rem">${l.action}</span></td>
            <td style="color:var(--text-muted)">${escHtml(l.actorEmail || l.actorId || '—')}</td>
            <td style="color:var(--text-muted)">${escHtml(l.targetType || '—')}</td>
            <td style="font-size:.78rem;color:var(--text-muted)">${fmtDateTime(l.createdAt)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed: ${err.message}</p>`;
  }
}

/* ============================================================
   PROFILE
   ============================================================ */
async function loadProfile() {
  if (!state.user) return;
  const u = state.user;
  document.getElementById('profile-avatar').textContent = initials(u.name);
  document.getElementById('profile-name').value  = u.name       || '';
  document.getElementById('profile-email').value = u.email      || '';
  document.getElementById('profile-dept').value  = u.department || '';
  document.getElementById('profile-batch').value = u.batch      || '';
}

document.getElementById('form-profile').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('profile-error');
  hideAlert('profile-success');
  const btn = document.getElementById('btn-save-profile');
  setLoading(btn, true);
  try {
    const data = await apiFetch('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        name:      document.getElementById('profile-name').value.trim(),
        avatarUrl: null,
      }),
    });
    state.user = { ...state.user, ...data.user };
    updateNavUser();
    document.getElementById('profile-avatar').textContent = initials(state.user.name);
    showAlert('profile-success', 'Profile updated! ✅', 'success');
    toast('Profile saved!', 'success');
  } catch (err) {
    showAlert('profile-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

document.getElementById('form-change-pw').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('pw-error');
  hideAlert('pw-success');
  const btn    = document.getElementById('btn-change-pw');
  const newPw  = document.getElementById('pw-new').value;
  const cfmPw  = document.getElementById('pw-confirm').value;

  if (newPw.length < 8) return showAlert('pw-error', 'New password must be at least 8 characters');
  if (newPw !== cfmPw)  return showAlert('pw-error', 'New passwords do not match');

  setLoading(btn, true);
  try {
    const data = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: document.getElementById('pw-current').value,
        newPassword:     newPw,
      }),
    });
    showAlert('pw-success', data.message, 'success');
    document.getElementById('form-change-pw').reset();
    toast('Password updated! ✅', 'success');
  } catch (err) {
    showAlert('pw-error', err.message);
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   XSS HELPER
   ============================================================ */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   KICK OFF
   ============================================================ */
init();
