if (!window.CymorStore.requireAuth()) { /* redirected */ }
window.CymorNav.renderNav('progress');

async function loadProgress() {
  try {
    const data = await window.CymorAPI.apiRequest('/progress');

    document.getElementById('stat-grid').innerHTML = `
      <div class="stat-card"><div class="stat-value">${data.quizAttemptsCount}</div><div class="stat-label">Quizzes taken</div></div>
      <div class="stat-card"><div class="stat-value">${data.averageScorePercent !== null ? data.averageScorePercent + '%' : '—'}</div><div class="stat-label">Avg. score</div></div>
      <div class="stat-card"><div class="stat-value">${data.documentsCount}</div><div class="stat-label">Notes uploaded</div></div>
      <div class="stat-card"><div class="stat-value">${data.flashcardsCount}</div><div class="stat-label">Flashcards made</div></div>
    `;

    const history = document.getElementById('quiz-history');
    if (!data.recentQuizAttempts.length) {
      history.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📝</div><p>No quizzes taken yet.</p></div>`;
      return;
    }
    history.innerHTML = data.recentQuizAttempts
      .map(
        (a) => `
      <div class="card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
        <span class="muted" style="font-size:13px;">${new Date(a.createdAt).toLocaleDateString()}</span>
        <strong>${a.score} / ${a.total}</strong>
      </div>`
      )
      .join('');
  } catch (err) {
    document.getElementById('stat-grid').innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
}
loadProgress();
