async function loginUser(email, password) {
  const data = await window.CymorAPI.apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  window.CymorStore.saveSession(data.token, data.user);
  return data.user;
}

async function quickStartUser(name, educationLevel) {
  const data = await window.CymorAPI.apiRequest('/auth/quick-start', {
    method: 'POST',
    body: { name, educationLevel }
  });
  window.CymorStore.saveSession(data.token, data.user);
  return data.user;
}

async function claimAccount(email, password) {
  const data = await window.CymorAPI.apiRequest('/auth/claim', {
    method: 'POST',
    body: { email, password }
  });
  const user = window.CymorStore.getUser();
  const updated = { ...user, ...data.user };
  localStorage.setItem('cymor_user', JSON.stringify(updated));
  return updated;
}

function logoutUser() {
  window.CymorStore.clearSession();
  location.href = window.CymorStore.homeUrl();
}

window.CymorAuth = { loginUser, quickStartUser, claimAccount, logoutUser };
