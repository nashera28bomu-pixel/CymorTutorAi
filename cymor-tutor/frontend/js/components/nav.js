// Shared navigation. `renderNav` renders a full topbar + bottom nav into
// #cymor-nav-root (used by pages/*.html). `renderBottomNavOnly` renders just
// the bottom nav into #bottom-nav (used by the root index.html, which has
// its own custom topbar with a sidebar toggle).

function isInPagesDir() {
  return location.pathname.includes('/pages/');
}

function navItems() {
  const inPages = isInPagesDir();
  return [
    { key: 'chat', href: inPages ? '../index.html' : 'index.html', icon: '🤖', label: 'Chat' },
    { key: 'notes', href: inPages ? 'notes.html' : 'pages/notes.html', icon: '📄', label: 'Notes' },
    { key: 'quiz', href: inPages ? 'quiz.html' : 'pages/quiz.html', icon: '📝', label: 'Quiz' },
    { key: 'progress', href: inPages ? 'progress.html' : 'pages/progress.html', icon: '📊', label: 'Progress' }
  ];
}

function bottomNavHtml(activePage) {
  return navItems()
    .map(
      (item) => `
    <a href="${item.href}" class="bottom-nav-item ${activePage === item.key ? 'active' : ''}">
      <span class="bottom-nav-icon">${item.icon}</span>
      <span class="bottom-nav-label">${item.label}</span>
    </a>`
    )
    .join('');
}

function renderNav(activePage) {
  const root = document.getElementById('cymor-nav-root');
  if (!root) return;

  const user = window.CymorStore.getUser();
  const homeHref = isInPagesDir() ? '../index.html' : 'index.html';

  root.innerHTML = `
    <header class="topbar">
      <a href="${homeHref}" class="brand">
        <span class="brand-mark">CT</span>
        <span class="brand-name">Cymor Tutor</span>
      </a>
      <div class="topbar-actions">
        <span class="user-greeting">${user ? user.name.split(' ')[0] : ''}</span>
        <button class="btn-ghost btn-small" id="cymor-logout-btn">Sign out</button>
      </div>
    </header>
    <nav class="bottom-nav">${bottomNavHtml(activePage)}</nav>
  `;

  const logoutBtn = document.getElementById('cymor-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => window.CymorAuth.logoutUser());
}

function renderBottomNavOnly(activePage) {
  const root = document.getElementById('bottom-nav');
  if (!root) return;
  root.innerHTML = bottomNavHtml(activePage);
}

window.CymorNav = { renderNav, renderBottomNavOnly };
