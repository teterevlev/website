(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.getElementById('site-header');
  var burger = document.getElementById('header-burger');
  var themeBtn = document.getElementById('theme-toggle');
  var themeMeta = document.getElementById('theme-color-meta');
  var overlay = document.getElementById('demo-overlay');
  var frame = document.getElementById('demo-frame');
  var overlayTitle = document.getElementById('demo-overlay-title');
  var closeBtn = document.getElementById('demo-overlay-close');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    if (themeMeta) themeMeta.content = theme === 'dark' ? '#14171c' : '#FFFFFF';
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      themeBtn.setAttribute('title', theme === 'dark' ? 'Light theme' : 'Dark theme');
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
    applyTheme(currentTheme());
  }

  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function (e) {
      try {
        if (localStorage.getItem('theme')) return;
      } catch (err) { return; }
      applyTheme(e.matches ? 'dark' : 'light');
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) {}

  function headerOffset() {
    return header ? header.offsetHeight : 0;
  }

  function closeNav() {
    if (!header || !burger) return;
    header.classList.remove('nav-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
  }

  if (burger && header) {
    burger.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    header.querySelectorAll('.header-nav a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

  function scrollToId(id, instant) {
    var el = document.getElementById(id);
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.pageYOffset - headerOffset() - 8;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: instant || reduced ? 'auto' : 'smooth'
    });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  }

  document.querySelectorAll('[data-scroll-to]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeNav();
      scrollToId(btn.getAttribute('data-scroll-to'));
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href').slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      closeNav();
      scrollToId(id);
    });
  });

  function openDemo(src, title) {
    if (!overlay || !frame) return;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    document.body.classList.add('demo-open');
    overlayTitle.textContent = title || 'Demo';
    frame.src = src;
    closeBtn.focus();
  }

  function closeDemo() {
    if (!overlay || !frame) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('demo-open');
    frame.src = 'about:blank';
    window.setTimeout(function () {
      if (!overlay.classList.contains('is-open')) overlay.hidden = true;
    }, 250);
  }

  document.querySelectorAll('[data-demo-src]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openDemo(btn.getAttribute('data-demo-src'), btn.getAttribute('data-demo-title'));
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDemo);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) closeDemo();
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var hash = location.hash.replace(/^#/, '');
  if (hash && document.getElementById(hash)) {
    window.requestAnimationFrame(function () { scrollToId(hash, true); });
  }

  window.addEventListener('hashchange', function () {
    var id = location.hash.replace(/^#/, '');
    if (id && document.getElementById(id)) scrollToId(id);
  });
})();
