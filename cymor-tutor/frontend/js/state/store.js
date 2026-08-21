// Minimal client-side state helper backed by localStorage.
function saveSession(token, user) {
  localStorage.setItem('cymor_token', token);
  localStorage.setItem('cymor_user', JSON.stringify(user));
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('cymor_user'));
  } catch (e) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('cymor_token');
  localStorage.removeItem('cymor_user');
}

function homeUrl() {
  return location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}

function requireAuth() {
  if (!localStorage.getItem('cymor_token')) {
    location.href = homeUrl();
    return false;
  }
  return true;
}

window.CymorStore = { saveSession, getUser, clearSession, requireAuth, homeUrl };
