if (!window.CymorStore.requireAuth()) { /* redirected */ }
window.CymorNav.renderNav('chat');

const setupView = document.getElementById('setup-view');
const quizView = document.getElementById('quiz-view');
const resultView = document.getElementById('result-view');

let quizId = null;
let questions = [];
let currentIndex = 0;
let selectedOption = null;
let answers = [];

const documentId = sessionStorage.getItem('cymor_quiz_documentId');
if (documentId) sessionStorage.removeItem('cymor_quiz_documentId');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('generate-btn').addEventListener('click', async () => {
  const errorBox = document.getElementById('setup-error');
  errorBox.innerHTML = '';
  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.textContent = 'Building your quiz…';

  try {
    const body = {
      subject: document.getElementById('subject-input').value.trim(),
      topic: document.getElementById('topic-input').value.trim(),
      difficulty: document.getElementById('difficulty-input').value,
      numQuestions: Number(document.getElementById('num-input').value)
    };
    if (documentId) body.documentId = documentId;

    const data = await window.CymorAPI.apiRequest('/quizzes/generate', { method: 'POST', body });
    quizId = data.quizId;
    questions = data.questions;
    currentIndex = 0;
    answers = [];

    setupView.style.display = 'none';
    quizView.style.display = 'block';
    renderQuestion();
  } catch (err) {
    errorBox.innerHTML = `<div class="error-banner">${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate quiz';
  }
});

function renderQuestion() {
  selectedOption = null;
  const q = questions[currentIndex];
  document.getElementById('progress-fill').style.width = `${(currentIndex / questions.length) * 100}%`;
  document.getElementById('question-label').textContent = `Question ${currentIndex + 1} / ${questions.length}`;
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('quiz-explain').style.display = 'none';

  const container = document.getElementById('options-container');
  container.innerHTML = q.options
    .map((opt, i) => `<button class="quiz-option" data-index="${i}">${escapeHtml(opt)}</button>`)
    .join('');

  const nextBtn = document.getElementById('next-btn');
  nextBtn.disabled = true;
  nextBtn.textContent = 'Submit answer';
  nextBtn.dataset.state = 'select';
}

document.getElementById('options-container').addEventListener('click', (e) => {
  const btn = e.target.closest('.quiz-option');
  if (!btn || document.getElementById('next-btn').dataset.state === 'next') return;
  document.querySelectorAll('.quiz-option').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedOption = Number(btn.dataset.index);
  document.getElementById('next-btn').disabled = false;
});

document.getElementById('next-btn').addEventListener('click', () => {
  const btn = document.getElementById('next-btn');
  if (btn.dataset.state === 'select') {
    answers[currentIndex] = selectedOption;
    btn.dataset.state = 'next';
    btn.textContent = currentIndex === questions.length - 1 ? 'See results' : 'Next question';

    document.querySelectorAll('.quiz-option').forEach((b) => (b.style.pointerEvents = 'none'));
  } else {
    currentIndex += 1;
    if (currentIndex >= questions.length) {
      submitQuiz();
    } else {
      renderQuestion();
      document.querySelectorAll('.quiz-option').forEach((b) => (b.style.pointerEvents = 'auto'));
    }
  }
});

async function submitQuiz() {
  try {
    const data = await window.CymorAPI.apiRequest(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: { answers }
    });

    quizView.style.display = 'none';
    resultView.style.display = 'block';
    document.getElementById('score-display').textContent = `${data.score} / ${data.total}`;

    document.getElementById('review-list').innerHTML = data.results
      .map(
        (r, i) => `
      <div class="card" style="margin-bottom:10px;">
        <strong>${i + 1}. ${escapeHtml(r.question)}</strong>
        <p style="color:${r.correct ? 'var(--success)' : 'var(--coral)'}; font-weight:600; margin:6px 0 2px;">
          ${r.correct ? '✅ Correct' : '❌ Not quite — correct answer: ' + escapeHtml(questions[i].options[r.correctIndex])}
        </p>
        <p class="muted" style="font-size:13px;">${escapeHtml(r.explanation)}</p>
      </div>`
      )
      .join('');
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('retry-btn').addEventListener('click', () => {
  resultView.style.display = 'none';
  setupView.style.display = 'block';
});
