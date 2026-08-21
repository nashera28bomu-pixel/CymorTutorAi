// Talks to the Cymor Tutor backend. Set window.CYMOR_API_BASE before this
// script loads (see the inline config in each page) or edit the default below.
const API_BASE = window.CYMOR_API_BASE || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('cymor_token');
}

async function apiRequest(path, { method = 'GET', body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
    });
  } catch (err) {
    throw new Error('Could not reach Cymor Tutor. Check your connection and try again.');
  }

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    // no JSON body
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('cymor_token');
      localStorage.removeItem('cymor_user');
      const onHome = location.pathname.endsWith('index.html') || location.pathname === '/';
      if (!onHome) {
        location.href = location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
      }
    }
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  return data;
}

window.CymorAPI = { apiRequest, getToken, API_BASE };
