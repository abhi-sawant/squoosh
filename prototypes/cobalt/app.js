/* Cobalt prototype: shared behaviour. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  /* ---------- Icon sprite (inline SVG, one 2px square-cap family) ---------- */
  var P = {
    mark: 'M3 12h7M7 8l4 4-4 4M21 12h-7M17 8l-4 4 4 4',
    back: 'M20 12H5M11 5l-7 7 7 7',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    rotate: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5',
    copy: 'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4',
    save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
    upload: 'M12 17V5M7 10l5-5 5 5M4 20h16',
    download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
    paste: 'M9 4h6v3H9zM7 5H5v16h14V5h-2',
    close: 'M5 5l14 14M19 5L5 19',
    sbs: 'M3 6h8v12H3zM13 6h8v12h-8z',
    'sbs-arrows': 'M9 7l-5 5 5 5M15 7l5 5-5 5',
    pixel: 'M4 18h4v-4h4v-4h4V6h4',
    checker: 'M4 4h16v16H4zM4 12h8V4M12 20v-8h8',
    spinner: 'M12 3a9 9 0 0 1 9 9',
  };
  var sprite =
    '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">';
  Object.keys(P).forEach(function (k) {
    sprite +=
      '<symbol id="i-' +
      k +
      '" viewBox="0 0 24 24"><path d="' +
      P[k] +
      '"/></symbol>';
  });
  sprite += '</svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.dataset.page;
    wireSlabs();
    if (page === 'intro') intro();
    if (page === 'editor') editor();
    if (page === 'bulk') bulk();
  });

  /* ---------- Helpers ---------- */
  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };
  var $$ = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };
  var clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };

  var snackTimer;
  function snack(msg) {
    var el = $('#snackbar');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(snackTimer);
    snackTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 3200);
  }

  function split(bytes) {
    if (bytes >= 1e6) return [(bytes / 1e6).toFixed(1), 'MB'];
    if (bytes >= 1e3) return [String(Math.round(bytes / 1e3)), 'kB'];
    return [String(Math.round(bytes)), 'B'];
  }
  function fmt(bytes) {
    var s = split(bytes);
    return s[0] + ' ' + s[1];
  }

  /* Width axis: the smaller the output relative to the original, the narrower the type. */
  function widthFor(ratio) {
    return Math.round(50 + 100 * Math.sqrt(clamp(ratio, 0, 1)));
  }

  /* Plausible size model shared by editor and bulk. */
  var ENC = {
    original: { label: 'Original Image', lossy: false, r0: 1 },
    mozjpeg: { label: 'MozJPEG', lossy: true, q0: 75, r0: 0.0764, k: 0.061 },
    webp: { label: 'WebP', lossy: true, q0: 80, r0: 0.0636, k: 0.058 },
    avif: { label: 'AVIF', lossy: true, q0: 50, r0: 0.045, k: 0.05 },
    jxl: { label: 'JPEG XL (beta)', lossy: true, q0: 75, r0: 0.058, k: 0.057 },
    webp2: {
      label: 'WebP v2 (unstable)',
      lossy: true,
      q0: 75,
      r0: 0.052,
      k: 0.055,
    },
    oxipng: { label: 'OxiPNG', lossy: false, r0: 0.62 },
    qoi: { label: 'QOI', lossy: false, r0: 0.95 },
    bpng: { label: 'Browser PNG', lossy: false, r0: 0.82 },
    bjpeg: { label: 'Browser JPEG', lossy: true, q0: 75, r0: 0.095, k: 0.06 },
    bgif: { label: 'Browser GIF', lossy: false, r0: 0.31 },
  };
  function estimate(orig, o) {
    var E = ENC[o.enc];
    if (o.enc === 'original') return orig;
    var r = E.lossy
      ? clamp(E.r0 * Math.exp((o.q - E.q0) * E.k), 0.004, 1.2)
      : E.r0;
    if (o.resize) r *= o.scale * o.scale;
    if (o.palette) r *= 0.35 + 0.65 * (o.colors / 256);
    return Math.max(1200, orig * r);
  }
  function pctText(orig, now) {
    var p = Math.min(99, Math.round((1 - now / orig) * 100));
    return p >= 0 ? p + '% smaller' : Math.abs(p) + '% larger';
  }
  function blurFor(o) {
    if (o.enc === 'original' || !ENC[o.enc].lossy) return 'none';
    var px = Math.pow((100 - o.q) / 100, 2.2) * 1.6;
    return px < 0.15 ? 'none' : 'blur(' + px.toFixed(2) + 'px) contrast(1.04)';
  }

  /* ---------- Shared slab behaviour ---------- */
  function wireSlabs() {
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t.matches && t.matches('input[type="range"]')) {
        var out = t.closest('.field').querySelector('[data-out]');
        if (out) {
          var k = out.dataset.out;
          out.textContent =
            t.value + (k === 'scale' || k === 'dither' ? '%' : '');
        }
      }
    });
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches && t.matches('.slab-h input[type="checkbox"]')) {
        var b = t.closest('.slab').querySelector('.slab-b');
        if (b) b.hidden = !t.checked;
      }
      if (t.matches && t.matches('input[data-k="adv"]')) {
        var scope = t.closest('.slab-b');
        var a = scope && scope.querySelector('[data-adv]');
        if (a) a.hidden = !t.checked;
      }
    });
  }

  /* ---------- Compare component ---------- */
  function initCompare(el) {
    var handle = $('.handle', el);
    var mq = window.matchMedia('(max-width: 720px)');
    var pos = 50;
    var dragging = false;
    function orient() {
      el.dataset.orient = mq.matches ? 'v' : 'h';
      fit();
    }
    function set(p) {
      pos = clamp(p, 0, 100);
      el.style.setProperty('--split', pos + '%');
      handle.setAttribute('aria-valuenow', Math.round(pos));
    }
    function fromEvent(e) {
      var r = el.getBoundingClientRect();
      set(
        el.dataset.orient === 'v'
          ? ((e.clientY - r.top) / r.height) * 100
          : ((e.clientX - r.left) / r.width) * 100,
      );
    }
    el.addEventListener('pointerdown', function (e) {
      if (el.classList.contains('sbs')) return;
      dragging = true;
      el.setPointerCapture(e.pointerId);
      fromEvent(e);
      handle.focus({ preventScroll: true });
    });
    el.addEventListener('pointermove', function (e) {
      if (dragging) fromEvent(e);
    });
    el.addEventListener('pointerup', function () {
      dragging = false;
    });
    el.addEventListener('pointercancel', function () {
      dragging = false;
    });
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        set(pos - step);
        e.preventDefault();
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        set(pos + step);
        e.preventDefault();
      }
      if (e.key === 'Home') {
        set(0);
        e.preventDefault();
      }
      if (e.key === 'End') {
        set(100);
        e.preventDefault();
      }
    });
    var rot = 0,
      zoom = 1;
    function fit() {
      var r = el.getBoundingClientRect();
      var k =
        rot % 180 === 0 || !r.width
          ? 1
          : Math.min(r.width / r.height, r.height / r.width);
      el.style.setProperty('--fit', k);
    }
    window.addEventListener('resize', fit);
    mq.addEventListener
      ? mq.addEventListener('change', orient)
      : mq.addListener(orient);
    orient();
    set(50);
    return {
      setZoom: function (z) {
        zoom = z;
        el.style.setProperty('--z', z);
      },
      rotate: function () {
        rot = (rot + 90) % 360;
        el.style.setProperty('--rot', rot + 'deg');
        fit();
      },
      fit: fit,
    };
  }

  /* =================== INTRO =================== */
  function intro() {
    var poster = $('#drop'),
      file = $('#file'),
      count = 0;
    function route(n) {
      if (!n) return snack('No image found in the clipboard');
      location.href = n === 1 ? 'editor.html' : 'bulk.html?n=' + n;
    }
    function count_(e) {
      var dt = e.dataTransfer;
      return dt && dt.files && dt.files.length
        ? dt.files.length
        : dt && dt.items
        ? dt.items.length
        : 1;
    }
    window.addEventListener('dragenter', function (e) {
      e.preventDefault();
      count++;
      poster.classList.add('dragging');
    });
    window.addEventListener('dragover', function (e) {
      e.preventDefault();
    });
    window.addEventListener('dragleave', function () {
      count = Math.max(0, count - 1);
      if (!count) poster.classList.remove('dragging');
    });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      count = 0;
      poster.classList.remove('dragging');
      route(e.dataTransfer && e.dataTransfer.files.length);
    });
    poster.addEventListener('click', function (e) {
      if (e.target.closest('#paste')) return;
      file.click();
    });
    file.addEventListener('change', function () {
      route(file.files.length);
    });
    var paste = $('#paste');
    if (navigator.clipboard && navigator.clipboard.read) {
      paste.hidden = false;
      paste.addEventListener('click', function (e) {
        e.stopPropagation();
        navigator.clipboard.read().then(
          function (items) {
            var has = items.some(function (it) {
              return it.types.some(function (t) {
                return t.indexOf('image/') === 0;
              });
            });
            has ? route(1) : snack('No image found in the clipboard');
          },
          function () {
            snack('No image found in the clipboard');
          },
        );
      });
    }
    document.addEventListener('paste', function (e) {
      var f = e.clipboardData && e.clipboardData.files;
      f && f.length
        ? route(f.length)
        : snack('No image found in the clipboard');
    });
    $('#install').addEventListener('click', function () {
      snack(
        "Squoosh works offline once installed. Use your browser's install option.",
      );
    });
    if (location.hash === '#dragover') poster.classList.add('dragging');
  }

  /* =================== EDITOR =================== */
  var IMAGES = {
    photo: {
      src: '../assets/photo.jpg',
      name: 'photo.jpg',
      w: 1400,
      h: 541,
      bytes: 2.8e6,
    },
    art: {
      src: '../assets/artwork.jpg',
      name: 'art.jpg',
      w: 1400,
      h: 937,
      bytes: 2.9e6,
    },
    pixel3: {
      src: '../assets/screen.jpg',
      name: 'pixel3.png',
      w: 587,
      h: 1200,
      bytes: 1.6e6,
    },
    svg: {
      src:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f3f5ff"/><path d="M96 256h120M176 192l64 64-64 64M416 256H296M336 192l-64 64 64 64" fill="none" stroke="#2038ff" stroke-width="32" stroke-linecap="square"/></svg>',
        ),
      name: 'squoosh.svg',
      w: 512,
      h: 512,
      bytes: 13e3,
    },
  };

  function editor() {
    var qs = new URLSearchParams(location.search);
    var img = IMAGES[qs.get('img')] || IMAGES.photo;
    var cmp = $('#cmp'),
      api = initCompare(cmp);
    var tpl = $('#side-tpl');
    var wordmark = $('#wordmark');
    var cur = 'right';
    var sides = {
      left: { panel: $('#panel-left'), enc: 'original' },
      right: { panel: $('#panel-right'), enc: 'mozjpeg' },
    };

    ['left', 'right'].forEach(function (s) {
      var p = sides[s].panel;
      p.appendChild(tpl.content.cloneNode(true));
      $$("[id^='__']", p).forEach(function (n) {
        n.id = s + '-' + n.id.slice(2);
      });
      $$("label[for^='__']", p).forEach(function (n) {
        n.htmlFor = s + '-' + n.htmlFor.slice(2);
      });
      $('[data-k="enc"]', p).value = sides[s].enc;
    });

    function setImage() {
      $('#img-l').src = $('#img-r').src = img.src;
      $('#img-l').alt = 'Original ' + img.name;
      $('#img-r').alt = 'Compressed result of ' + img.name;
      $('#filemeta').textContent =
        img.name + ' · ' + img.w + '×' + img.h + ' · ' + fmt(img.bytes);
      document.title = 'Squoosh editor: ' + img.name;
      ['left', 'right'].forEach(function (s) {
        $('[data-k="w"]', sides[s].panel).value = img.w;
        $('[data-k="h"]', sides[s].panel).value = img.h;
      });
    }

    function read(s) {
      var p = sides[s].panel,
        g = function (k) {
          return $('[data-k="' + k + '"]', p);
        };
      return {
        enc: g('enc').value,
        q: +g('q').value,
        resize: g('resize').checked,
        scale: clamp(+g('w').value / img.w || 1, 0.001, 4),
        palette: g('palette').checked,
        colors: +g('colors').value,
      };
    }

    function syncUI(s) {
      var p = sides[s].panel,
        o = read(s),
        E = ENC[o.enc];
      $$('[data-edit]', p).forEach(function (n) {
        n.hidden = o.enc === 'original';
      });
      $('[data-lossy]', p).hidden = !E.lossy;
      $('[data-lossless]', p).hidden = E.lossy || o.enc === 'original';
      $('[data-moz]', p).hidden = o.enc !== 'mozjpeg';
      if (o.enc !== 'mozjpeg') $('[data-adv]', p).hidden = true;
      else $('[data-adv]', p).hidden = !$('[data-k="adv"]', p).checked;
    }

    var timers = {};
    function render(s, immediate) {
      var o = read(s),
        tk = $('#tk-' + s),
        lbl = ENC[o.enc].label;
      var apply = function () {
        var bytes = estimate(img.bytes, o),
          sp = split(bytes),
          ratio = bytes / img.bytes;
        $('.n', tk).textContent = sp[0];
        $('small', tk).textContent = sp[1];
        var pct = $('.pct', tk);
        if (o.enc === 'original') {
          pct.textContent = 'Original';
          pct.className = 'pct none';
        } else {
          pct.textContent = pctText(img.bytes, bytes);
          pct.className = 'pct' + (bytes > img.bytes ? ' err' : '');
        }
        var w = o.enc === 'original' ? 150 : widthFor(ratio);
        $('.fig', tk).style.setProperty('--w', w);
        if (s === cur || true) {
          /* wordmark follows the right side, the result */
        }
        if (s === 'right')
          wordmark.style.setProperty('--w', w + (w < 150 ? 0 : 0));
        tk.removeAttribute('data-loading');
        sides[s].bytes = bytes;
      };
      $('.tl', tk).textContent =
        (s === 'left' ? 'Left: ' : 'Right: ') +
        lbl +
        (ENC[o.enc].lossy ? ' · quality ' + o.q : '');
      $('#tag-' + (s === 'left' ? 'l' : 'r')).textContent =
        lbl + (ENC[o.enc].lossy ? ' ' + o.q : '');
      $('#img-' + (s === 'left' ? 'l' : 'r')).style.filter = blurFor(o);
      var dl = s === 'right' ? $('#dl-right span') : null;
      if (dl) dl.textContent = 'Download ' + lbl;
      clearTimeout(timers[s]);
      if (immediate) apply();
      else {
        tk.setAttribute('data-loading', '');
        timers[s] = setTimeout(apply, 520);
      }
    }

    $('#panels').addEventListener('input', function (e) {
      var panel = e.target.closest('.panel');
      if (!panel) return;
      var s = panel.dataset.side,
        k = e.target.dataset.k;
      if (k === 'w') {
        $('[data-k="h"]', panel).value = Math.round(
          (+e.target.value * img.h) / img.w,
        );
        $('[data-k="preset"]', panel).value = '';
      }
      if (k === 'h') {
        $('[data-k="w"]', panel).value = Math.round(
          (+e.target.value * img.w) / img.h,
        );
        $('[data-k="preset"]', panel).value = '';
      }
      render(s, e.target.type === 'range');
    });
    $('#panels').addEventListener('change', function (e) {
      var panel = e.target.closest('.panel');
      if (!panel) return;
      var s = panel.dataset.side,
        k = e.target.dataset.k;
      if (k === 'enc') {
        var E = ENC[e.target.value];
        if (E.lossy) {
          var q = $('[data-k="q"]', panel);
          q.value = E.q0;
          q.dispatchEvent(new Event('input', { bubbles: true }));
        }
        syncUI(s);
      }
      if (k === 'preset' && e.target.value) {
        $('[data-k="w"]', panel).value = Math.round(
          (img.w * e.target.value) / 100,
        );
        $('[data-k="h"]', panel).value = Math.round(
          (img.h * e.target.value) / 100,
        );
      }
      render(s, false);
    });

    /* tabs */
    function tab(s) {
      cur = s;
      ['left', 'right'].forEach(function (x) {
        $('#tab-' + x).setAttribute('aria-selected', x === s);
        sides[x].panel.hidden = x !== s;
      });
      $('#side-name').textContent = (s === 'left' ? 'Left' : 'Right') + ' side';
    }
    ['left', 'right'].forEach(function (s) {
      $('#tab-' + s).addEventListener('click', function () {
        tab(s);
      });
    });
    ['left', 'right'].forEach(function (s) {
      $('#tk-' + s).addEventListener('click', function (e) {
        if (!e.target.closest('button')) tab(s);
      });
    });

    /* utilities */
    function other() {
      return cur === 'left' ? 'right' : 'left';
    }
    $('#u-copy').addEventListener('click', function () {
      var a = sides[cur].panel,
        b = sides[other()].panel;
      $$('[data-k]', a).forEach(function (n) {
        var m = $('[data-k="' + n.dataset.k + '"]', b);
        if (!m) return;
        if (n.type === 'checkbox') m.checked = n.checked;
        else m.value = n.value;
        if (n.type === 'range')
          m.dispatchEvent(new Event('input', { bubbles: true }));
        if (n.type === 'checkbox')
          m.dispatchEvent(new Event('change', { bubbles: true }));
      });
      syncUI(other());
      render(other(), false);
      snack('Copied ' + cur + ' settings to the ' + other() + ' side');
    });
    $('#u-save').addEventListener('click', function () {
      var o = read(cur);
      try {
        localStorage.setItem('cobalt-side', JSON.stringify(o));
      } catch (e) {}
      snack('Saved ' + ENC[o.enc].label + ' settings');
    });
    $('#u-import').addEventListener('click', function () {
      var o;
      try {
        o = JSON.parse(localStorage.getItem('cobalt-side'));
      } catch (e) {}
      if (!o) return snack('No saved settings yet. Save a side first.');
      var p = sides[cur].panel;
      $('[data-k="enc"]', p).value = o.enc;
      var q = $('[data-k="q"]', p);
      q.value = o.q;
      q.dispatchEvent(new Event('input', { bubbles: true }));
      syncUI(cur);
      render(cur, false);
      snack('Imported saved settings');
    });

    /* viewer tools */
    var zoom = 100,
      zv = $('#z-val');
    function setZoom(z) {
      zoom = clamp(Math.round(z), 10, 800);
      zv.value = zoom + '%';
      api.setZoom(zoom / 100);
    }
    $('#z-in').addEventListener('click', function () {
      setZoom(zoom + 25);
    });
    $('#z-out').addEventListener('click', function () {
      setZoom(zoom - 25);
    });
    zv.addEventListener('change', function () {
      setZoom(parseInt(zv.value, 10) || 100);
    });
    zv.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') zv.blur();
    });
    function toggle(id, cls) {
      $(id).addEventListener('click', function (e) {
        var on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
        e.currentTarget.setAttribute('aria-pressed', on);
        cmp.classList.toggle(cls, on);
      });
    }
    toggle('#t-pixel', 'pixel');
    toggle('#t-bg', 'checker');
    toggle('#t-layout', 'sbs');
    $('#t-rot').addEventListener('click', api.rotate);
    $('#t-add').addEventListener('click', function () {
      snack('Drop or paste another image to add it.');
    });
    $$('[data-dl]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = b.dataset.dl,
          o = read(s);
        snack(
          'Saved ' +
            img.name.replace(/\.\w+$/, '') +
            '.' +
            (o.enc === 'webp' ? 'webp' : 'jpg') +
            ' (' +
            fmt(sides[s].bytes || img.bytes) +
            ')',
        );
      });
    });

    /* drag over: the wordmark squeezes */
    var dc = 0;
    window.addEventListener('dragenter', function (e) {
      e.preventDefault();
      dc++;
      wordmark.style.setProperty('--w', 50);
    });
    window.addEventListener('dragover', function (e) {
      e.preventDefault();
    });
    window.addEventListener('dragleave', function () {
      dc = Math.max(0, dc - 1);
      if (!dc) render('right', true);
    });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      dc = 0;
      render('right', true);
      snack('Image added. Prototype keeps the demo photo.');
    });

    setImage();
    syncUI('left');
    syncUI('right');
    tab('right');
    render('left', true);
    render('right', true);
    if (location.hash === '#loading')
      $('#tk-right').setAttribute('data-loading', '');
  }

  /* =================== BULK =================== */
  function bulk() {
    var A = {
      photo: '../assets/photo.jpg',
      art: '../assets/artwork.jpg',
      scr: '../assets/screen.jpg',
    };
    var items = [
      { n: 'beach-sunrise.jpg', i: 'photo', b: 2.8e6, s: 'done' },
      { n: 'poster-final.jpg', i: 'art', b: 2.9e6, s: 'done' },
      { n: 'pixel3-home.png', i: 'scr', b: 1.6e6, s: 'done' },
      { n: 'harbour-wide.jpg', i: 'photo', b: 3.4e6, s: 'done' },
      { n: 'gallery-04.jpg', i: 'art', b: 2.2e6, s: 'done' },
      { n: 'receipt-scan.png', i: 'scr', b: 1.1e6, s: 'done' },
      { n: 'mountain-pass.jpg', i: 'photo', b: 3.1e6, s: 'done' },
      { n: 'studio-light.jpg', i: 'art', b: 4.0e6, s: 'processing' },
      { n: 'IMG_4821.heic', badge: 'HEIC', b: 3.6e6, s: 'pending' },
      { n: 'menu-board.png', i: 'scr', b: 0.92e6, s: 'pending' },
      {
        n: 'scan-0007.tiff',
        badge: 'TIFF',
        b: 8.2e6,
        s: 'error',
        err: "Can't decode TIFF",
      },
      { n: 'cover-draft.jpg', i: 'art', b: 2.6e6, s: 'pending' },
    ];
    var grid = $('#grid'),
      busy = false;

    function opts() {
      var g = function (k) {
        return $('.bulk-rail [data-k="' + k + '"]');
      };
      return {
        enc: g('enc').value,
        q: +g('q').value,
        resize: g('resize').checked,
        scale: +g('scale').value / 100,
        palette: g('palette').checked,
        colors: +g('colors').value,
      };
    }
    function result(it, idx) {
      var jitter = 0.6 + ((idx * 37) % 11) / 10;
      return estimate(it.b, opts()) * jitter;
    }
    items.forEach(function (it, i) {
      if (it.s === 'done') it.r = result(it, i);
    });

    function tileHTML(it, i) {
      var preview = it.badge
        ? '<span class="badge" aria-hidden="true">.' + it.badge + '</span>'
        : '<img src="' + A[it.i] + '" alt="" loading="lazy">';
      var sz,
        corner = '';
      if (it.s === 'done') {
        sz = fmt(it.b) + ' <span class="to">&rarr; ' + fmt(it.r) + '</span>';
        corner = '&minus;' + Math.round((1 - it.r / it.b) * 100) + '%';
      } else if (it.s === 'error') {
        sz = it.err;
        corner = 'Error';
      } else if (it.s === 'processing') sz = 'Processing…';
      else sz = fmt(it.b);
      var label =
        it.n +
        ', ' +
        (it.s === 'done'
          ? 'converted, saved ' + corner.replace('&minus;', '')
          : it.s === 'error'
          ? 'error: ' + it.err
          : it.s);
      return (
        '<li><button class="tile" type="button" data-i="' +
        i +
        '" data-status="' +
        it.s +
        '" aria-label="' +
        label +
        '">' +
        preview +
        '<span class="scan"></span><span class="corner">' +
        corner +
        '</span><span class="foot-t"><span class="nm">' +
        it.n +
        '</span><span class="sz">' +
        sz +
        '</span></span></button></li>'
      );
    }
    function paint() {
      grid.innerHTML = items.map(tileHTML).join('');
      var done = items.filter(function (x) {
        return x.s === 'done';
      });
      var orig = done.reduce(function (a, x) {
          return a + x.b;
        }, 0),
        now = done.reduce(function (a, x) {
          return a + x.r;
        }, 0);
      var all = items.reduce(function (a, x) {
        return a + x.b;
      }, 0);
      $('#saved-fig').textContent = fmt(orig - now);
      $('#saved-line').style.setProperty(
        '--w',
        done.length ? widthFor(now / orig) : 150,
      );
      $('#saved-detail').innerHTML =
        '<span>Original <b>' +
        fmt(all) +
        '</b></span><span>Converted <b>' +
        fmt(now) +
        '</b> from ' +
        fmt(orig) +
        '</span><span>Saved <b>' +
        (orig ? Math.round((1 - now / orig) * 100) : 0) +
        '%</b></span>';
      $('#cells').innerHTML = items
        .map(function (x) {
          return '<i class="' + x.s + '"></i>';
        })
        .join('');
      $('#cells').setAttribute(
        'aria-label',
        'Progress: ' + done.length + ' of ' + items.length + ' converted',
      );
      $('#subhead').textContent =
        items.length + ' images · ' + done.length + ' converted';
      if (!busy) $('#zip').disabled = !done.length;
    }
    paint();

    /* convert all */
    var convert = $('#convert');
    function sleep(ms) {
      return new Promise(function (r) {
        setTimeout(r, ms);
      });
    }
    convert.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      convert.setAttribute('aria-busy', 'true');
      convert.disabled = false;
      $('#zip').disabled = true;
      var queue = items
        .map(function (x, i) {
          return i;
        })
        .filter(function (i) {
          return items[i].s === 'pending' || items[i].s === 'processing';
        });
      var total = queue.length,
        n = 0;
      (function step() {
        if (!queue.length) {
          busy = false;
          convert.removeAttribute('aria-busy');
          $('#convert-l').textContent = 'Convert all';
          paint();
          snack(
            items.filter(function (x) {
              return x.s === 'done';
            }).length +
              ' converted, ' +
              items.filter(function (x) {
                return x.s === 'error';
              }).length +
              ' failed',
          );
          return;
        }
        var i = queue.shift();
        items[i].s = 'processing';
        paint();
        $('#convert-l').textContent = 'Converting ' + ++n + ' of ' + total;
        sleep(650).then(function () {
          items[i].r = result(items[i], i);
          items[i].s = 'done';
          paint();
          step();
        });
      })();
    });
    $('#zip').addEventListener('click', function () {
      var z = $('#zip'),
        l = $('#zip-l');
      z.setAttribute('aria-busy', 'true');
      z.disabled = true;
      l.textContent = 'Zipping…';
      setTimeout(function () {
        z.removeAttribute('aria-busy');
        z.disabled = false;
        l.textContent = 'Download all (ZIP)';
        snack(
          'squoosh-converted.zip ready: ' +
            items.filter(function (x) {
              return x.s === 'done';
            }).length +
            ' files',
        );
      }, 1400);
    });
    document.addEventListener('input', function (e) {
      if (
        e.target.closest &&
        e.target.closest('.bulk-rail') &&
        e.target.dataset.k
      )
        $('#saved-detail').style.opacity = 1;
    });

    /* tile modal */
    var modal = $('#modal'),
      mapi = initCompare($('#m-cmp')),
      mi = null;
    grid.addEventListener('click', function (e) {
      var t = e.target.closest('.tile');
      if (!t) return;
      var it = items[+t.dataset.i];
      if (it.badge)
        return snack(
          it.s === 'error'
            ? it.n +
                ': ' +
                it.err +
                '. Convert it in another tool and add it again.'
            : 'No preview for .' +
                it.badge +
                ' files. It will still convert in the batch.',
        );
      mi = it;
      $('#m-title').textContent = it.n;
      $('#m-l').src = $('#m-r').src = A[it.i];
      $('#m-q').value = opts().q;
      $('#m-enc').value =
        ['mozjpeg', 'webp', 'avif'].indexOf(opts().enc) >= 0
          ? opts().enc
          : 'mozjpeg';
      $('[data-out="mq"]').textContent = $('#m-q').value;
      mrender(true);
      modal.showModal();
      mapi.fit();
    });
    function mrender(now) {
      var o = {
        enc: $('#m-enc').value,
        q: +$('#m-q').value,
        resize: opts().resize,
        scale: opts().scale,
        palette: false,
      };
      var b = estimate(mi.b, o),
        s = split(b);
      $('#m-o').textContent = fmt(mi.b);
      $('#m-n').textContent = s[0] + ' ' + s[1];
      $('#m-n').style.setProperty('--w', widthFor(b / mi.b));
      $('#m-p').textContent = pctText(mi.b, b);
      $('#m-tag').textContent = ENC[o.enc].label + ' ' + o.q;
      $('#m-r').style.filter = blurFor(o);
    }
    $('#m-q').addEventListener('input', function () {
      $('[data-out="mq"]').textContent = this.value;
      mrender();
    });
    $('#m-enc').addEventListener('change', function () {
      mrender();
    });
    $('#m-close').addEventListener('click', function () {
      modal.close();
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.close();
    });
  }
})();
