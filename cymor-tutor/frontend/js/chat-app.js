// ============================================================
// Cymor Tutor — main chat app (now the home screen)
// ============================================================

/* ---------- Splash screen ---------- */
(function runSplash() {
  const splash = document.getElementById('splash-screen');
  const percentEl = document.getElementById('splash-percent');
  const alreadySeen = sessionStorage.getItem('cymor_splash_seen');

  if (alreadySeen) {
    splash.style.display = 'none';
    return;
  }
  sessionStorage.setItem('cymor_splash_seen', '1');

  let pct = 0;
  const interval = setInterval(() => {
    pct = Math.min(100, pct + Math.ceil(Math.random() * 18));
    percentEl.textContent = `${pct}%`;
    if (pct >= 100) clearInterval(interval);
  }, 140);

  setTimeout(() => {
    splash.style.display = 'none';
  }, 2200);
})();

/* ---------- Boot: decide quick-start vs chat app ---------- */
const qsScreen = document.getElementById('quickstart-screen');
const appShell = document.getElementById('app-shell');

function bootApp() {
  if (!localStorage.getItem('cymor_token')) {
    qsScreen.style.display = 'flex';
    appShell.style.display = 'none';
  } else {
    qsScreen.style.display = 'none';
    appShell.style.display = 'block';
    initChatApp();
  }
}

/* ---------- Quick-start flow ---------- */
let qsName = '';

document.getElementById('qs-name-next').addEventListener('click', () => {
  const input = document.getElementById('qs-name-input');
  const name = input.value.trim();
  const errorBox = document.getElementById('qs-error');
  errorBox.innerHTML = '';

  if (!name) {
    errorBox.innerHTML = `<div class="error-banner">Please enter your name.</div>`;
    return;
  }
  qsName = name;
  document.getElementById('qs-grade-title').textContent = `Nice to meet you, ${name.split(' ')[0]} 👋`;
  document.getElementById('qs-name-step').style.display = 'none';
  document.getElementById('qs-grade-step').style.display = 'block';
});

document.getElementById('qs-grade-step').addEventListener('click', async (e) => {
  const card = e.target.closest('.option-card');
  if (!card) return;
  const errorBox = document.getElementById('qs-error');
  errorBox.innerHTML = '';

  try {
    await window.CymorAuth.quickStartUser(qsName, card.dataset.level);
    bootApp();
  } catch (err) {
    errorBox.innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
});

document.getElementById('qs-name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('qs-name-next').click();
});

