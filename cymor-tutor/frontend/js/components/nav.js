// Injects the shared top bar + mobile bottom navigation into any page that
// includes a <div id="cymor-nav-root"></div>.
function renderNav(activePage) {
  const root = document.getElementById('cymor-nav-root');
  if (!root) return;

  const user = window.CymorStore.getUser();

  const items = [
    { key: 'dashboard', href: 'dashboard.html', icon: '🏠', label: 'Home' },
    { key: 'chat', href: 'chat.html', icon: '🤖', label: 'Tutor' },
    { key: 'notes', href: 'notes.html', icon: '📄', label: 'Notes' },
    { key: 'progress', href: 'progress.html', icon: '📊', label: 'Progress' }
  ];

  root.innerHTML = `
    <header class="topbar">
      <a href="dashboard.html" class="brand">
        <span class="brand-mark">CT</span>
        <span class="brand-name">Cymor Tutor</span>
      </a>
      <div class="topbar-actions">
        <span class="user-greeting">${user ? user.name.split(' ')[0] : ''}</span>
        <button class="btn-ghost btn-small" id="cymor-logout-btn">Sign out</button>
      </div>
    </header>
    <nav class="bottom-nav">
      ${items
        .map(
          (item) => `
        <a href="${item.href}" class="bottom-nav-item ${activePage === item.key ? 'active' : ''}">
          <span class="bottom-nav-icon">${item.icon}</span>
          <span class="bottom-nav-label">${item.label}</span>
        </a>`
        )
        .join('')}
    </nav>
  `;

  const logoutBtn = document.getElementById('cymor-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => window.CymorAuth.logoutUser());
}

window.CymorNav = { renderNav };
