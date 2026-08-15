if (!window.CymorStore.requireAuth()) { /* redirected */ }
window.CymorNav.renderNav('dashboard');

const user = window.CymorStore.getUser();
document.getElementById('greeting').textContent = `Hello, ${user?.name?.split(' ')[0] || 'Student'} 👋`;

document.getElementById('ask-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const question = document.getElementById('ask-input').value.trim();
  if (!question) return;
  sessionStorage.setItem('cymor_prefill_question', question);
  location.href = 'chat.html';
});

async function loadProgress() {
  try {
    const data = await window.CymorAPI.apiRequest('/progress');
    const grid = document.getElementById('stat-grid');
    grid.innerHTML = `
      <div class="stat-card"><div class="stat-value">${data.quizAttemptsCount}</div><div class="stat-label">Quizzes taken</div></div>
      <div class="stat-card"><div class="stat-value">${data.averageScorePercent !== null ? data.averageScorePercent + '%' : '—'}</div><div class="stat-label">Avg. score</div></div>
      <div class="stat-card"><div class="stat-value">${data.documentsCount}</div><div class="stat-label">Notes uploaded</div></div>
      <div class="stat-card"><div class="stat-value">${data.flashcardsCount}</div><div class="stat-label">Flashcards made</div></div>
    `;
  } catch (err) {
    // Silent fail on dashboard stats - not critical to the page's function.
  }
}
loadProgress();