/* ---------- Save progress (claim account) ---------- */
document.getElementById('save-progress-cancel').addEventListener('click', () => {
  document.getElementById('save-progress-modal').style.display = 'none';
});
document.getElementById('save-progress-submit').addEventListener('click', async () => {
  const email = document.getElementById('save-email').value.trim();
  const password = document.getElementById('save-password').value;
  const errorBox = document.getElementById('save-progress-error');
  errorBox.innerHTML = '';

  try {
    await window.CymorAuth.claimAccount(email, password);
    document.getElementById('save-progress-modal').style.display = 'none';
  } catch (err) {
    errorBox.innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
});

/* ============================================================
   Chat app (runs once a session exists)
   ============================================================ */
function initChatApp() {
  window.CymorNav.renderBottomNavOnly('chat');

  const WELCOME_MESSAGES = [
    "Ask Cymor anything about what you're studying.",
    "Stuck on a topic? Let's break it down together.",
    "What are we learning today?",
    "Got homework? I'm here to help you actually understand it.",
    "Ask a question and get a real explanation, not just an answer.",
    "Ready when you are — what's on your mind?",
    "Upload your notes or just ask — either way, let's study.",
    "Confused about something in class? Start here.",
    "Let's turn today's lesson into something that actually sticks."
  ];

  function setRandomWelcomeMessage() {
    const msgEl = document.getElementById('empty-state-message');
    if (!msgEl) return;
    const message = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
    msgEl.textContent = message;
    msgEl.classList.remove('empty-state-message-fade');
    // eslint-disable-next-line no-unused-expressions
    void msgEl.offsetWidth; // restart the fade animation
    msgEl.classList.add('empty-state-message-fade');
  }
  setRandomWelcomeMessage();

  const scroll = document.getElementById('chat-scroll');
  const emptyState = document.getElementById('empty-state');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const practiceHint = document.getElementById('practice-hint');

  let conversationId = null;
  let lastAssistantText = '';

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Renders Cymor's structured answer style: callout boxes for the labelled
  // sections, a distinct CTA for the "Try this" practice line, basic
  // markdown (bold/lists/headings), and detects marking mode.
  function renderAssistantContent(rawText) {
    let text = rawText;
    let practiceLine = '';

    const practiceMatch = text.match(/📝 Try this:(.*)$/ms);
    if (practiceMatch) {
      practiceLine = practiceMatch[1].trim();
      text = text.slice(0, practiceMatch.index).trim();
    }

    const calloutDefs = [
      { marker: '🧠 Think of it this way', cls: 'callout-think' },
      { marker: '🌱 Example', cls: 'callout-example' },
      { marker: '🔑 Remember', cls: 'callout-remember' }
    ];

    // Split on callout markers, rendering each section as its own block.
    let html = '';
    let remaining = text;
    const positions = [];
    calloutDefs.forEach((def) => {
      const idx = remaining.indexOf(def.marker);
      if (idx !== -1) positions.push({ ...def, idx });
    });
    positions.sort((a, b) => a.idx - b.idx);

    let cursor = 0;
    const chunks = [];
    positions.forEach((pos, i) => {
      const end = i + 1 < positions.length ? positions[i + 1].idx : remaining.length;
      chunks.push({ marker: pos.marker, cls: pos.cls, content: remaining.slice(pos.idx + pos.marker.length, end).trim() });
    });
    const leadContent = positions.length ? remaining.slice(0, positions[0].idx).trim() : remaining.trim();

    html += renderMarkdownLite(leadContent);
    chunks.forEach((c) => {
      html += `<div class="callout ${c.cls}"><div class="callout-label">${c.marker}</div>${renderMarkdownLite(c.content)}</div>`;
    });

    if (practiceLine) {
      html += `<div class="practice-cta"><strong>📝 Try this</strong>${escapeHtml(practiceLine)}</div>`;
    }

    return { html, hasPractice: Boolean(practiceLine) };
  }

  function renderMarkdownLite(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^[-*] (.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
    html = html.replace(/\n{2,}/g, '</p><p>');
    html = html.replace(/\n/g, '<br/>');
    return `<p>${html}</p>`;
  }

  function addUserBubble(content) {
    emptyState.style.display = 'none';
    const bubble = document.createElement('div');
    bubble.className = 'bubble user';
    bubble.textContent = content;
    scroll.appendChild(bubble);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  function addStreamingAssistantBubble() {
    emptyState.style.display = 'none';
    const bubble = document.createElement('div');
    bubble.className = 'bubble assistant';
    bubble.innerHTML = `<span class="thinking-orb"><span class="thinking-orb-dot"></span><span class="thinking-label">Cymor is thinking...</span></span>`;
    scroll.appendChild(bubble);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    return bubble;
  }

  function finalizeAssistantBubble(bubbleEl, rawText, meta) {
    const { html, hasPractice } = renderAssistantContent(rawText);
    bubbleEl.innerHTML = html;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'bubble-copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(rawText).then(() => {
        copyBtn.textContent = 'Copied';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 1500);
      });
    });
    bubbleEl.appendChild(copyBtn);

    if (meta && meta.curriculumTags && meta.curriculumTags.length) {
      const tagRow = document.createElement('div');
      tagRow.className = 'curriculum-tag-row';
      meta.curriculumTags.forEach((tag) => {
        const chip = document.createElement('span');
        chip.className = 'curriculum-tag';
        chip.textContent = `📘 ${tag.subject}${tag.grade ? ' · ' + tag.grade : ''}`;
        chip.addEventListener('click', () => {
          input.value = `Tell me more about ${tag.subject}`;
          input.focus();
        });
        tagRow.appendChild(chip);
      });
      if (meta.relatedNote) {
        const noteChip = document.createElement('span');
        noteChip.className = 'curriculum-tag related-note-tag';
        noteChip.textContent = `📄 You have notes on this →`;
        noteChip.addEventListener('click', () => {
          sessionStorage.setItem('cymor_open_doc', meta.relatedNote.id);
          location.href = 'pages/notes.html';
        });
        tagRow.appendChild(noteChip);
      }
      bubbleEl.appendChild(tagRow);
    }

    practiceHint.style.display = hasPractice ? 'block' : 'none';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  // Manual SSE parsing over a fetch ReadableStream - fetch doesn't support
  // EventSource for POST requests with auth headers, so we parse it ourselves.
  async function streamChat(message) {
    const token = window.CymorAPI.getToken();
    const response = await fetch(`${window.CymorAPI.API_BASE}/tutor/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ message, conversationId })
    });

    if (!response.ok || !response.body) {
      let data = {};
      try {
        data = await response.json();
      } catch (e) {}
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let rawText = '';
    let meta = {};
    const bubble = document.querySelector('.bubble.assistant.streaming');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop();

      for (const evt of events) {
        const lines = evt.split('\n');
        let eventName = 'message';
        let dataStr = '';
        lines.forEach((line) => {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          if (line.startsWith('data:')) dataStr = line.slice(5).trim();
        });
        if (!dataStr) continue;

        let data;
        try {
          data = JSON.parse(dataStr);
        } catch (e) {
          continue;
        }

        if (eventName === 'meta') {
          conversationId = data.conversationId;
        } else if (eventName === 'chunk') {
          rawText += data.text;
          if (bubble) {
            bubble.innerHTML = `${renderMarkdownLite(rawText)}<span class="streaming-cursor"></span>`;
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }
        } else if (eventName === 'done') {
          meta = data;
        } else if (eventName === 'error') {
          throw new Error(data.error);
        }
      }
    }

    return { rawText, meta };
  }

  async function sendMessage(text) {
    addUserBubble(text);
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    const bubble = addStreamingAssistantBubble();
    bubble.classList.add('streaming');

    try {
      const { rawText, meta } = await streamChat(text);
      bubble.classList.remove('streaming');
      lastAssistantText = rawText;
      finalizeAssistantBubble(bubble, rawText, meta);
      loadSidebarConversations();
    } catch (err) {
      bubble.classList.remove('streaming');
      bubble.innerHTML = `Sorry, I ran into a problem: ${escapeHtml(err.message)}`;
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

  /* ---------- Sidebar: conversation history ---------- */
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
    loadSidebarConversations();
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  }
  document.getElementById('sidebar-open').addEventListener('click', openSidebar);
  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  async function loadSidebarConversations() {
    const list = document.getElementById('sidebar-list');
    try {
      const data = await window.CymorAPI.apiRequest('/tutor/conversations');
      if (!data.conversations.length) {
        list.innerHTML = `<p class="muted" style="font-size:12.5px; padding:8px;">No chats yet.</p>`;
        return;
      }
      list.innerHTML = data.conversations
        .map(
          (c) => `
        <div class="sidebar-item ${c._id === conversationId ? 'active' : ''}" data-id="${c._id}">
          <span class="sidebar-item-title">${escapeHtml(c.title || 'New conversation')}</span>
          <button class="sidebar-item-delete" data-delete-id="${c._id}">✕</button>
        </div>`
        )
        .join('');
    } catch (err) {
      list.innerHTML = `<p class="muted" style="font-size:12.5px; padding:8px;">Could not load chats.</p>`;
    }
  }

  document.getElementById('sidebar-list').addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('[data-delete-id]');
    if (deleteBtn) {
      e.stopPropagation();
      const id = deleteBtn.dataset.deleteId;
      try {
        await window.CymorAPI.apiRequest(`/tutor/conversations/${id}`, { method: 'DELETE' });
        if (id === conversationId) startNewChat();
        loadSidebarConversations();
      } catch (err) {
        alert(err.message);
      }
      return;
    }

    const item = e.target.closest('.sidebar-item');
    if (!item) return;
    await openConversation(item.dataset.id);
    closeSidebar();
  });

  async function openConversation(id) {
    try {
      const data = await window.CymorAPI.apiRequest(`/tutor/conversations/${id}`);
      conversationId = data.conversation._id;
      scroll.innerHTML = '';
      emptyState.style.display = data.messages.length ? 'none' : 'block';
      practiceHint.style.display = 'none';

      data.messages.forEach((m) => {
        if (m.role === 'user') {
          addUserBubble(m.content);
        } else {
          const bubble = document.createElement('div');
          bubble.className = 'bubble assistant';
          scroll.appendChild(bubble);
          finalizeAssistantBubble(bubble, m.content, {});
        }
      });
      window.scrollTo({ top: document.body.scrollHeight });
    } catch (err) {
      alert(err.message);
    }
  }

  function startNewChat() {
    conversationId = null;
    scroll.innerHTML = '';
    emptyState.style.display = 'block';
    practiceHint.style.display = 'none';
    setRandomWelcomeMessage();
  }

  document.getElementById('sidebar-new-chat').addEventListener('click', () => {
    startNewChat();
    closeSidebar();
  });

  document.getElementById('save-progress-link').addEventListener('click', () => {
    closeSidebar();
    document.getElementById('save-progress-modal').style.display = 'flex';
  });

  document.getElementById('sidebar-signout').addEventListener('click', () => {
    window.CymorAuth.logoutUser();
  });

  loadSidebarConversations();
}

bootApp();
