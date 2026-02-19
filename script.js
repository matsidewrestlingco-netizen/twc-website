/* ============================================================
   Tiger Wrestling Club — script.js
   ============================================================ */

// ---- Sticky nav shadow on scroll ----
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ---- Mobile nav toggle ----
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});

// ---- Toast notification helper ----
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ---- Sign-up form ----
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // In production: send to your form handler / email service
    showToast('Inquiry submitted! We\'ll be in touch within 24–48 hours.');
    signupForm.reset();
  });
}

// ---- Contact form ----
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // In production: send to your form handler / email service
    showToast('Message sent! We\'ll get back to you soon.');
    contactForm.reset();
  });
}

// ---- Scroll-reveal animation ----
const revealElements = document.querySelectorAll(
  '.schedule-card, .sponsor-card, .highlight, .step, .contact-item'
);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`;
    observer.observe(el);
  });
}

document.addEventListener('animationend', (e) => {
  if (e.target.classList.contains('revealed')) {
    e.target.style.opacity = '';
    e.target.style.transform = '';
  }
});

// Inject the .revealed class styles dynamically so they work with the inline transitions
const style = document.createElement('style');
style.textContent = `.revealed { opacity: 1 !important; transform: none !important; }`;
document.head.appendChild(style);
