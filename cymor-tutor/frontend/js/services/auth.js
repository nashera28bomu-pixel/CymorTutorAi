async function loginUser(email, password) {
  const data = await window.CymorAPI.apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  window.CymorStore.saveSession(data.token, data.user);
  return data.user;
}

async function registerUser(name, email, password) {
  const data = await window.CymorAPI.apiRequest('/auth/register', {
    method: 'POST',
    body: { name, email, password }
  });
  window.CymorStore.saveSession(data.token, data.user);
  return data.user;
}

function logoutUser() {
  window.CymorStore.clearSession();
  location.href = 'login.html';
}

window.CymorAuth = { loginUser, registerUser, logoutUser };
