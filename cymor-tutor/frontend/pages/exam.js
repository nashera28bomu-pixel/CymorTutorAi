if (!window.CymorStore.requireAuth()) { /* redirected */ }
window.CymorNav.renderNav('quiz');

const documentId = sessionStorage.getItem('cymor_exam_documentId');
if (documentId) sessionStorage.removeItem('cymor_exam_documentId');

document.getElementById('generate-exam-btn').addEventListener('click', async () => {
  const errorBox = document.getElementById('exam-error');
  errorBox.innerHTML = '';
  const btn = document.getElementById('generate-exam-btn');

  const subject = document.getElementById('subject-input').value.trim();
  const topic = document.getElementById('topic-input').value.trim();

  if (!topic && !documentId) {
    errorBox.innerHTML = `<div class="error-banner">Please enter a topic.</div>`;
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Building your assessment… this can take a bit longer than usual';

  try {
    const body = {
      subject,
      topic,
      numMcq: Number(document.getElementById('num-mcq-input').value),
      numShort: Number(document.getElementById('num-short-input').value),
      includeEssay: document.getElementById('include-essay-input').checked
    };
    if (documentId) body.documentId = documentId;

    // Not using the shared apiRequest helper here since we need the raw PDF
    // blob rather than a parsed JSON response.
    const token = window.CymorAPI.getToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let response;
    try {
      response = await fetch(`${window.CymorAPI.API_BASE}/exams/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      let data = {};
      try {
        data = await response.json();
      } catch (e) {}
      throw new Error(data.error || 'Could not generate the assessment. Please try again.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Cymor-Tutor-Assessment.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    const message =
      err.name === 'AbortError'
        ? "This is taking longer than expected. Assessment papers take more work to generate than a normal chat reply — please try again."
        : err.message;
    errorBox.innerHTML = `<div class="error-banner">${message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate PDF assessment';
  }
});
