/* Squoosh "Sentence": shared behaviour for index / editor / bulk. Vanilla JS, no build. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CAN_REAL =
    location.protocol === 'http:' || location.protocol === 'https:';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]),
    );
  const ic = (n) =>
    `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  /* ---------- Icon sprite (one stroke family: 1.75, round) ---------- */
  const ICONS = {
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
    checker:
      '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 4v8h8M4 12h8v8"/>',
    pixel:
      '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    split:
      '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M12 5v14"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>',
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    import: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    image:
      '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.5"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
    paste:
      '<rect x="6" y="5" width="12" height="16" rx="2.5"/><path d="M9 5V4h6v1M9 11h6M9 15h4"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrowsplit: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M4 12h16"/>',
  };
  function injectSprite() {
    if ($('#sprite')) return;
    const s = Object.entries(ICONS)
      .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`)
      .join('');
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<svg id="sprite" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${s}</svg>`,
    );
  }
  injectSprite();

  /* ---------- Snackbar + live region ---------- */
  let snackEl, liveEl, snackT;
  function snack(msg) {
    if (!snackEl) {
      snackEl =
        $('#snack') ||
        document.body.appendChild(
          Object.assign(document.createElement('div'), { id: 'snack' }),
        );
      snackEl.className = 'snack';
      snackEl.setAttribute('role', 'status');
    }
    snackEl.textContent = msg;
    snackEl.classList.add('show');
    clearTimeout(snackT);
    snackT = setTimeout(() => snackEl.classList.remove('show'), 4500);
  }
  function announce(msg) {
    if (!liveEl) {
      liveEl =
        $('#live') ||
        document.body.appendChild(
          Object.assign(document.createElement('div'), { id: 'live' }),
        );
      liveEl.className = 'sr-only';
      liveEl.setAttribute('aria-live', 'polite');
      liveEl.setAttribute('aria-atomic', 'true');
    }
    liveEl.textContent = '';
    setTimeout(() => (liveEl.textContent = msg), 60);
  }

  /* ---------- Data ---------- */
  const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#4A5FD6"/><circle cx="256" cy="256" r="124" fill="#FFE27A"/><path d="M174 294c40 50 124 50 164 0" stroke="#1D2A3F" stroke-width="22" fill="none" stroke-linecap="round"/><circle cx="212" cy="228" r="16" fill="#1D2A3F"/><circle cx="300" cy="228" r="16" fill="#1D2A3F"/></svg>`;
  const DEMOS = {
    photo: {
      key: 'photo',
      name: 'photo.jpg',
      label: 'Large photo',
      src: '../assets/photo.jpg',
      bytes: 2.8e6,
      w: 1400,
      h: 541,
      raster: true,
    },
    art: {
      key: 'art',
      name: 'artwork.jpg',
      label: 'Artwork',
      src: '../assets/artwork.jpg',
      bytes: 2.9e6,
      w: 1400,
      h: 937,
      raster: true,
    },
    screen: {
      key: 'screen',
      name: 'pixel3.png',
      label: 'Device screen',
      src: '../assets/screen.jpg',
      bytes: 1.6e6,
      w: 587,
      h: 1200,
      raster: true,
    },
    svg: {
      key: 'svg',
      name: 'squoosh.svg',
      label: 'SVG icon',
      src: 'data:image/svg+xml;utf8,' + encodeURIComponent(SVG_ICON),
      bytes: 13e3,
      w: 512,
      h: 512,
      raster: false,
    },
  };
  const ENC = {
    orig: {
      label: 'Original Image',
      short: 'the original',
      hint: 'Your picture exactly as it came in.',
    },
    mozjpeg: {
      label: 'MozJPEG',
      short: 'JPEG',
      mime: 'image/jpeg',
      k: 0.076,
      ext: 'jpg',
      hint: 'The classic. Works absolutely everywhere.',
    },
    webp: {
      label: 'WebP',
      short: 'WebP',
      mime: 'image/webp',
      k: 0.066,
      ext: 'webp',
      hint: 'Small files, works in every modern browser.',
    },
    avif: {
      label: 'AVIF',
      short: 'AVIF',
      mime: 'image/avif',
      k: 0.05,
      ext: 'avif',
      hint: 'Smallest files, but a few older apps cannot open it.',
    },
    jxl: {
      label: 'JPEG XL (beta)',
      short: 'JPEG XL',
      k: 0.055,
      ext: 'jxl',
      hint: 'Very small files. Still new, so few apps open it.',
    },
    webp2: {
      label: 'WebP v2 (unstable)',
      short: 'WebP v2',
      k: 0.055,
      ext: 'webp2',
      hint: 'Experimental. Not ready for everyday use.',
    },
    oxipng: {
      label: 'OxiPNG',
      short: 'PNG',
      mime: 'image/png',
      k: 0.55,
      lossless: true,
      ext: 'png',
      hint: 'Sharp and lossless. Best for screenshots and logos.',
    },
    qoi: {
      label: 'QOI',
      short: 'QOI',
      k: 0.9,
      lossless: true,
      ext: 'qoi',
      hint: 'Very fast and lossless. Rarely supported.',
    },
    bpng: {
      label: 'Browser PNG',
      short: 'PNG (browser)',
      mime: 'image/png',
      k: 0.75,
      lossless: true,
      ext: 'png',
      hint: 'PNG made by your browser, not as small.',
    },
    bjpeg: {
      label: 'Browser JPEG',
      short: 'JPEG (browser)',
      mime: 'image/jpeg',
      k: 0.09,
      ext: 'jpg',
      hint: 'JPEG made by your browser, not as small.',
    },
    bgif: {
      label: 'Browser GIF',
      short: 'GIF',
      k: 0.7,
      lossless: true,
      ext: 'gif',
      hint: 'Only 256 colours. Good for simple graphics.',
    },
  };
  const QP = {
    smallest: {
      q: 40,
      label: 'Smallest file',
      short: 'Compact',
      hint: 'Tiny download. Fine detail may soften.',
    },
    balanced: {
      q: 75,
      label: 'Balanced',
      short: 'Balanced',
      hint: 'Looks great and saves a lot. Our recommendation.',
    },
    best: {
      q: 92,
      label: 'Best quality',
      short: 'Best',
      hint: 'Looks like the original, with a smaller saving.',
    },
  };
  const OPTS = {
    format: {
      title: 'Save as',
      items: ['webp', 'mozjpeg', 'avif', 'oxipng'].map((k) => ({
        v: k,
        label: ENC[k].short,
        hint: ENC[k].hint,
      })),
      more: 'See every format',
      focus: 'enc',
    },
    quality: {
      title: 'Quality',
      items: Object.entries(QP).map(([k, p]) => ({
        v: k,
        label: p.label,
        hint: p.hint,
      })),
      more: 'Use a slider instead',
      focus: 'quality',
    },
    resize: {
      title: 'Size',
      items: [
        {
          v: '100',
          label: 'No resize',
          hint: 'Keep the width and height as they are.',
        },
        {
          v: '75',
          label: 'Shrink to 75%',
          hint: 'A little smaller. Good for the web.',
        },
        { v: '50', label: 'Shrink to 50%', hint: 'Half the width and height.' },
        { v: '25', label: 'Shrink to 25%', hint: 'Thumbnail size.' },
      ],
      more: 'Set an exact size',
      focus: 'pct',
    },
    colours: {
      title: 'Colours',
      items: [
        { v: '0', label: 'Keep all colours', hint: 'Best for photos.' },
        {
          v: '256',
          label: 'Limit to 256 colours',
          hint: 'Good for logos and drawings.',
        },
        {
          v: '64',
          label: 'Limit to 64 colours',
          hint: 'Smaller, with a flatter look.',
        },
        {
          v: '16',
          label: 'Limit to 16 colours',
          hint: 'Tiny and very graphic.',
        },
      ],
      more: 'Choose any number',
      focus: 'colors',
    },
  };
  const mkSide = (enc) => ({
    enc,
    preset: 'balanced',
    quality: 75,
    resizeOn: false,
    pct: 100,
    method: 'lanczos3',
    fit: 'stretch',
    premul: false,
    linear: false,
    colorsOn: false,
    colors: 256,
    dither: 0.5,
    adv: false,
    chan: 'YCbCr',
    sepChroma: false,
    subsample: '4:2:0',
    prog: true,
    huff: true,
    trellis: true,
    smooth: 0,
  });

  function blankText(s, key) {
    if (key === 'format') return ENC[s.enc].short;
    if (key === 'quality')
      return s.preset === 'custom' ? 'Custom' : QP[s.preset].short;
    if (key === 'resize')
      return s.resizeOn && s.pct < 100 ? `shrunk to ${s.pct}%` : 'no resize';
    if (key === 'colours')
      return s.colorsOn ? `limited to ${s.colors} colours` : 'all colours kept';
    return '';
  }
  function choiceOf(s, key) {
    if (key === 'format') return s.enc;
    if (key === 'quality') return s.preset;
    if (key === 'resize') return s.resizeOn ? String(s.pct) : '100';
    if (key === 'colours') return s.colorsOn ? String(s.colors) : '0';
  }
  function applyChoice(s, key, v) {
    if (key === 'format') s.enc = v;
    else if (key === 'quality') {
      s.preset = v;
      s.quality = QP[v].q;
    } else if (key === 'resize') {
      s.pct = +v;
      s.resizeOn = +v < 100;
    } else if (key === 'colours') {
      s.colorsOn = +v > 0;
      if (+v > 0) s.colors = +v;
    }
  }
  const scaleOf = (s) => (s.resizeOn ? s.pct / 100 : 1);
  function estimate(s, bytes, c = 1) {
    if (s.enc === 'orig') return bytes;
    const e = ENC[s.enc];
    let r = e.k;
    if (!e.lossless) r *= Math.pow(s.quality / 75, 2.4);
    if (s.colorsOn) r *= 0.55 + 0.45 * (Math.log2(s.colors) / 8);
    return Math.max(500, bytes * r * c * Math.pow(scaleOf(s), 1.6));
  }
  const fmt = (n) =>
    n >= 1e6
      ? (n / 1e6).toFixed(1) + ' MB'
      : n >= 1e3
      ? Math.round(n / 1e3) + ' KB'
      : Math.round(n) + ' B';
  const pctSmaller = (o, b) => Math.round((1 - b / o) * 100);
  function blurFor(s) {
    if (s.enc === 'orig') return '';
    const e = ENC[s.enc];
    const sc = scaleOf(s);
    let b = e.lossless ? 0 : ((100 - s.quality) / 100) * 3;
    if (sc < 1) b += (1 / sc - 1) * 1.1;
    return b > 0.15 ? `blur(${Math.min(b, 8).toFixed(1)}px)` : '';
  }

  /* ---------- Real encoding with canvas (http only) ---------- */
  const realCache = new Map();
  function getReal(src) {
    if (!realCache.has(src)) {
      realCache.set(
        src,
        new Promise((res) => {
          const img = new Image();
          img.onload = async () => {
            let bytes = 0;
            if (CAN_REAL) {
              try {
                bytes = (await (await fetch(src)).blob()).size;
              } catch {
                bytes = 0;
              }
            }
            res({ img, bytes });
          };
          img.onerror = () => res({ img, bytes: 0 });
          img.src = src;
        }),
      );
    }
    return realCache.get(src);
  }
  async function encodeBlob(img, s) {
    const e = ENC[s.enc];
    if (!CAN_REAL || !e.mime || !img.naturalWidth) return null;
    const sc = scaleOf(s);
    const w = Math.max(1, Math.round(img.naturalWidth * sc));
    const h = Math.max(1, Math.round(img.naturalHeight * sc));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    if (s.colorsOn) {
      const d = ctx.getImageData(0, 0, w, h);
      const lv = Math.max(2, Math.round(Math.cbrt(s.colors)));
      const step = 255 / (lv - 1);
      for (let i = 0; i < d.data.length; i += 4) {
        d.data[i] = Math.round(Math.round(d.data[i] / step) * step);
        d.data[i + 1] = Math.round(Math.round(d.data[i + 1] / step) * step);
        d.data[i + 2] = Math.round(Math.round(d.data[i + 2] / step) * step);
      }
      ctx.putImageData(d, 0, 0);
    }
    const blob = await new Promise((r) =>
      c.toBlob(r, e.mime, e.lossless ? undefined : s.quality / 100),
    );
    return blob && blob.type === e.mime ? blob : null;
  }

  /* ---------- Session (demo key or file hand-off between pages) ---------- */
  const SKEY = 'sq.sentence.session';
  const saveSession = (o) => {
    try {
      sessionStorage.setItem(SKEY, JSON.stringify(o));
      return true;
    } catch {
      return false;
    }
  };
  const loadSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(SKEY));
    } catch {
      return null;
    }
  };
  function getSubject() {
    const q = new URLSearchParams(location.search).get('demo');
    const s = q && DEMOS[q] ? { kind: 'demo', key: q } : loadSession();
    if (s && s.kind === 'demo' && DEMOS[s.key]) return { ...DEMOS[s.key] };
    if (s && s.kind === 'file') {
      if (s.dataUrl)
        return {
          key: 'own',
          name: s.name,
          bytes: s.size,
          src: s.dataUrl,
          w: 0,
          h: 0,
          raster: !/svg/.test(s.dataUrl.slice(0, 30)),
        };
      return { ...DEMOS.photo, name: s.name, bytes: s.size };
    }
    return { ...DEMOS.photo };
  }
  function handleFiles(files) {
    const imgs = [...files].filter(
      (f) =>
        f.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|avif|gif|svg|heic|tiff?)$/i.test(f.name),
    );
    if (!imgs.length) {
      snack(
        "That doesn't look like a picture. Try a JPEG, PNG, WebP or AVIF file.",
      );
      return;
    }
    if (imgs.length > 1) {
      saveSession({
        kind: 'files',
        files: imgs.map((f) => ({ name: f.name, size: f.size })),
      });
      location.href = 'bulk.html';
      return;
    }
    const f = imgs[0];
    if (f.size < 3e6 && f.type.startsWith('image/')) {
      const fr = new FileReader();
      fr.onload = () => {
        if (
          !saveSession({
            kind: 'file',
            name: f.name,
            size: f.size,
            dataUrl: fr.result,
          })
        )
          saveSession({ kind: 'file', name: f.name, size: f.size });
        location.href = 'editor.html';
      };
      fr.onerror = () =>
        snack("We couldn't read that file. Please try another picture.");
      fr.readAsDataURL(f);
    } else {
      saveSession({ kind: 'file', name: f.name, size: f.size });
      location.href = 'editor.html';
    }
  }

  /* ---------- The sentence: blanks + popovers ---------- */
  function markBlank(key, soft) {
    const t = $(`.blank[data-key="${key}"] .blank-text`);
    if (!t) return;
    if (soft && t.classList.contains('marked')) return;
    t.classList.remove('marked');
    void t.offsetWidth;
    t.classList.add('marked');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('marked'), 2700);
  }

  function Sentence(root, { getSide, onPick, onMore }) {
    let pop = null,
      scrim = null,
      cur = null;
    $$('.blank', root).forEach((b) => {
      b.setAttribute('aria-haspopup', 'dialog');
      b.setAttribute('aria-expanded', 'false');
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('.blank');
      if (b) open(b);
    });
    function refresh() {
      $$('.blank', root).forEach((b) => {
        const k = b.dataset.key,
          t = blankText(getSide(), k);
        $('.blank-text', b).textContent = t;
        b.setAttribute(
          'aria-label',
          `${OPTS[k].title}: ${t}. Press to change.`,
        );
      });
    }
    function open(btn) {
      if (cur === btn) {
        close(true);
        return;
      }
      close(false);
      cur = btn;
      const k = btn.dataset.key,
        def = OPTS[k],
        now = choiceOf(getSide(), k),
        id = 'pop-' + k;
      pop = document.createElement('div');
      pop.className = 'popover';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-labelledby', id + '-t');
      pop.innerHTML = `<p class="pop-title" id="${id}-t">${
        def.title
      }</p><div class="pop-list" role="radiogroup" aria-labelledby="${id}-t">${def.items
        .map(
          (it, i) =>
            `<button type="button" class="opt" role="radio" data-v="${
              it.v
            }" aria-checked="${it.v === now}" tabindex="${
              it.v === now || (!def.items.some((x) => x.v === now) && i === 0)
                ? 0
                : -1
            }"><span class="dot"></span><span><b>${it.label}</b><small>${
              it.hint
            }</small></span></button>`,
        )
        .join('')}</div><div class="pop-foot">${
        def.more
          ? `<button type="button" class="link-btn" data-more>${def.more}</button>`
          : '<span></span>'
      }<button type="button" class="link-btn" data-close>Done</button></div>`;
      scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.addEventListener('click', () => close(true));
      document.body.append(scrim, pop);
      const r = btn.getBoundingClientRect();
      pop.style.top = r.bottom + scrollY + 10 + 'px';
      pop.style.left =
        clamp(
          r.left + scrollX,
          16,
          document.documentElement.clientWidth - pop.offsetWidth - 16,
        ) + 'px';
      btn.setAttribute('aria-expanded', 'true');
      (pop.querySelector('[tabindex="0"]') || pop.querySelector('.opt')).focus({
        preventScroll: false,
      });
      pop.addEventListener('click', (e) => {
        const o = e.target.closest('.opt');
        if (o) {
          applyChoice(getSide(), k, o.dataset.v);
          refresh();
          close(true);
          onPick(k);
        } else if (e.target.closest('[data-close]')) close(true);
        else if (e.target.closest('[data-more]')) {
          close(false);
          onMore && onMore(k, def.focus);
        }
      });
      pop.addEventListener('keydown', (e) => {
        const radios = $$('.opt', pop),
          i = radios.indexOf(document.activeElement);
        const go = (n) => {
          radios.forEach((x) => (x.tabIndex = -1));
          radios[n].tabIndex = 0;
          radios[n].focus();
        };
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          close(true);
        } else if (
          (e.key === 'ArrowDown' || e.key === 'ArrowRight') &&
          i > -1
        ) {
          e.preventDefault();
          go((i + 1) % radios.length);
        } else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && i > -1) {
          e.preventDefault();
          go((i - 1 + radios.length) % radios.length);
        } else if (e.key === 'Home' && i > -1) {
          e.preventDefault();
          go(0);
        } else if (e.key === 'End' && i > -1) {
          e.preventDefault();
          go(radios.length - 1);
        } else if (e.key === 'Tab') {
          const f = $$('button', pop).filter((b) => b.tabIndex !== -1);
          const first = f[0],
            last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }
    function close(returnFocus) {
      if (!pop) return;
      pop.remove();
      scrim && scrim.remove();
      const b = cur;
      pop = scrim = cur = null;
      b.setAttribute('aria-expanded', 'false');
      if (returnFocus) b.focus();
    }
    document.addEventListener('pointerdown', (e) => {
      if (pop && !pop.contains(e.target) && !e.target.closest('.blank'))
        close(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && pop) close(true);
    });
    addEventListener('resize', () => close(false));
    return { refresh, close };
  }

  /* ---------- Compare (slider / side-by-side, zoom, rotate) ---------- */
  class Compare {
    constructor(root) {
      this.root = root;
      this.vp = $('.cmp-viewport', root);
      this.stage = $('.cmp-stage', root);
      this.L = $('.cmp-layer.left img', root);
      this.R = $('.cmp-layer.right img', root);
      this.h = $('.cmp-handle', root);
      this.zoom = 100;
      this.rot = 0;
      this.layout = 'slide';
      this.pos = 50;
      this.w = 4;
      this.hh = 3;
      this.h.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.h.setPointerCapture(e.pointerId);
        this.drag = true;
        this.h.focus();
      });
      this.h.addEventListener(
        'pointermove',
        (e) => this.drag && this.fromX(e.clientX),
      );
      ['pointerup', 'pointercancel'].forEach((n) =>
        this.h.addEventListener(n, () => (this.drag = false)),
      );
      this.stage.addEventListener('pointerdown', (e) => {
        if (this.layout === 'slide' && !e.target.closest('.cmp-handle'))
          this.fromX(e.clientX);
      });
      this.h.addEventListener('keydown', (e) => {
        const st = e.shiftKey ? 10 : 2;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
          this.setPos(this.pos - st);
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
          this.setPos(this.pos + st);
        else if (e.key === 'Home') this.setPos(0);
        else if (e.key === 'End') this.setPos(100);
        else return;
        e.preventDefault();
      });
      if (window.ResizeObserver)
        new ResizeObserver(() => this.fit()).observe(this.vp);
      this.setPos(50);
    }
    fromX(x) {
      const r = this.stage.getBoundingClientRect();
      this.setPos(((x - r.left) / r.width) * 100);
    }
    setPos(p) {
      this.pos = clamp(p, 0, 100);
      const n = Math.round(this.pos);
      this.stage.style.setProperty('--pos', this.pos + '%');
      this.h.setAttribute('aria-valuenow', n);
      this.h.setAttribute(
        'aria-valuetext',
        `${n}% original, ${100 - n}% result`,
      );
    }
    setDims(w, h) {
      this.w = w || 4;
      this.hh = h || 3;
      this.fit();
    }
    setRot(d) {
      this.rot = ((d % 360) + 360) % 360;
      this.fit();
    }
    setZoom(z) {
      this.zoom = clamp(Math.round(z), 10, 800);
      this.fit();
      return this.zoom;
    }
    setLayout(l) {
      this.layout = l;
      this.root.classList.toggle('is-sbs', l === 'sbs');
      this.fit();
    }
    setSources(o) {
      if (o.left !== undefined) this.L.src = o.left;
      if (o.right !== undefined) this.R.src = o.right;
      if (o.leftFilter !== undefined) this.L.style.filter = o.leftFilter;
      if (o.rightFilter !== undefined) this.R.style.filter = o.rightFilter;
    }
    fit() {
      const rotated = this.rot % 180 !== 0;
      const ar = rotated ? this.hh / this.w : this.w / this.hh;
      let sar = ar;
      if (this.layout === 'sbs') {
        const stacked = this.vp.clientWidth < 640;
        this.stage.classList.toggle('stacked', stacked);
        sar = stacked ? ar / 2 : ar * 2;
      }
      const vw = this.vp.clientWidth - 2,
        vh = this.vp.clientHeight - 2;
      if (vw <= 0) return;
      const fitW = Math.min(vw, vh * sar);
      this.stage.style.width = (fitW * this.zoom) / 100 + 'px';
      this.stage.style.aspectRatio = String(sar);
      this.stage.style.setProperty(
        '--imgw',
        rotated ? (this.w / this.hh) * 100 + '%' : '100%',
      );
      this.stage.style.setProperty('--rot', this.rot + 'deg');
    }
  }

  /* ---------- Options form (used by editor sides and the bulk panel) ---------- */
  function formHTML(p, { bulk, hasOrig }) {
    const encOpts = Object.entries(ENC)
      .filter(([k]) => hasOrig || k !== 'orig')
      .map(([k, e]) => `<option value="${k}">${e.label}</option>`)
      .join('');
    const sel = (f, id, label, opts) =>
      `<div class="field"><label for="${p}-${id}">${label}</label><select id="${p}-${id}" data-f="${f}">${opts
        .map((o) => `<option>${o}</option>`)
        .join('')}</select></div>`;
    const chk = (f, id, label) =>
      `<label class="check"><input type="checkbox" id="${p}-${id}" data-f="${f}"> ${label}</label>`;
    const rng = (f, id, label, min, max, step = 1) =>
      `<div class="field"><label for="${p}-${id}">${label}</label><div class="range-row"><input type="range" id="${p}-${id}" data-f="${f}" min="${min}" max="${max}" step="${step}"><output for="${p}-${id}" data-o="${f}"></output></div></div>`;
    const resizeBody = bulk
      ? rng('pct', 'pct', 'Scale (percent of original size)', 1, 100) +
        '<p class="note">Every picture keeps its own shape.</p>'
      : `<div class="field"><label for="${p}-preset">Preset</label><select id="${p}-preset" data-f="preset"><option value="custom">Custom</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option></select></div>
         <div class="two"><div class="field"><label for="${p}-w">Width</label><input type="number" id="${p}-w" data-f="w" min="1" inputmode="numeric"></div><div class="field"><label for="${p}-h">Height</label><input type="number" id="${p}-h" data-f="h" min="1" inputmode="numeric"></div></div>
         ${sel('method', 'method', 'Method', [
           'lanczos3',
           'mitchell',
           'catrom',
           'triangle',
           'hqx',
           'browser-pixelated',
           'browser-low',
           'browser-medium',
           'browser-high',
         ])}
         ${sel('fit', 'fit', 'Fit method', ['stretch', 'contain'])}
         ${chk('premul', 'premul', 'Premultiply alpha channel')}${chk(
          'linear',
          'linear',
          'Linearize RGB',
        )}`;
    return `<div class="field"><label for="${p}-enc">${
      bulk ? 'Save every picture as' : 'Format'
    }</label><select id="${p}-enc" data-f="enc">${encOpts}</select><span class="hint" data-hint></span></div>
    <fieldset class="whole" data-whole>
      <div class="grp">${chk(
        'resizeOn',
        'resizeOn',
        '<b>Resize</b>',
      )}<fieldset class="sub" data-sub="resize">${resizeBody}</fieldset></div>
      <div class="grp">${chk(
        'colorsOn',
        'colorsOn',
        '<b>Reduce the number of colours</b>',
      )}<fieldset class="sub" data-sub="palette">${rng(
      'colors',
      'colors',
      'Colours',
      2,
      256,
    )}${rng('dither', 'dither', 'Dithering', 0, 1, 0.05)}</fieldset></div>
      <div class="grp"><p class="grp-title" style="margin-bottom:6px">Compress</p>${rng(
        'quality',
        'quality',
        'Quality',
        0,
        100,
      )}<p class="note" data-qnote></p>
        ${chk('adv', 'adv', 'Show advanced settings')}
        <div class="adv" data-adv hidden>
          ${sel('chan', 'chan', 'Channels', ['YCbCr', 'RGB', 'Grayscale'])}
          ${chk('sepChroma', 'sep', 'Separate chroma quality')}
          ${sel('subsample', 'sub', 'Chroma subsampling', [
            '4:4:4',
            '4:2:2',
            '4:2:0',
          ])}
          ${chk('prog', 'prog', 'Progressive rendering')}${chk(
      'huff',
      'huff',
      'Optimize Huffman table',
    )}${chk('trellis', 'trellis', 'Trellis multipass')}
          ${rng('smooth', 'smooth', 'Smoothing', 0, 100)}
        </div>
      </div>
    </fieldset>`;
  }
  function buildOptions(
    host,
    p,
    { bulk = false, hasOrig = true, getSide, dims, onChange },
  ) {
    host.innerHTML = formHTML(p, { bulk, hasOrig });
    const f = (n) => $(`[data-f="${n}"]`, host);
    function sync() {
      const s = getSide();
      const d = dims();
      $$('[data-f]', host).forEach((el) => {
        const n = el.dataset.f;
        if (['preset', 'w', 'h'].includes(n)) return;
        const v = s[n];
        if (el.type === 'checkbox') el.checked = !!v;
        else el.value = v;
        if (el.type === 'range') {
          el.style.setProperty(
            '--fill',
            ((el.value - el.min) / (el.max - el.min)) * 100 + '%',
          );
          const o = $(`[data-o="${n}"]`, host);
          if (o)
            o.textContent =
              n === 'dither'
                ? (+el.value).toFixed(2)
                : el.value + (n === 'pct' ? '%' : '');
        }
      });
      if (f('preset')) {
        f('preset').value =
          s.resizeOn && [25, 50, 75].includes(s.pct) ? String(s.pct) : 'custom';
      }
      if (f('w')) {
        f('w').value = Math.round(d.w * scaleOf(s));
        f('h').value = Math.round(d.h * scaleOf(s));
      }
      const orig = s.enc === 'orig',
        e = ENC[s.enc];
      $('[data-whole]', host).disabled = orig;
      $('[data-sub="resize"]', host).disabled = !s.resizeOn;
      $('[data-sub="palette"]', host).disabled = !s.colorsOn;
      f('quality').disabled = !!e.lossless;
      $('[data-qnote]', host).textContent = e.lossless
        ? `${e.short} is lossless, so there is no quality to adjust.`
        : '';
      $('[data-adv]', host).hidden = !s.adv;
      $('[data-hint]', host).textContent = orig
        ? 'The original has no settings to change.'
        : e.hint;
    }
    function handle(ev) {
      const t = ev.target,
        n = t.dataset.f;
      if (!n) return;
      const s = getSide(),
        d = dims();
      let group = 'other';
      const val =
        t.type === 'checkbox'
          ? t.checked
          : t.type === 'range' || t.type === 'number'
          ? +t.value
          : t.value;
      if (n === 'enc') {
        s.enc = val;
        group = 'format';
      } else if (n === 'quality') {
        s.quality = val;
        s.preset = 'custom';
        group = 'quality';
      } else if (n === 'resizeOn') {
        s.resizeOn = val;
        if (val && s.pct >= 100) s.pct = 50;
        group = 'resize';
      } else if (n === 'preset') {
        if (val !== 'custom') {
          s.pct = +val;
          s.resizeOn = true;
        }
        group = 'resize';
      } else if (n === 'w') {
        s.pct = clamp(Math.round((val / d.w) * 100) || 1, 1, 100);
        s.resizeOn = true;
        group = 'resize';
      } else if (n === 'h') {
        s.pct = clamp(Math.round((val / d.h) * 100) || 1, 1, 100);
        s.resizeOn = true;
        group = 'resize';
      } else if (n === 'pct') {
        s.pct = val;
        s.resizeOn = true;
        group = 'resize';
      } else if (n === 'colorsOn') {
        s.colorsOn = val;
        group = 'colours';
      } else if (n === 'colors') {
        s.colorsOn = true;
        s.colors = val;
        group = 'colours';
      } else s[n] = val;
      sync();
      onChange(group, ev.type === 'input' && t.type === 'range');
    }
    host.addEventListener('input', handle);
    host.addEventListener('change', handle);
    sync();
    return { sync, f };
  }

  /* ---------- Intro ---------- */
  function initIntro() {
    const drop = $('#drop'),
      input = $('#file');
    $('#choose').addEventListener('click', () => input.click());
    input.addEventListener(
      'change',
      () => input.files.length && handleFiles(input.files),
    );
    const paste = $('#paste');
    if (!(navigator.clipboard && navigator.clipboard.read))
      $('#pasteWrap').hidden = true;
    else
      paste.addEventListener('click', async () => {
        try {
          for (const item of await navigator.clipboard.read()) {
            const type = item.types.find((t) => t.startsWith('image/'));
            if (type) {
              const blob = await item.getType(type);
              handleFiles([
                new File([blob], 'pasted-image.' + type.split('/')[1], {
                  type,
                }),
              ]);
              return;
            }
          }
          snack(
            'No picture found in the clipboard. Copy an image first, then try again.',
          );
        } catch {
          snack(
            "We couldn't read the clipboard. Your browser may need your permission first.",
          );
        }
      });
    addEventListener('paste', (e) => {
      const fs = [...(e.clipboardData?.files || [])];
      if (fs.length) handleFiles(fs);
      else
        snack(
          'No picture found in the clipboard. Copy an image first, then try again.',
        );
    });
    let depth = 0;
    const over = (on) => {
      drop.classList.toggle('is-over', on);
      drop.setAttribute('aria-label', on ? 'Let go to start' : '');
    };
    addEventListener('dragenter', (e) => {
      e.preventDefault();
      depth++;
      over(true);
    });
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('dragleave', () => {
      depth = Math.max(0, depth - 1);
      if (!depth) over(false);
    });
    addEventListener('drop', (e) => {
      e.preventDefault();
      depth = 0;
      over(false);
      if (e.dataTransfer?.files.length) handleFiles(e.dataTransfer.files);
    });
    if (location.hash === '#dragover') drop.classList.add('is-over');
    $$('[data-demo]').forEach((a) =>
      a.addEventListener('click', () =>
        saveSession({ kind: 'demo', key: a.dataset.demo }),
      ),
    );
    let deferred;
    const inst = $('#install');
    addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      inst.hidden = false;
    });
    inst.addEventListener('click', async () => {
      if (deferred) {
        deferred.prompt();
        deferred = null;
        inst.hidden = true;
      }
    });
    if (location.hash === '#install') inst.hidden = false;
  }

  /* ---------- Editor ---------- */
  function initEditor() {
    const subject = getSubject();
    const state = { left: mkSide('orig'), right: mkSide('webp') };
    const cmp = new Compare($('#cmp'));
    const results = { left: null, right: null };
    const urls = { left: null, right: null };
    let real = { img: null, bytes: 0 },
      token = 0,
      timer,
      pending = '';
    const dims = () => ({
      w: real.img?.naturalWidth || subject.w || 1400,
      h: real.img?.naturalHeight || subject.h || 541,
    });

    $('#fileName').textContent = subject.name;
    $('#fileSize').textContent = fmt(subject.bytes);
    $('#sentenceNoun').textContent =
      subject.raster === false ? 'icon' : 'picture';
    if (!CAN_REAL) $('#approx').hidden = false;

    const sentence = Sentence($('#sentence'), {
      getSide: () => state.right,
      onPick: (k) => commit([k]),
      onMore: (k, focus) => {
        $('#more').open = true;
        const el = $(`#R-${focus}`);
        if (el) {
          el.scrollIntoView({
            block: 'center',
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'auto'
              : 'smooth',
          });
          el.focus({ preventScroll: true });
        }
      },
    });

    const sides = {};
    [
      ['left', 'Original', 'L'],
      ['right', 'Result', 'R'],
    ].forEach(([sk, label, p]) => {
      const host = $(`#side-${sk}`);
      host.innerHTML = `<h3>${label}</h3>
        <div class="bubble"><p data-bubble></p><button type="button" class="btn secondary small" data-dl>${ic(
          'download',
        )} Download</button></div>
        <div data-form></div>
        <div class="utils" role="group" aria-label="${label} settings">
          <button type="button" class="tool" data-util="copy">${ic(
            'copy',
          )}<span>Copy settings to ${
        sk === 'left' ? 'result' : 'original'
      }</span></button>
          <button type="button" class="tool" data-util="save">${ic(
            'save',
          )}<span>Save settings</span></button>
          <button type="button" class="tool" data-util="import">${ic(
            'import',
          )}<span>Import saved settings</span></button>
        </div>`;
      sides[sk] = buildOptions($('[data-form]', host), p, {
        getSide: () => state[sk],
        dims,
        onChange: (group, soft) =>
          commit(sk === 'right' && group !== 'other' ? [group] : [], soft),
      });
      $('[data-dl]', host).addEventListener('click', () => download(sk));
      host.addEventListener('click', (e) => {
        const u = e.target.closest('[data-util]');
        if (!u) return;
        const other = sk === 'left' ? 'right' : 'left';
        if (u.dataset.util === 'copy') {
          Object.assign(state[other], JSON.parse(JSON.stringify(state[sk])));
          snack(
            `Settings copied to the ${
              other === 'left' ? 'original' : 'result'
            } side.`,
          );
          commit(
            other === 'right' ? ['format', 'quality', 'resize', 'colours'] : [],
          );
        } else if (u.dataset.util === 'save') {
          try {
            localStorage.setItem(
              'sq.sentence.saved',
              JSON.stringify(state[sk]),
            );
            snack('Settings saved on this device.');
          } catch {
            snack("Your browser wouldn't let us save settings here.");
          }
        } else {
          try {
            const v = JSON.parse(localStorage.getItem('sq.sentence.saved'));
            if (!v) throw 0;
            Object.assign(state[sk], v);
            snack('Saved settings loaded.');
            commit(
              sk === 'right' ? ['format', 'quality', 'resize', 'colours'] : [],
            );
          } catch {
            snack('Nothing saved yet. Choose "Save settings" first.');
          }
        }
      });
    });

    function commit(keys, soft) {
      sentence.refresh();
      Object.values(sides).forEach((s) => s.sync());
      keys.forEach((k) => markBlank(k, soft));
      if (keys.length && !soft)
        pending = `${OPTS[keys[0]].title}: ${blankText(
          state.right,
          keys[0],
        )}. `;
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      $('#result').setAttribute('aria-busy', 'true');
      $(
        '#result',
      ).innerHTML = `<span class="spinner" aria-hidden="true"></span><span>Working on it...</span>`;
      $$('[data-bubble]').forEach(
        (b) =>
          (b.innerHTML =
            '<span class="spinner" aria-hidden="true"></span> Working...'),
      );
      timer = setTimeout(run, CAN_REAL ? 120 : 220);
    }
    async function compute(s) {
      if (s.enc === 'orig')
        return {
          bytes: subject.bytes,
          url: subject.src,
          filter: '',
          orig: true,
        };
      const e = ENC[s.enc];
      if (real.bytes && subject.raster) {
        try {
          const blob = await encodeBlob(real.img, s);
          if (blob)
            return {
              bytes: (blob.size * subject.bytes) / real.bytes,
              url: URL.createObjectURL(blob),
              filter: '',
              blob,
              ext: e.ext,
              real: true,
            };
        } catch {
          /* fall through to the estimate */
        }
      }
      return {
        bytes: estimate(s, subject.bytes),
        url: subject.src,
        filter: blurFor(s),
        ext: e.ext,
      };
    }
    async function run() {
      const t = ++token;
      const L = await compute(state.left),
        R = await compute(state.right);
      if (t !== token) {
        [L, R].forEach((r) => r.real && URL.revokeObjectURL(r.url));
        return;
      }
      ['left', 'right'].forEach((k) => {
        if (urls[k]) URL.revokeObjectURL(urls[k]);
        urls[k] = (k === 'left' ? L : R).real
          ? (k === 'left' ? L : R).url
          : null;
      });
      results.left = L;
      results.right = R;
      cmp.setSources({
        left: L.url,
        right: R.url,
        leftFilter: L.filter,
        rightFilter: R.filter,
      });
      $('#tagL').textContent =
        state.left.enc === 'orig' ? 'Original' : ENC[state.left.enc].short;
      $('#tagR').textContent =
        state.right.enc === 'orig' ? 'Original' : ENC[state.right.enc].short;
      [
        ['left', L],
        ['right', R],
      ].forEach(([sk, r]) => {
        const b = $(`#side-${sk} [data-bubble]`);
        const pc = pctSmaller(subject.bytes, r.bytes);
        b.innerHTML = r.orig
          ? `<span class="num">${fmt(r.bytes)}</span><span>Original</span>`
          : `<span class="num">${fmt(r.bytes)}</span><span class="pct">${
              pc >= 1
                ? pc + '% smaller'
                : pc <= -1
                ? -pc + '% bigger'
                : 'about the same'
            }</span>`;
      });
      const o = subject.bytes,
        b = R.bytes,
        pc = pctSmaller(o, b);
      let html, plain;
      if (R.orig) {
        html = `This is still your original, ${fmt(
          o,
        )}. Pick a format above to make it smaller.`;
        plain = `This is still your original, ${fmt(o)}.`;
      } else if (pc >= 1) {
        html = `That makes it <span class="good">${pc}% smaller</span>: <span class="num">${fmt(
          o,
        )} → ${fmt(b)}</span>.`;
        plain = `That makes it ${pc}% smaller: ${fmt(o)} to ${fmt(b)}.`;
      } else if (pc <= -1) {
        html = `<span class="warn">That came out ${-pc}% bigger</span>: <span class="num">${fmt(
          o,
        )} → ${fmt(b)}</span>. Try WebP or a smaller quality.`;
        plain = `That came out ${-pc}% bigger: ${fmt(o)} to ${fmt(
          b,
        )}. Try WebP or a smaller quality.`;
      } else {
        html = `That's about the same size: <span class="num">${fmt(o)} → ${fmt(
          b,
        )}</span>.`;
        plain = `That is about the same size: ${fmt(o)} to ${fmt(b)}.`;
      }
      const res = $('#result');
      res.removeAttribute('aria-busy');
      res.innerHTML = `<span>${html}<small>Stays on your device. Nothing is uploaded.</small></span>`;
      res.classList.remove('rewrite');
      void res.offsetWidth;
      res.classList.add('rewrite');
      if (pending) {
        announce(pending + plain);
        pending = '';
      }
    }
    function download(sk) {
      const r = results[sk];
      if (!r) return;
      const base = subject.name.replace(/\.[^.]+$/, '');
      const a = document.createElement('a');
      if (r.blob) {
        a.href = r.url;
        a.download = `${base}.${r.ext}`;
      } else {
        a.href = subject.src;
        a.download = subject.name;
      }
      document.body.append(a);
      a.click();
      a.remove();
      snack(
        r.blob
          ? `Saved ${a.download}.`
          : `Saved a copy of ${subject.name}. (This preview can only encode when served over http.)`,
      );
    }
    $('#download').addEventListener('click', () => download('right'));

    /* toolbar */
    const zin = $('#zoomInput');
    const setZoom = (z) => {
      zin.value = cmp.setZoom(z) + '%';
    };
    $('#zoomIn').addEventListener('click', () => setZoom(cmp.zoom + 25));
    $('#zoomOut').addEventListener('click', () => setZoom(cmp.zoom - 25));
    zin.addEventListener('change', () =>
      setZoom(parseInt(zin.value, 10) || 100),
    );
    zin.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') setZoom(parseInt(zin.value, 10) || 100);
    });
    $('#rotate').addEventListener('click', () => {
      cmp.setRot(cmp.rot + 90);
      announce(`Rotated to ${cmp.rot} degrees.`);
    });
    const tog = (id, fn) => {
      const b = $(id);
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on);
        fn(on);
      });
    };
    tog('#layout', (on) => {
      cmp.setLayout(on ? 'sbs' : 'slide');
      announce(
        on ? 'Showing original and result side by side.' : 'Slide to compare.',
      );
    });
    tog('#smooth', (on) => $('#cmp').classList.toggle('pixelated', on));
    tog('#bg', (on) => {
      cmp.stage.classList.toggle('bg-checker', !on);
    });
    $('#add').addEventListener('click', () => $('#addFile').click());
    $('#addFile').addEventListener(
      'change',
      (e) => e.target.files.length && handleFiles(e.target.files),
    );

    /* load */
    getReal(subject.src).then((r) => {
      real = r;
      const d = dims();
      $('#fileDims').textContent = `${d.w} × ${d.h}`;
      cmp.setDims(d.w, d.h);
      Object.values(sides).forEach((s) => s.sync());
      schedule();
    });
    $('#fileDims').textContent = `${dims().w} × ${dims().h}`;
    cmp.setDims(dims().w, dims().h);
    cmp.setSources({ left: subject.src, right: subject.src });
    sentence.refresh();
    schedule();
  }

  /* ---------- Bulk ---------- */
  function initBulk() {
    const ses = loadSession();
    const names = ['photo', 'art', 'screen'];
    let TILES;
    if (ses && ses.kind === 'files') {
      TILES = ses.files.map((f, i) => ({
        n: f.name,
        d: names[i % 3],
        b: f.size,
        c: 1 + (i % 3) * 0.5,
        s: 'waiting',
      }));
    } else {
      TILES = [
        { n: 'holiday-01.jpg', d: 'photo', b: 2.8e6, c: 1, s: 'done' },
        { n: 'harbour-wide.jpg', d: 'art', b: 2.9e6, c: 1.3, s: 'done' },
        { n: 'phone-screenshot.png', d: 'screen', b: 1.6e6, c: 2.6, s: 'done' },
        { n: 'beach-sunset.jpg', d: 'photo', b: 3.4e6, c: 1.1, s: 'done' },
        { n: 'poster-draft.jpg', d: 'art', b: 2.2e6, c: 1.4, s: 'done' },
        { n: 'receipt-scan.png', d: 'screen', b: 1.1e6, c: 2.2, s: 'done' },
        { n: 'garden.jpg', d: 'photo', b: 3.1e6, c: 1, s: 'done' },
        {
          n: 'family-dinner.jpg',
          d: 'photo',
          b: 2.6e6,
          c: 1.1,
          s: 'converting',
        },
        { n: 'sketch-two.jpg', d: 'art', b: 2.4e6, c: 1.3, s: 'waiting' },
        { n: 'menu-photo.png', d: 'screen', b: 0.9e6, c: 2.4, s: 'waiting' },
        { n: 'market-day.jpg', d: 'photo', b: 3.0e6, c: 1, s: 'waiting' },
        {
          n: 'IMG_0457.HEIC',
          d: null,
          ext: 'HEIC',
          b: 2.1e6,
          c: 1,
          s: 'error',
          err: "this browser can't open HEIC pictures yet. Save a JPEG copy and add that one instead.",
        },
      ];
    }
    const side = mkSide('webp');
    side.resizeOn = true;
    side.pct = 50;
    const grid = $('#grid'),
      total = TILES.length;
    let running = false,
      dlgIndex = -1;
    const newSize = (t) => estimate(side, t.b, t.c);

    const sentence = Sentence($('#sentence'), {
      getSide: () => side,
      onPick: (k) => commit([k]),
      onMore: (k, focus) => {
        $('#more').open = true;
        const el = $(`#B-${focus}`);
        if (el) {
          el.scrollIntoView({ block: 'center' });
          el.focus({ preventScroll: true });
        }
      },
    });
    const form = buildOptions($('#bulk-form'), 'B', {
      bulk: true,
      hasOrig: false,
      getSide: () => side,
      dims: () => ({ w: 1400, h: 541 }),
      onChange: (g, soft) => commit(g === 'other' ? [] : [g], soft),
    });
    $('#count').textContent = total;

    function commit(keys, soft) {
      sentence.refresh();
      form.sync();
      keys.forEach((k) => markBlank(k, soft));
      renderAll();
      if (keys.length && !soft)
        announce(
          `${OPTS[keys[0]].title}: ${blankText(
            side,
            keys[0],
          )}. Applies to all ${total} pictures. ${saveLine()}`,
        );
    }
    function totals() {
      let o = 0,
        n = 0;
      TILES.filter((t) => t.s === 'done').forEach((t) => {
        o += t.b;
        n += newSize(t);
      });
      return { o, n, saved: o - n };
    }
    const saveLine = () => {
      const t = totals();
      return t.o ? `You saved ${fmt(t.saved)}.` : '';
    };

    function tileHTML(t, i) {
      const chip = {
        waiting: `${ic('clock')}Waiting`,
        converting: `<span class="spinner" aria-hidden="true"></span>Converting`,
        done: `${ic('check')}Saved ${pctSmaller(t.b, newSize(t))}%`,
        error: `${ic('alert')}Couldn't convert`,
      }[t.s];
      const thumb = t.d
        ? `<img src="${DEMOS[t.d].src}" alt="Preview of ${esc(
            t.n,
          )}" loading="lazy">`
        : `<span class="ext" aria-hidden="true">.${t.ext}</span>`;
      const sizes =
        t.s === 'done' ? `${fmt(t.b)} → ${fmt(newSize(t))}` : fmt(t.b);
      return `<li class="tile" data-state="${t.s}" data-i="${i}">
        <button type="button" class="tile-open" data-open="${i}"><span class="thumb">${thumb}</span><span class="chip">${chip}</span></button>
        <div class="tile-info"><p class="name">${esc(
          t.n,
        )}</p><p class="sizes">${sizes}</p>${
        t.s === 'error'
          ? `<p class="err">Couldn't convert: ${esc(
              t.err,
            )}</p><button type="button" class="btn secondary small" data-retry="${i}">${ic(
              'rotate',
            )} Try again</button>`
          : ''
      }</div></li>`;
    }
    function renderAll() {
      const ae = document.activeElement,
        fk =
          ae && grid.contains(ae)
            ? ae.dataset.open != null
              ? 'open'
              : 'retry'
            : null,
        fv = fk ? ae.dataset[fk] : null;
      grid.innerHTML = TILES.map(tileHTML).join('');
      const done = TILES.filter((t) => t.s === 'done').length,
        err = TILES.filter((t) => t.s === 'error').length;
      const busy = running || TILES.some((t) => t.s === 'converting');
      $('#sub').textContent = `${total} pictures · ${done} converted`;
      const line = $('#progressLine');
      line.innerHTML = busy
        ? `<span class="spinner" aria-hidden="true" style="color:var(--accent)"></span>Converting ${done} of ${total}`
        : done === total
        ? `All ${total} pictures are converted.`
        : `${done} of ${total} converted${
            err ? `. ${err} needs a look.` : '.'
          }`;
      $('#bar').style.setProperty('--p', (done / total) * 100 + '%');
      const bar = $('#barWrap');
      bar.setAttribute('aria-valuenow', done);
      bar.setAttribute('aria-valuetext', `${done} of ${total} converted`);
      const t = totals();
      $('#saved').innerHTML = done
        ? `You saved ${fmt(t.saved)} <span>(${fmt(t.o)} became ${fmt(
            t.n,
          )})</span>`
        : 'Nothing converted yet.';
      const zip = $('#zip');
      if (!zip.getAttribute('aria-busy')) zip.disabled = done === 0;
      const ca = $('#convertAll');
      ca.disabled = false;
      ca.setAttribute('aria-busy', busy && running ? 'true' : 'false');
      ca.innerHTML = running
        ? `<span class="spinner" aria-hidden="true"></span> Converting...`
        : 'Convert all';
      if (running) ca.setAttribute('aria-disabled', 'true');
      else ca.removeAttribute('aria-disabled');
      if (fk) {
        const n = $(`[data-${fk}="${fv}"]`, grid);
        n && n.focus({ preventScroll: true });
      }
    }
    async function convertOne(t) {
      t.s = 'converting';
      renderAll();
      await wait(650 + Math.random() * 700);
      t.s = 'done';
      renderAll();
    }
    async function convertAll() {
      if (running) return;
      const queue = TILES.filter((t) => t.s === 'waiting');
      if (!queue.length) {
        snack('Everything that can be converted is already done.');
        return;
      }
      running = true;
      renderAll();
      announce(`Converting ${queue.length} pictures.`);
      const worker = async () => {
        while (queue.length) await convertOne(queue.shift());
      };
      await Promise.all([worker(), worker()]);
      running = false;
      renderAll();
      announce(`Finished. ${saveLine()}`);
    }
    $('#convertAll').addEventListener('click', convertAll);
    $('#zip').addEventListener('click', async (e) => {
      const z = e.currentTarget;
      if (z.disabled) return;
      z.setAttribute('aria-busy', 'true');
      z.disabled = true;
      z.innerHTML =
        '<span class="spinner" aria-hidden="true"></span> Making ZIP...';
      await wait(1400);
      z.removeAttribute('aria-busy');
      z.disabled = false;
      z.innerHTML = `${ic('download')} Download all as ZIP`;
      snack('Your ZIP is ready. (Prototype: nothing was saved.)');
    });
    grid.addEventListener('click', async (e) => {
      const r = e.target.closest('[data-retry]');
      if (r) {
        const t = TILES[+r.dataset.retry];
        t.s = 'converting';
        renderAll();
        await wait(1300);
        t.s = 'error';
        t.err =
          "still can't open HEIC pictures. Please save a JPEG copy and add that one instead.";
        renderAll();
        const again = $(`[data-retry="${r.dataset.retry}"]`);
        again && again.focus();
        return;
      }
      const o = e.target.closest('[data-open]');
      if (o) openDialog(+o.dataset.open, o);
    });

    /* comparison dialog */
    const dlg = $('#dlg'),
      dcmp = new Compare($('#dcmp'));
    let opener = null;
    async function openDialog(i, from) {
      const t = TILES[i];
      dlgIndex = i;
      opener = from;
      $('#dlgTitle').textContent = t.n;
      const sum = $('#dlgSummary');
      if (t.s === 'done') {
        const n = newSize(t);
        sum.innerHTML = `<span>Original <b class="num">${fmt(t.b)}</b> became ${
          ENC[side.enc].short
        } <b class="num">${fmt(
          n,
        )}</b>. That's <span style="color:var(--ok);font-weight:700">${pctSmaller(
          t.b,
          n,
        )}% smaller</span>.<small class="note" style="display:block">To change this, edit the sentence on the page. It applies to every picture.</small></span>`;
      } else if (t.s === 'error')
        sum.innerHTML = `<span>Couldn't convert: ${esc(t.err)}</span>`;
      else
        sum.innerHTML = `<span>${
          t.s === 'converting'
            ? 'Still converting this one. Preview below shows your current settings.'
            : 'Not converted yet. Preview below shows your current settings.'
        }</span>`;
      $('#dlgDownload').hidden = t.s !== 'done';
      const d = t.d ? DEMOS[t.d] : DEMOS.photo;
      dcmp.setDims(d.w, d.h);
      dcmp.setSources({
        left: d.src,
        right: d.src,
        leftFilter: '',
        rightFilter: blurFor(side),
      });
      dcmp.setPos(50);
      dlg.showModal();
      dcmp.fit();
      if (CAN_REAL && t.d && DEMOS[t.d].raster) {
        const r = await getReal(d.src);
        try {
          const blob = await encodeBlob(r.img, side);
          if (blob && dlgIndex === i)
            dcmp.setSources({
              right: URL.createObjectURL(blob),
              rightFilter: '',
            });
        } catch {
          /* keep blur preview */
        }
      }
    }
    function closeDialog() {
      dlg.close();
    }
    $('#dlgClose').addEventListener('click', closeDialog);
    $('#dlgDownload').addEventListener('click', () =>
      snack('Saved this picture. (Prototype: nothing was written to disk.)'),
    );
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) closeDialog();
    });
    dlg.addEventListener('close', () => {
      dlgIndex = -1;
      opener && document.contains(opener) && opener.focus();
    });

    sentence.refresh();
    form.sync();
    renderAll();
    // the one tile that is "converting" on arrival finishes after a few seconds
    TILES.filter((t) => t.s === 'converting').forEach(async (t) => {
      await wait(6000);
      if (t.s === 'converting') {
        t.s = 'done';
        renderAll();
        announce(`${t.n} is done. ${saveLine()}`);
      }
    });
  }

  /* ---------- Boot ---------- */
  const page = document.body.dataset.page;
  if (page === 'intro') initIntro();
  else if (page === 'editor') initEditor();
  else if (page === 'bulk') initBulk();
  const addFile = $('#addFile');
  if (page === 'bulk' && $('#addMore')) {
    $('#addMore').addEventListener('click', () => addFile.click());
    addFile.addEventListener(
      'change',
      (e) => e.target.files.length && handleFiles(e.target.files),
    );
  }
})();
