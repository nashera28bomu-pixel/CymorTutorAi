const form = document.getElementById('register-form');
const errorBox = document.getElementById('error-box');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.innerHTML = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const user = await window.CymorAuth.registerUser(name, email, password);
    location.href = user.onboardingComplete ? 'dashboard.html' : 'onboarding.html';
  } catch (err) {
    errorBox.innerHTML = `<div class="error-banner">${err.message}</div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});
