if (!window.CymorStore.requireAuth()) { /* redirected */ }
window.CymorNav.renderNav('chat');

let conversationId = null;
const scroll = document.getElementById('chat-scroll');
const emptyState = document.getElementById('empty-state');
const input = document.getElementById('chat-input');
const sendBtn = document.getElementById('chat-send-btn');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Very small markdown-ish renderer: bold, headings, lists — enough for
// Cymor's structured answers without pulling in a full markdown library.
function renderMarkdownLite(text) {
  let html = escapeHtml(text);
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = html.replace(/\n/g, '<br/>');
  return `<p>${html}</p>`;
}

function addBubble(role, content) {
  emptyState.style.display = 'none';
  const bubble = document.createElement('div');
  bubble.className = `bubble ${role}`;
  bubble.innerHTML = role === 'assistant' ? renderMarkdownLite(content) : escapeHtml(content);
  scroll.appendChild(bubble);
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  return bubble;
}

function addThinkingBubble() {
  emptyState.style.display = 'none';
  const bubble = document.createElement('div');
  bubble.className = 'bubble assistant';
  bubble.innerHTML = `<span class="thinking-dots"><span></span><span></span><span></span></span> Cymor is thinking...`;
  scroll.appendChild(bubble);
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  return bubble;
}

async function sendMessage(text) {
  addBubble('user', text);
  input.value = '';
  const thinking = addThinkingBubble();
  sendBtn.disabled = true;

  try {
    const data = await window.CymorAPI.apiRequest('/tutor/chat', {
      method: 'POST',
      body: { message: text, conversationId }
    });
    conversationId = data.conversationId;
    thinking.remove();
    addBubble('assistant', data.reply);
  } catch (err) {
    thinking.remove();
    addBubble('assistant', `Sorry, I ran into a problem: ${err.message}`);
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', () => {
  const text = input.value.trim();
  if (text) sendMessage(text);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = input.value.trim();
    if (text) sendMessage(text);
  }
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 100) + 'px';
});

const prefill = sessionStorage.getItem('cymor_prefill_question');
if (prefill) {
  sessionStorage.removeItem('cymor_prefill_question');
  sendMessage(prefill);
}
