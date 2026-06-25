/**
 * ENTRANCE — Orchestrated content reveal
 *
 * Adds a subtle parallax-like depth shift to the hero title
 * on scroll, and ensures smooth focus states for accessibility.
 * All heavy entrance work is in CSS keyframes — this file
 * only handles interactive enhancements.
 */

(function () {
  'use strict';

  /* ---- Subtle title parallax on scroll ---- */
  const hero = document.getElementById('hero-title');
  if (!hero) return;

  let ticking = false;

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        const scrollY = window.scrollY;
        const offset = scrollY * 0.15;
        const opacity = Math.max(0, 1 - scrollY / 600);
        hero.style.transform = 'translateY(' + offset + 'px)';
        hero.style.opacity = opacity;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  /* ---- Button press micro-animation ---- */
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('mousedown', function () {
      btn.style.transform = 'translateY(0px) scale(0.98)';
    });
    btn.addEventListener('mouseup', function () {
      btn.style.transform = '';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = '';
    });
  });
})();
