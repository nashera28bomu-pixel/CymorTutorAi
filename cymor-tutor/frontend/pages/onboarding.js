if (!window.CymorStore.requireAuth()) { /* redirected */ }

const SUBJECTS_BY_LEVEL = {
  'Lower Primary': ['Mathematics', 'English', 'Kiswahili', 'Environmental Activities'],
  'Upper Primary': ['Mathematics', 'English', 'Kiswahili', 'Science and Technology', 'Social Studies'],
  'Junior School': ['Integrated Science', 'Mathematics', 'English', 'Kiswahili', 'Pre-Technical Studies'],
  'Senior School': ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'English', 'Business Studies']
};

let selectedLevel = null;
let selectedSubjects = new Set();

const levelStep = document.getElementById('level-step');
const subjectStep = document.getElementById('subject-step');
const stepTitle = document.getElementById('step-title');
const stepSubtitle = document.getElementById('step-subtitle');
const errorBox = document.getElementById('error-box');

document.getElementById('level-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.option-card');
  if (!card) return;
  selectedLevel = card.dataset.level;

  stepTitle.textContent = 'Which subjects are you studying?';
  stepSubtitle.textContent = 'Pick as many as apply — you can change this later.';

  const subjectGrid = document.getElementById('subject-grid');
  subjectGrid.innerHTML = SUBJECTS_BY_LEVEL[selectedLevel]
    .map((s) => `<div class="option-card" data-subject="${s}">${s}</div>`)
    .join('');

  levelStep.style.display = 'none';
  subjectStep.style.display = 'block';
});

document.getElementById('subject-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.option-card');
  if (!card) return;
  const subject = card.dataset.subject;
  if (selectedSubjects.has(subject)) {
    selectedSubjects.delete(subject);
    card.classList.remove('selected');
  } else {
    selectedSubjects.add(subject);
    card.classList.add('selected');
  }
});

document.getElementById('finish-btn').addEventListener('click', async () => {
  errorBox.innerHTML = '';
  try {
    const data = await window.CymorAPI.apiRequest('/auth/onboarding', {
      method: 'POST',
      body: { educationLevel: selectedLevel, subjects: Array.from(selectedSubjects) }
    });
    localStorage.setItem('cymor_user', JSON.stringify(data.user));
    location.href = 'dashboard.html';
  } catch (err) {
    errorBox.innerHTML = `<div class="error-banner">${err.message}</div>`;
  }
});
