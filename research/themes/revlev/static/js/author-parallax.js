(function () {
  'use strict';

  var tile = document.querySelector('.author-tile-a');
  if (!tile) return;

  var photo = tile.querySelector('.author-tile-a-photo');
  if (!photo) return;

  var mq = window.matchMedia('(min-width: 641px) and (hover: hover)');
  var max = 6; // percent shift from base position
  var settling;

  function setParallaxX(x) {
    photo.style.setProperty('--parallax-x', x.toFixed(2) + '%');
    photo.style.setProperty('--parallax-y', '0%');
  }

  function reset() {
    if (!mq.matches) return;
    photo.classList.add('is-settling');
    setParallaxX(0);
    window.clearTimeout(settling);
    settling = window.setTimeout(function () {
      photo.classList.remove('is-settling');
    }, 450);
  }

  function onMove(e) {
    if (!mq.matches) return;
    photo.classList.remove('is-settling');
    var r = tile.getBoundingClientRect();
    if (!r.width) return;
    var nx = (e.clientX - r.left) / r.width - 0.5;
    setParallaxX(nx * max * 2);
  }

  function onMqChange() {
    if (!mq.matches) {
      photo.classList.remove('is-settling');
      setParallaxX(0);
    }
  }

  tile.addEventListener('mousemove', onMove);
  tile.addEventListener('mouseleave', reset);
  if (mq.addEventListener) mq.addEventListener('change', onMqChange);
  else if (mq.addListener) mq.addListener(onMqChange);
})();
