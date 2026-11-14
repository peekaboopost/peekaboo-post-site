// Tap-to-peek envelope demo
const envelope = document.getElementById('envelope');
const peekButton = document.getElementById('peek-button');

if (envelope && peekButton) {
  peekButton.addEventListener('click', () => {
    const open = envelope.classList.toggle('is-open');
    peekButton.setAttribute('aria-expanded', String(open));
    peekButton.textContent = open ? 'Close it again' : 'Tap to peek';
  });
}

// Early-access signup
const form = document.getElementById('signup-form');
const message = document.getElementById('form-message');

function showMessage(text, kind) {
  message.textContent = text;
  message.classList.remove('is-error', 'is-success');
  if (kind) message.classList.add('is-' + kind);
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.email.value.trim();
    const website = form.website.value;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('Please enter a valid email address.', 'error');
      form.email.focus();
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    showMessage('Saving your spot…');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        showMessage('You’re signed up! Watch your inbox for party ideas &amp; deals. 🎉', 'success');
        form.reset();
      } else {
        showMessage(data.error || 'Something went wrong. Please try again.', 'error');
      }
    } catch (err) {
      showMessage('We couldn’t reach the server. Please try again in a moment.', 'error');
    } finally {
      button.disabled = false;
    }
  });
}
