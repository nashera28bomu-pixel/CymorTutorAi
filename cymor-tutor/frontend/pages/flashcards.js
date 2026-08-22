if (!window.CymorStore.requireAuth()) { /* redirected */ }
window.CymorNav.renderNav('quiz');

let cards = [];
let index = 0;
let flipped = false;

const documentId = sessionStorage.getItem('cymor_flashcard_documentId');
if (documentId) sessionStorage.removeItem('cymor_flashcard_documentId');

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
  btn.textContent = 'Preparing your cards…';

  try {
    const body = {
      subject: document.getElementById('subject-input').value.trim(),
      topic: document.getElementById('topic-input').value.trim(),
      numCards: Number(document.getElementById('num-input').value)
    };
    if (documentId) body.documentId = documentId;

    const data = await window.CymorAPI.apiRequest('/flashcards/generate', { method: 'POST', body, timeoutMs: 55000 });
    cards = data.flashcards;
    index = 0;
    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('cards-view').style.display = 'block';
    renderCard();
  } catch (err) {
    errorBox.innerHTML = `<div class="error-banner">${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate flashcards';
  }
});

function renderCard() {
  flipped = false;
  const el = document.getElementById('flashcard');
  el.classList.remove('flipped');
  document.getElementById('card-front').textContent = cards[index].front;
  document.getElementById('card-back').textContent = cards[index].back;
  document.getElementById('card-counter').textContent = `${index + 1} / ${cards.length}`;
}

document.getElementById('flashcard').addEventListener('click', () => {
  flipped = !flipped;
  document.getElementById('flashcard').classList.toggle('flipped', flipped);
});

document.getElementById('prev-btn').addEventListener('click', () => {
  index = (index - 1 + cards.length) % cards.length;
  renderCard();
});
document.getElementById('next-btn').addEventListener('click', () => {
  index = (index + 1) % cards.length;
  renderCard();
});
document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('cards-view').style.display = 'none';
  document.getElementById('setup-view').style.display = 'block';
});
