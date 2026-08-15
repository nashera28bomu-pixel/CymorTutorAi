if (!window.CymorStore.requireAuth()) { /* redirected */ }
window.CymorNav.renderNav('notes');

const listView = document.getElementById('list-view');
const roomView = document.getElementById('room-view');
const docList = document.getElementById('doc-list');
const uploadDrop = document.getElementById('upload-drop');
const fileInput = document.getElementById('file-input');
const uploadError = document.getElementById('upload-error');
const roomOutput = document.getElementById('room-output');
const roomTitle = document.getElementById('room-title');
const askPanel = document.getElementById('ask-panel');

let currentDoc = null;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function renderText(text) {
  return `<div class="card ruled">${escapeHtml(text).replace(/\n/g, '<br/>')}</div>`;
}

async function loadDocs() {
  const data = await window.CymorAPI.apiRequest('/documents');
  if (!data.documents.length) {
    docList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📄</div><p>No notes uploaded yet.</p></div>`;
    return;
  }
  docList.innerHTML = data.documents
    .map(
      (d) => `
    <div class="doc-item" data-id="${d._id}" data-status="${d.status}">
      <div class="doc-icon">📄</div>
      <div class="doc-meta">
        <div class="doc-title">${escapeHtml(d.filename)}</div>
        <div class="doc-status ${d.status}">${d.status === 'ready' ? 'Ready' : d.status === 'processing' ? 'Processing…' : 'Failed: ' + escapeHtml(d.failureReason || '')}</div>
      </div>
    </div>`
    )
    .join('');
}

uploadDrop.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  uploadError.innerHTML = '';
  uploadDrop.innerHTML = `<p>Reading your notes…</p>`;

  try {
    const formData = new FormData();
    formData.append('file', file);
    await window.CymorAPI.apiRequest('/documents/upload', { method: 'POST', body: formData, isFormData: true });
    await loadDocs();
  } catch (err) {
    uploadError.innerHTML = `<div class="error-banner">${err.message}</div>`;
  } finally {
    uploadDrop.innerHTML = `<div style="font-size:28px;">📤</div><p><strong>Tap to upload</strong><br/>PDF or TXT, up to 15MB</p>`;
    fileInput.value = '';
  }
});

docList.addEventListener('click', (e) => {
  const item = e.target.closest('.doc-item');
  if (!item || item.dataset.status !== 'ready') return;
  openRoom(item.dataset.id, item.querySelector('.doc-title').textContent);
});

function openRoom(id, filename) {
  currentDoc = id;
  roomTitle.textContent = filename;
  roomOutput.innerHTML = '';
  askPanel.style.display = 'none';
  document.getElementById('doc-chat-scroll').innerHTML = '';
  listView.style.display = 'none';
  roomView.style.display = 'block';
}

document.getElementById('back-btn').addEventListener('click', () => {
  roomView.style.display = 'none';
  listView.style.display = 'block';
  loadDocs();
});

document.querySelectorAll('.study-action-btn').forEach((btn) => {
  btn.addEventListener('click', () => handleAction(btn.dataset.action));
});

async function handleAction(action) {
  askPanel.style.display = action === 'ask' ? 'block' : 'none';
  if (action === 'ask') return;

  roomOutput.innerHTML = `<p class="muted">Organizing the material…</p>`;

  try {
    if (action === 'summarize') {
      const data = await window.CymorAPI.apiRequest(`/documents/${currentDoc}/summarize`, { method: 'POST' });
      roomOutput.innerHTML = renderText(data.summary);
    } else if (action === 'quiz') {
      sessionStorage.setItem('cymor_quiz_documentId', currentDoc);
      location.href = 'quiz.html';
    } else if (action === 'flashcards') {
      sessionStorage.setItem('cymor_flashcard_documentId', currentDoc);
      location.href = 'flashcards.html';
    }
  } catch (err) {
    roomOutput.innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
}

document.getElementById('doc-ask-btn').addEventListener('click', async () => {
  const input = document.getElementById('doc-ask-input');
  const question = input.value.trim();
  if (!question) return;
  const scroll = document.getElementById('doc-chat-scroll');

  scroll.insertAdjacentHTML('beforeend', `<div class="bubble user">${escapeHtml(question)}</div>`);
  input.value = '';
  scroll.insertAdjacentHTML('beforeend', `<div class="bubble assistant" id="doc-thinking"><span class="thinking-dots"><span></span><span></span><span></span></span> Cymor is checking your notes...</div>`);

  try {
    const data = await window.CymorAPI.apiRequest(`/documents/${currentDoc}/ask`, {
      method: 'POST',
      body: { question }
    });
    document.getElementById('doc-thinking').outerHTML = `<div class="bubble assistant">${escapeHtml(data.reply).replace(/\n/g, '<br/>')}</div>`;
  } catch (err) {
    document.getElementById('doc-thinking').outerHTML = `<div class="bubble assistant">Sorry: ${escapeHtml(err.message)}</div>`;
  }
});

loadDocs();
