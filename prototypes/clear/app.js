/* Clear: shared behaviour for index / editor / bulk. Vanilla JS, no build step. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const page = document.body.dataset.page;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Icon sprite (one stroke family, 24px grid) ---------- */
  const ICONS = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    install:
      '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M12 8v6m0 0l-2-2m2 2l2-2"/>',
    upload:
      '<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>',
    clipboard:
      '<rect x="5" y="5" width="14" height="16" rx="2.5"/><rect x="9" y="3" width="6" height="4" rx="1.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
    github:
      '<path d="M9 19c-4 1.2-4-2-6-2.5m12 4.5v-3.2c0-.9.1-1.3-.4-1.8 2.6-.3 5.4-1.3 5.4-5.8 0-1.3-.5-2.3-1.2-3.2.1-.3.5-1.6-.1-3.2 0 0-1-.3-3.3 1.2a11.4 11.4 0 00-6 0C7.6 3.3 6.6 3.6 6.6 3.6c-.6 1.6-.2 2.9-.1 3.2A4.600 4.600 0 005.300 10c0 4.500 2.800 5.500 5.400 5.800-.5.500-.5 1-.4 1.800V21"/>',
    back: '<path d="M19 12H5m0 0l6-6m-6 6l6 6"/>',
    arrow: '<path d="M5 12h14m0 0l-6-6m6 6l-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    rotate: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4.5V11h-6.5"/>',
    pixel:
      '<path d="M4 4h5v5H4zM15 4h5v5h-5zM9.5 9.5h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z"/>',
    checker:
      '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M12 4v16M4 12h16"/>',
    split:
      '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M12 5v14"/>',
    columns:
      '<rect x="3.5" y="5" width="7.5" height="14" rx="2"/><rect x="13" y="5" width="7.5" height="14" rx="2"/>',
    grip: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
    spinner: '<path d="M12 3a9 9 0 019 9"/>',
    chev: '<path d="M6 9.5l6 6 6-6"/>',
    download:
      '<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5"/><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>',
    refresh:
      '<path d="M4 12a8 8 0 0114-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 01-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
    zip: '<rect x="3.5" y="4" width="17" height="4.5" rx="1.5"/><path d="M5 8.5V18a2 2 0 002 2h10a2 2 0 002-2V8.5M10 12.5h4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7.5a2 2 0 002 2h2.5"/>',
    save: '<path d="M6 4h9l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"/><path d="M8 4v5h6V4M8 20v-6h8v6"/>',
    import:
      '<path d="M3.5 7.5a2 2 0 012-2H10l2 2.5h6.5a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>',
    warning: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  };
  const icon = (n, cls = 'ic ic-sm') =>
    `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  (function sprite() {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', '0');
    s.setAttribute('height', '0');
    s.setAttribute('aria-hidden', 'true');
    s.style.position = 'absolute';
    s.innerHTML = Object.entries(ICONS)
      .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`)
      .join('');
    document.body.prepend(s);
  })();

  /* ---------- Utilities ---------- */
  function fmt(b) {
    if (b < 1000) return Math.round(b) + ' B';
    if (b < 1e6)
      return (b < 1e4 ? (b / 1e3).toFixed(1) : Math.round(b / 1e3)) + ' KB';
    return (b < 1e8 ? (b / 1e6).toFixed(1) : Math.round(b / 1e6)) + ' MB';
  }
  let snackTimer;
  function toast(msg, kind) {
    let el = $('#snackbar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'snackbar';
      el.className = 'snackbar';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.textContent = msg;
    el.classList.toggle('is-error', kind === 'error');
    el.classList.add('is-open');
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => el.classList.remove('is-open'), 4200);
  }
  const SVG_MARK =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="16" fill="#2762EA"/><path d="M20 26l9 6-9 6M44 26l-9 6 9 6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    );
  const DEMOS = {
    photo: {
      name: 'photo.jpg',
      label: 'Large photo',
      src: '../assets/photo.jpg',
      size: 2800000,
    },
    art: {
      name: 'artwork.jpg',
      label: 'Artwork',
      src: '../assets/artwork.jpg',
      size: 2900000,
    },
    pixel3: {
      name: 'pixel3.png',
      label: 'Device screen',
      src: '../assets/screen.jpg',
      size: 1600000,
    },
    icon: {
      name: 'squoosh.svg',
      label: 'SVG icon',
      src: SVG_MARK,
      size: 13000,
    },
  };

  /* ---------- Encoders ---------- */
  const ENCODERS = [
    ['original', 'Original Image'],
    ['mozjpeg', 'MozJPEG'],
    ['webp', 'WebP'],
    ['avif', 'AVIF'],
    ['jxl', 'JPEG XL (beta)'],
    ['webp2', 'WebP v2 (unstable)'],
    ['oxipng', 'OxiPNG'],
    ['qoi', 'QOI'],
    ['browserpng', 'Browser PNG'],
    ['browserjpeg', 'Browser JPEG'],
    ['browsergif', 'Browser GIF'],
  ];
  const ENC_LABEL = Object.fromEntries(ENCODERS);
  const FRIENDLY = { webp: 'WebP', mozjpeg: 'JPEG', oxipng: 'PNG' };
  const LOSSLESS = new Set(['oxipng', 'qoi', 'browserpng', 'browsergif']);
  const VISUAL = {
    webp: 'image/webp',
    mozjpeg: 'image/jpeg',
    browserjpeg: 'image/jpeg',
    avif: 'image/avif',
    jxl: 'image/webp',
    webp2: 'image/webp',
    oxipng: 'image/png',
    browserpng: 'image/png',
    qoi: 'image/png',
    browsergif: 'image/png',
  };
  const REAL_SIZE = new Set([
    'webp',
    'mozjpeg',
    'browserjpeg',
    'avif',
    'oxipng',
    'browserpng',
  ]);
  const BASE = {
    mozjpeg: 0.0764,
    browserjpeg: 0.09,
    webp: 0.0533,
    webp2: 0.05,
    avif: 0.042,
    jxl: 0.048,
    oxipng: 0.55,
    browserpng: 0.75,
    qoi: 0.85,
    browsergif: 0.4,
  };
  const HINTS = {
    webp: 'WebP: small files, works in all modern browsers.',
    mozjpeg: 'JPEG: works everywhere, great for photos.',
    oxipng:
      'PNG: no quality loss, best for screenshots and logos. Files are larger.',
    avif: 'AVIF: the smallest files, but older browsers cannot open them.',
    jxl: 'JPEG XL (beta): very small files, few apps can open them yet.',
    webp2: 'WebP v2 (unstable): experimental, not ready for everyday use.',
    qoi: 'QOI: fast and lossless, but few apps can open it.',
    browserpng: 'Browser PNG: lossless PNG made by your browser.',
    browserjpeg:
      'Browser JPEG: JPEG made by your browser, usually a bit larger.',
    browsergif: 'Browser GIF: only 256 colors, best for simple graphics.',
    original: 'This keeps your original file as it is.',
  };
  const EXT_OF_MIME = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/avif': 'avif',
    'image/gif': 'gif',
  };

  function estimate(orig, o, scale = 1) {
    if (o.encoder === 'original') return orig;
    let r = BASE[o.encoder] || 0.1;
    if (!LOSSLESS.has(o.encoder)) r *= Math.exp(0.035 * (o.quality - 75));
    if (o.palette && o.palette.on) r *= 0.35 + 0.65 * (o.palette.colors / 256);
    return Math.max(300, Math.round(orig * r * scale * scale));
  }
  const pctSaved = (orig, size) =>
    clamp(Math.round((1 - size / orig) * 100), -999, 99);

  /* ---------- Settings state + generic binding ---------- */
  const mk = (encoder, quality = 75) => ({
    encoder,
    quality,
    resize: {
      on: false,
      preset: 'original',
      width: 1400,
      height: 541,
      method: 'lanczos3',
      fit: 'stretch',
      premul: true,
      linear: false,
    },
    palette: { on: false, colors: 256, dither: 0.5 },
    showCodec: false,
    mozjpeg: {
      channels: 'ycbcr',
      sepChroma: false,
      chromaQuality: 75,
      subsample: '2',
      progressive: true,
      optimize: true,
      trellis: true,
      smoothing: 0,
    },
  });
  let S = {};
  let K = 'right'; // key of the side the primary panel edits
  let onChange = () => {};
  const getP = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
  function setP(p, v) {
    const a = p.split('.');
    const last = a.pop();
    a.reduce((o, k) => o[k], S)[last] = v;
  }

  function syncInputs() {
    $$('[data-bind]').forEach((el) => {
      const p = el.dataset.bind;
      const v = getP(p);
      if (v === undefined) return;
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el !== document.activeElement || el.type === 'range')
        el.value = v;
      if (el.type === 'range') {
        const min = +el.min || 0,
          max = +el.max || 100;
        el.style.setProperty(
          '--fill',
          ((el.value - min) / (max - min)) * 100 + '%',
        );
        const out =
          el.previousElementSibling && $('output', el.previousElementSibling);
        if (out)
          out.textContent = p.endsWith('scale')
            ? el.value + '%'
            : p.endsWith('dither')
            ? (+el.value).toFixed(1)
            : el.value;
      }
    });
    $$('[data-show-if]').forEach((el) => {
      el.hidden = !getP(el.dataset.showIf);
    });
    ['left', 'right', 's'].forEach((k) => {
      if (!S[k]) return;
      const enc = S[k].encoder;
      $$(`[data-side="${k}"]`).forEach((b) => {
        $$('[data-edit],[data-compress]', b).forEach((x) => {
          x.hidden = enc === 'original';
        });
        $$('[data-lossy]', b).forEach((x) => {
          x.hidden = LOSSLESS.has(enc) || enc === 'original';
        });
        $$('[data-codec]', b).forEach((x) => {
          x.hidden = !(enc === 'mozjpeg' && S[k].showCodec);
        });
        $$('[data-codec-toggle]', b).forEach((x) => {
          x.hidden = enc !== 'mozjpeg';
        });
        $$('[data-mozjpeg-chroma]', b).forEach((x) => {
          x.hidden = !S[k].mozjpeg.sepChroma;
        });
      });
    });
  }

  function syncPrimary() {
    const o = S[K];
    if (!o) return;
    const chips = $$('#formatChips .chip');
    const main = ['webp', 'mozjpeg', 'oxipng'];
    const moreOpen = $('#moreChip') && $('#moreChip').dataset.open === '1';
    const isMore = !main.includes(o.encoder) && o.encoder !== 'original';
    chips.forEach((c) => {
      const on =
        c.dataset.enc === 'more' ? isMore : c.dataset.enc === o.encoder;
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    const mf = $('#moreFormats');
    if (mf) mf.hidden = !(isMore || moreOpen);
    const hint = $('#formatHint');
    if (hint) hint.textContent = HINTS[o.encoder] || '';
    const q = o.quality;
    const preset =
      q === 50
        ? 'smallest'
        : q === 75
        ? 'balanced'
        : q === 90
        ? 'best'
        : 'custom';
    const off = LOSSLESS.has(o.encoder) || o.encoder === 'original';
    $$('#presets button').forEach((b) => {
      b.setAttribute(
        'aria-checked',
        b.dataset.preset === preset ? 'true' : 'false',
      );
      b.disabled = b.dataset.preset === 'custom' ? true : off;
    });
    const qr = $('#quality');
    if (qr) {
      qr.disabled = off;
      const note = $('#qualityNote');
      if (note)
        note.textContent = off
          ? o.encoder === 'original'
            ? 'The original is kept as it is.'
            : 'This format is lossless, so there is no quality to lower.'
          : 'Higher quality keeps more detail but makes the file bigger.';
    }
  }

  function afterChange() {
    syncInputs();
    syncPrimary();
    onChange();
  }

  function wirePanel() {
    document.addEventListener('input', onBind);
    document.addEventListener('change', onBind);
    function onBind(e) {
      const el = e.target.closest && e.target.closest('[data-bind]');
      if (!el) return;
      if (
        e.type === 'input' &&
        (el.tagName === 'SELECT' || el.type === 'checkbox') &&
        e.isTrusted === false
      )
        return;
      let v =
        el.type === 'checkbox'
          ? el.checked
          : el.type === 'range' || el.type === 'number'
          ? +el.value
          : el.value;
      if (el.type === 'number' && (!isFinite(v) || v < 1)) return;
      const p = el.dataset.bind;
      setP(p, v);
      if (typeof onField === 'function') onField(p, v);
      afterChange();
    }
    $$('#formatChips .chip').forEach((c) =>
      c.addEventListener('click', () => {
        const o = S[K];
        if (c.dataset.enc === 'more') {
          c.dataset.open = '1';
          const sel = $('#moreSelect');
          const extras = $$('option', sel).map((x) => x.value);
          if (!extras.includes(o.encoder)) o.encoder = extras[0];
        } else {
          o.encoder = c.dataset.enc;
          const mc = $('#moreChip');
          if (mc) mc.dataset.open = '0';
        }
        afterChange();
      }),
    );
    $$('#presets button').forEach((b) =>
      b.addEventListener('click', () => {
        const q = { smallest: 50, balanced: 75, best: 90 }[b.dataset.preset];
        if (q) {
          S[K].quality = q;
          afterChange();
        }
      }),
    );
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const k = b.dataset.side,
        other = k === 'left' ? 'right' : 'left';
      if (b.dataset.act === 'copy') {
        S[other] = JSON.parse(JSON.stringify(S[k]));
        afterChange();
        toast(`Copied these settings to the ${other} side.`);
      }
      if (b.dataset.act === 'save') {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(S[k], null, 2)], {
            type: 'application/json',
          }),
        );
        const a = Object.assign(document.createElement('a'), {
          href: url,
          download: `squoosh-${k}-settings.json`,
        });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Settings saved to a small file you can import later.');
      }
      if (b.dataset.act === 'import') {
        const inp = Object.assign(document.createElement('input'), {
          type: 'file',
          accept: 'application/json,.json',
        });
        inp.onchange = async () => {
          try {
            Object.assign(S[k], JSON.parse(await inp.files[0].text()));
            afterChange();
            toast('Settings imported.');
          } catch (err) {
            toast(
              'That file is not a Squoosh settings file. Choose one you saved with Save settings.',
              'error',
            );
          }
        };
        inp.click();
      }
    });
  }
  let onField = null;

  function sideHTML(k, o) {
    const encs = ENCODERS.filter((e) => !(o.noOriginal && e[0] === 'original'));
    const b = (p) => `data-bind="${k}.${p}"`;
    const sw = (p, label) =>
      `<label class="switch"><input type="checkbox" role="switch" ${b(
        p,
      )}><span class="track"></span>${label}</label>`;
    const ck = (p, label) =>
      `<label class="check"><input type="checkbox" ${b(p)}>${label}</label>`;
    const sel = (p, label, opts) =>
      `<label class="field">${label}<select class="input" ${b(p)}>${opts
        .map(([v, t]) => `<option value="${v}">${t}</option>`)
        .join('')}</select></label>`;
    const rng = (p, label, min, max, step = 1) =>
      `<div><div class="range-head"><label>${label}</label><output></output></div><input type="range" min="${min}" max="${max}" step="${step}" ${b(
        p,
      )} aria-label="${label}"></div>`;
    const num = (p, label, unit) =>
      `<label class="field">${label}<span class="input-unit"><input class="input" type="number" min="1" max="8000" ${b(
        p,
      )}><span class="unit">${unit}</span></span></label>`;
    return `<div class="side-block" data-side="${k}">
      <div class="side-head"><h4>${o.title}</h4>${
      o.utils
        ? `<div class="side-utils">
        <button class="icon-btn" type="button" data-act="copy" data-side="${k}" aria-label="Copy these settings to the other side" title="Copy settings to the other side">${icon(
            'copy',
            'ic',
          )}</button>
        <button class="icon-btn" type="button" data-act="save" data-side="${k}" aria-label="Save these settings to a file" title="Save settings">${icon(
            'save',
            'ic',
          )}</button>
        <button class="icon-btn" type="button" data-act="import" data-side="${k}" aria-label="Import saved settings" title="Import saved settings">${icon(
            'import',
            'ic',
          )}</button></div>`
        : ''
    }</div>
      ${sel('encoder', 'Format', encs)}
      <div data-edit style="display:grid;gap:14px">
        <p class="group-title">Edit</p>
        ${
          o.scale
            ? ''
            : `${sw('resize.on', 'Resize')}
        <div class="opt-grid" data-show-if="${k}.resize.on">
          ${sel('resize.preset', 'Preset', [
            ['original', 'Original size'],
            ['0.5', 'Half size'],
            ['0.25', 'Quarter size'],
            ['custom', 'Custom'],
          ])}
          ${sel('resize.method', 'Method', [
            ['lanczos3', 'Lanczos3'],
            ['mitchell', 'Mitchell'],
            ['catrom', 'Catmull-Rom'],
            ['triangle', 'Triangle'],
            ['hqx', 'hqx (pixel art)'],
          ])}
          ${num('resize.width', 'Width', 'px')}${num(
                'resize.height',
                'Height',
                'px',
              )}
          ${sel('resize.fit', 'Fit method', [
            ['stretch', 'Stretch'],
            ['contain', 'Contain'],
          ])}
          <div class="full">${ck(
            'resize.premul',
            'Premultiply alpha channel',
          )}${ck('resize.linear', 'Linear RGB')}</div>
        </div>`
        }
        ${sw('palette.on', 'Reduce palette')}
        <div class="opt-grid" data-show-if="${k}.palette.on"><div class="full">${rng(
      'palette.colors',
      'Colors',
      2,
      256,
    )}</div><div class="full">${rng(
      'palette.dither',
      'Dithering',
      0,
      1,
      0.1,
    )}</div></div>
      </div>
      <div data-compress style="display:grid;gap:14px">
        <p class="group-title">Compress</p>
        <div data-lossy>${rng('quality', 'Quality', 1, 100)}</div>
        <div data-codec-toggle>${ck(
          'showCodec',
          'Show more codec options',
        )}</div>
        <div class="opt-grid" data-codec>
          ${sel('mozjpeg.channels', 'Channels', [
            ['ycbcr', 'YCbCr'],
            ['grayscale', 'Grayscale'],
            ['rgb', 'RGB'],
          ])}
          ${sel('mozjpeg.subsample', 'Chroma subsample', [
            ['0', '4:4:4'],
            ['1', '4:2:2'],
            ['2', '4:2:0'],
          ])}
          <div class="full">${ck(
            'mozjpeg.sepChroma',
            'Separate chroma quality',
          )}</div>
          <div class="full" data-mozjpeg-chroma>${rng(
            'mozjpeg.chromaQuality',
            'Chroma quality',
            1,
            100,
          )}</div>
          <div class="full">${ck(
            'mozjpeg.progressive',
            'Progressive rendering',
          )}${ck('mozjpeg.optimize', 'Optimize Huffman table')}${ck(
      'mozjpeg.trellis',
      'Trellis multipass',
    )}</div>
          <div class="full">${rng(
            'mozjpeg.smoothing',
            'Smoothing',
            0,
            100,
          )}</div>
        </div>
      </div>
    </div>`;
  }
  function renderAdvanced() {
    $$('[data-side-options]').forEach((c) => {
      const k = c.dataset.sideOptions;
      const title =
        k === 'left'
          ? 'Left side'
          : k === 'right'
          ? 'Right side (your result)'
          : 'All images';
      c.innerHTML = sideHTML(k, {
        title,
        utils: k !== 's',
        noOriginal: k === 's',
        scale: k === 's',
      });
    });
    $$('[data-enc-list]').forEach((s) => {
      s.innerHTML = ENCODERS.map(
        ([v, t]) =>
          `<option value="${v}">${
            v === 'original' ? 'Original Image (default)' : t
          }</option>`,
      ).join('');
    });
  }

  /* ---------- Pixel pipeline (canvas) ---------- */
  function loadImage(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  }
  function drawCanvas(img, o, scale, rot) {
    const nw = img.naturalWidth || 512,
      nh = img.naturalHeight || 512;
    const w = Math.max(1, Math.round(nw * scale)),
      h = Math.max(1, Math.round(nh * scale));
    const swap = rot % 180 !== 0;
    const c = document.createElement('canvas');
    c.width = swap ? h : w;
    c.height = swap ? w : h;
    const ctx = c.getContext('2d', {
      willReadFrequently: !!(o.palette && o.palette.on),
    });
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    if (o.palette && o.palette.on && o.palette.colors < 256) {
      const lv = Math.max(2, Math.round(Math.cbrt(o.palette.colors)));
      const d = ctx.getImageData(0, 0, c.width, c.height),
        a = d.data,
        step = 255 / (lv - 1);
      for (let i = 0; i < a.length; i += 4) {
        a[i] = Math.round(a[i] / step) * step;
        a[i + 1] = Math.round(a[i + 1] / step) * step;
        a[i + 2] = Math.round(a[i + 2] / step) * step;
      }
      ctx.putImageData(d, 0, 0);
    }
    return c;
  }
  function toBlob(canvas, type, q) {
    return new Promise((res, rej) => {
      try {
        canvas.toBlob(
          (b) =>
            b && b.type === type ? res(b) : rej(new Error('unsupported')),
          type,
          q / 100,
        );
      } catch (e) {
        rej(e);
      }
    });
  }
  const scaleOf = (o, nw) =>
    o.resize && o.resize.on ? clamp(o.resize.width / nw, 0.01, 4) : 1;
  const blurFor = (o) =>
    LOSSLESS.has(o.encoder) ? 0 : +(((100 - o.quality) / 100) * 2.2).toFixed(2);

  /* ---------- Compare slider (shared by editor + dialog) ---------- */
  function initSlider(root, divider, canvas, onPos) {
    let dragging = false;
    const set = (p) => {
      p = clamp(p, 0, 100);
      root.style.setProperty('--pos', p + '%');
      divider.setAttribute('aria-valuenow', Math.round(p));
      divider.setAttribute(
        'aria-valuetext',
        `Showing ${Math.round(p)}% original, ${
          100 - Math.round(p)
        }% compressed`,
      );
      if (onPos) onPos(p);
    };
    const fromEvent = (e) => {
      const r = canvas.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    };
    divider.addEventListener('pointerdown', (e) => {
      dragging = true;
      divider.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    divider.addEventListener('pointermove', (e) => {
      if (dragging) fromEvent(e);
    });
    divider.addEventListener('pointerup', () => {
      dragging = false;
    });
    divider.addEventListener('pointercancel', () => {
      dragging = false;
    });
    canvas.addEventListener('click', (e) => {
      if (root.dataset.mode === 'slider' && !e.target.closest('.divider'))
        fromEvent(e);
    });
    divider.addEventListener('keydown', (e) => {
      const cur = +divider.getAttribute('aria-valuenow'),
        st = e.shiftKey ? 10 : 2;
      const m = {
        ArrowLeft: cur - st,
        ArrowDown: cur - st,
        ArrowRight: cur + st,
        ArrowUp: cur + st,
        Home: 0,
        End: 100,
      }[e.key];
      if (m !== undefined) {
        e.preventDefault();
        set(m);
      }
    });
    set(50);
    return set;
  }

  /* ================= INDEX ================= */
  function initIndex() {
    const drop = $('#drop'),
      file = $('#file');
    $('#browse').addEventListener('click', () => file.click());
    file.addEventListener(
      'change',
      () => file.files.length && handleFiles(file.files),
    );

    if (navigator.clipboard && navigator.clipboard.read) {
      const pb = $('#paste');
      pb.hidden = false;
      pb.addEventListener('click', async () => {
        try {
          for (const it of await navigator.clipboard.read()) {
            const t = it.types.find((x) => x.startsWith('image/'));
            if (t) {
              const b = await it.getType(t);
              return handleFiles([
                new File([b], 'pasted-image.' + (EXT_OF_MIME[t] || 'png'), {
                  type: t,
                }),
              ]);
            }
          }
          toast('No image found in the clipboard.', 'error');
        } catch (e) {
          toast('No image found in the clipboard.', 'error');
        }
      });
    }
    document.addEventListener('paste', (e) => {
      const f =
        e.clipboardData &&
        Array.from(e.clipboardData.files).filter((x) =>
          x.type.startsWith('image/'),
        );
      if (f && f.length) handleFiles(f);
      else toast('No image found in the clipboard.', 'error');
    });

    let depth = 0;
    const hasFiles = (e) =>
      e.dataTransfer &&
      Array.from(e.dataTransfer.types || []).includes('Files');
    window.addEventListener('dragenter', (e) => {
      if (hasFiles(e)) {
        depth++;
        drop.classList.add('is-dragover');
      }
    });
    window.addEventListener('dragleave', (e) => {
      if (hasFiles(e)) {
        depth = Math.max(0, depth - 1);
        if (!depth) drop.classList.remove('is-dragover');
      }
    });
    window.addEventListener('dragover', (e) => {
      if (hasFiles(e)) e.preventDefault();
    });
    window.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      drop.classList.remove('is-dragover');
      handleFiles(e.dataTransfer.files);
    });

    $$('.demo').forEach((a) =>
      a.addEventListener('click', () => {
        try {
          sessionStorage.setItem(
            'squoosh.source',
            JSON.stringify({ type: 'demo', key: a.dataset.demo }),
          );
        } catch (e) {}
      }),
    );

    let deferred;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      $('#install').hidden = false;
    });
    $('#install').addEventListener('click', async () => {
      if (deferred) {
        deferred.prompt();
        deferred = null;
        $('#install').hidden = true;
      }
    });
    if (/[?&]install=1/.test(location.search)) $('#install').hidden = false;

    const readURL = (f) =>
      new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
    async function handleFiles(list) {
      const files = Array.from(list).filter(
        (f) =>
          /^image\//.test(f.type) ||
          /\.(heic|heif|tiff?|avif|webp|jxl|qoi)$/i.test(f.name),
      );
      if (!files.length)
        return toast(
          'That does not look like an image. Try a JPEG, PNG, WebP, AVIF or GIF file.',
          'error',
        );
      if (files.length === 1) {
        const f = files[0];
        const rec = { type: 'file', name: f.name, size: f.size, mime: f.type };
        if (f.size < 4e6 && f.type.startsWith('image/')) {
          try {
            rec.dataUrl = await readURL(f);
          } catch (e) {}
        }
        try {
          sessionStorage.setItem('squoosh.source', JSON.stringify(rec));
        } catch (e) {
          delete rec.dataUrl;
          try {
            sessionStorage.setItem('squoosh.source', JSON.stringify(rec));
          } catch (e2) {}
        }
        location.href = 'editor.html';
      } else {
        try {
          sessionStorage.setItem(
            'squoosh.bulk',
            JSON.stringify(files.map((f) => ({ name: f.name, size: f.size }))),
          );
        } catch (e) {}
        location.href = 'bulk.html';
      }
    }
  }

  /* ================= EDITOR ================= */
  async function initEditor() {
    S = { left: mk('original'), right: mk('webp') };
    K = 'right';
    const cv = $('#canvas'),
      cmp = $('#compare'),
      vp = $('#viewport');
    const imgL = $('#imgLeft'),
      imgR = $('#imgRight');
    $('#resizeSub').dataset.showIf = 'right.resize.on';
    $('#paletteSub').dataset.showIf = 'right.palette.on';

    /* source */
    const qd = new URLSearchParams(location.search).get('demo');
    let rec = null;
    try {
      rec = JSON.parse(sessionStorage.getItem('squoosh.source') || 'null');
    } catch (e) {}
    if (qd && DEMOS[qd]) rec = { type: 'demo', key: qd };
    if (!rec) rec = { type: 'demo', key: 'photo' };
    const src = { standIn: true };
    if (rec.type === 'demo') {
      const d = DEMOS[rec.key] || DEMOS.photo;
      Object.assign(src, { name: d.name, size: d.size, url: d.src });
    } else if (rec.dataUrl)
      Object.assign(src, {
        name: rec.name,
        size: rec.size,
        url: rec.dataUrl,
        standIn: false,
      });
    else {
      Object.assign(src, {
        name: rec.name,
        size: rec.size,
        url: DEMOS.photo.src,
      });
      toast('That file is large, so a sample image stands in for the preview.');
    }
    try {
      src.img = await loadImage(src.url);
    } catch (e) {
      src.img = await loadImage(DEMOS.photo.src);
      src.url = DEMOS.photo.src;
    }
    src.nw = src.img.naturalWidth || 512;
    src.nh = src.img.naturalHeight || 512;
    S.left.resize.width = S.right.resize.width = src.nw;
    S.left.resize.height = S.right.resize.height = src.nh;
    $('#fileName').textContent = src.name;
    $('#fileMeta').textContent = `${src.nw} × ${src.nh} · ${fmt(src.size)}`;
    document.title = `${src.name}: Squoosh`;
    imgL.src = imgR.src = src.url;
    imgL.alt = `Original ${src.name}`;
    imgR.alt = `Compressed ${src.name}`;
    const base = src.name.replace(/\.[^.]+$/, '');

    /* view state */
    const v = {
      rot: 0,
      zoom: 100,
      fit: true,
      mode: 'slider',
      shown: null,
      urls: [],
    };
    function layout() {
      const r90 = v.rot % 180 !== 0,
        W = r90 ? src.nh : src.nw,
        H = r90 ? src.nw : src.nh,
        ar = W / H;
      const side = v.mode === 'side',
        stack = side && matchMedia('(max-width: 720px)').matches;
      const cols = side && !stack ? 2 : 1,
        rows = side && stack ? 2 : 1,
        gap = 12;
      cmp.dataset.mode = v.mode;
      cmp.dataset.stack = stack ? '1' : '0';
      cv.style.setProperty('--ar', ar);
      cv.style.setProperty('--rot', v.rot + 'deg');
      cv.style.setProperty(
        '--iw',
        r90 ? (src.nw / src.nh) * 100 + '%' : '100%',
      );
      cv.style.setProperty(
        '--ih',
        r90 ? (src.nh / src.nw) * 100 + '%' : '100%',
      );
      const aw = vp.clientWidth - 48,
        ah = vp.clientHeight - 48;
      let w;
      if (v.fit) {
        w = Math.min(
          (aw - gap * (cols - 1)) / cols,
          ((ah - gap * (rows - 1)) / rows) * ar,
          W * 2,
        );
        v.zoom = Math.max(1, Math.round((w / W) * 100));
      } else w = (W * v.zoom) / 100;
      cv.style.setProperty(
        '--w',
        Math.max(40, cols * w + gap * (cols - 1)) + 'px',
      );
      if (document.activeElement !== $('#zoomInput'))
        $('#zoomInput').value = v.zoom;
    }
    new ResizeObserver(() => {
      if (v.fit) layout();
    }).observe(vp);
    window.addEventListener('resize', layout);
    const setZoom = (z) => {
      v.zoom = clamp(Math.round(z), 5, 800);
      v.fit = false;
      layout();
    };
    $('#zoomIn').onclick = () => setZoom(v.zoom * 1.25);
    $('#zoomOut').onclick = () => setZoom(v.zoom / 1.25);
    $('#zoomInput').addEventListener('change', (e) =>
      setZoom(+e.target.value || 100),
    );
    vp.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setZoom(v.zoom * (e.deltaY < 0 ? 1.08 : 0.92));
        }
      },
      { passive: false },
    );
    $('#rotate').onclick = () => {
      v.rot = (v.rot + 90) % 360;
      v.fit = true;
      layout();
    };
    $('#smooth').onclick = (e) => {
      const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
      e.currentTarget.setAttribute('aria-pressed', on);
      cmp.dataset.smooth = on ? 'on' : 'off';
    };
    $('#bgToggle').onclick = () => {
      cmp.dataset.bg = cmp.dataset.bg === 'checker' ? 'solid' : 'checker';
    };
    const setMode = (m) => {
      v.mode = m;
      v.fit = true;
      $('#modeSlider').setAttribute('aria-pressed', m === 'slider');
      $('#modeSide').setAttribute('aria-pressed', m === 'side');
      layout();
    };
    $('#modeSlider').onclick = () => setMode('slider');
    $('#modeSide').onclick = () => setMode('side');
    initSlider(cmp, $('#divider'), cv);

    /* spine */
    const setStep = (n) =>
      $$('#spine li').forEach((li, i) => {
        li.classList.toggle('is-done', i < n - 1 || (n === 3 && i < 3));
        li.classList.toggle('is-current', i === n - 1 && n !== 3);
        if (i === n - 1 && n !== 3) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      });

    /* processing */
    let token = 0,
      timer;
    const release = () => {
      v.urls.forEach((u) => URL.revokeObjectURL(u));
      v.urls = [];
    };
    async function renderSide(k) {
      const o = S[k];
      if (o.encoder === 'original')
        return { original: true, url: src.url, size: src.size, blur: 0 };
      const sc = scaleOf(o, src.nw);
      const est = estimate(src.size, o, sc);
      const type = VISUAL[o.encoder];
      if (!src.noCanvas) {
        try {
          const blob = await toBlob(
            drawCanvas(src.img, o, sc, 0),
            type,
            o.quality,
          );
          const real = REAL_SIZE.has(o.encoder) && !src.standIn;
          return {
            url: URL.createObjectURL(blob),
            size: real ? blob.size : est,
            blur: 0,
            real,
          };
        } catch (e) {
          if (e && e.message !== 'unsupported') src.noCanvas = true;
        }
      }
      return { url: src.url, size: est, blur: blurFor(o), real: false };
    }
    async function process() {
      const my = ++token;
      $('#busy').hidden = false;
      const [l, r] = await Promise.all([
        renderSide('left'),
        renderSide('right'),
      ]);
      if (my !== token) {
        [l, r].forEach(
          (x) => x.url.startsWith('blob:') && URL.revokeObjectURL(x.url),
        );
        return;
      }
      release();
      [l, r].forEach((x) => x.url.startsWith('blob:') && v.urls.push(x.url));
      imgL.src = l.url;
      imgR.src = r.url;
      imgL.style.filter = l.blur ? `blur(${l.blur}px)` : '';
      imgR.style.filter = r.blur ? `blur(${r.blur}px)` : '';
      $('#tagLeft').textContent = l.original
        ? 'Original'
        : ENC_LABEL[S.left.encoder];
      $('#tagRight').textContent = r.original
        ? 'Original'
        : FRIENDLY[S.right.encoder] || ENC_LABEL[S.right.encoder];
      showRight(r);
      showLeft(l);
      $('#busy').hidden = true;
    }
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(process, 150);
    };
    function showLeft(l) {
      const el = $('#leftResult'),
        q = $('[data-left-quality]');
      q.hidden = S.left.encoder === 'original' || LOSSLESS.has(S.left.encoder);
      el.textContent = l.original
        ? 'Left side is your original image.'
        : `Left side: ${ENC_LABEL[S.left.encoder]}, ${fmt(l.size)} (${Math.max(
            0,
            pctSaved(src.size, l.size),
          )}% smaller than the original).`;
    }
    let animId = 0,
      lastPct = null;
    function animate(el, from, to) {
      const id = ++animId;
      if (reduceMotion || from === to) {
        el.textContent = fmt(to);
        return;
      }
      const t0 = performance.now(),
        dur = 950;
      (function tick(t) {
        if (id !== animId) return;
        const p = clamp((t - t0) / dur, 0, 1),
          e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = fmt(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }
    function showRight(r) {
      const pill = $('#pill'),
        orig = src.size;
      if (r.original) {
        pill.hidden = true;
        $('#resultLead').textContent = 'This is your original image.';
        $('#oldSize').hidden = true;
        $('#newSize').textContent = fmt(orig);
        v.shown = orig;
        lastPct = null;
        $('#srStatus').textContent = 'Showing your original image.';
        return;
      }
      pill.hidden = false;
      $('#oldSize').hidden = false;
      $('#oldSize').textContent = fmt(orig);
      $('#resultLead').textContent = 'Your image is';
      const pct = pctSaved(orig, r.size);
      if (pct >= 1) {
        pill.textContent = pct + '% smaller';
        pill.className = 'pill pill-green';
      } else {
        pill.textContent = 'No smaller yet';
        pill.className = 'pill pill-amber';
      }
      if (pct !== lastPct) {
        pill.classList.remove('settle');
        void pill.offsetWidth;
        pill.classList.add('settle');
      }
      lastPct = pct;
      animate($('#newSize'), v.shown == null ? orig : v.shown, r.size);
      v.shown = r.size;
      $('#srStatus').textContent =
        pct >= 1
          ? `Your image is ${pct}% smaller: ${fmt(orig)} to ${fmt(r.size)}.`
          : `This setting does not make the image smaller. Try a lower quality.`;
    }

    /* resize helpers: keep proportions */
    onField = (p, val) => {
      const m = p.match(/^(left|right)\.resize\.(preset|width|height)$/);
      if (!m) return;
      const o = S[m[1]].resize;
      if (m[2] === 'preset' && val !== 'custom') {
        o.width = Math.round(src.nw * (val === 'original' ? 1 : +val));
        o.height = Math.round(src.nh * (val === 'original' ? 1 : +val));
      }
      if (m[2] === 'width') {
        o.height = Math.round((val * src.nh) / src.nw);
        o.preset = 'custom';
      }
      if (m[2] === 'height') {
        o.width = Math.round((val * src.nw) / src.nh);
        o.preset = 'custom';
      }
    };
    onChange = schedule;
    renderAdvanced();
    wirePanel();
    $$('#resizeSub,#paletteSub').forEach((x) => (x.hidden = true));
    syncInputs();
    syncPrimary();
    layout();
    setStep(2);

    /* download */
    $('#download').addEventListener('click', async (e) => {
      const btn = e.currentTarget,
        o = S.right;
      let blob = null,
        name = `${base}.${
          o.encoder === 'original' ? src.name.split('.').pop() || 'jpg' : ''
        }`;
      if (o.encoder !== 'original') {
        try {
          blob = await toBlob(
            drawCanvas(src.img, o, scaleOf(o, src.nw), v.rot),
            VISUAL[o.encoder],
            o.quality,
          );
          name = `${base}.${EXT_OF_MIME[blob.type]}`;
        } catch (err) {}
      }
      const url = blob ? URL.createObjectURL(blob) : src.url;
      if (!blob && o.encoder !== 'original')
        name = `${base}.${
          o.encoder === 'mozjpeg' || o.encoder === 'browserjpeg'
            ? 'jpg'
            : o.encoder === 'oxipng' || o.encoder === 'browserpng'
            ? 'png'
            : 'webp'
        }`;
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: name,
      });
      document.body.append(a);
      a.click();
      a.remove();
      if (blob) setTimeout(() => URL.revokeObjectURL(url), 2000);
      setStep(3);
      btn.innerHTML = `${icon('check', 'ic')}Saved`;
      setTimeout(() => {
        btn.innerHTML = `${icon('download', 'ic')}Download`;
      }, 2600);
      toast(`Saved ${name}. Want to squoosh another? Use Add another image.`);
    });

    process();
  }

  /* ================= BULK ================= */
  function initBulk() {
    S = { s: mk('webp') };
    S.s.scale = 50;
    K = 's';
    const KINDS = ['photo', 'art', 'pixel3'];
    const SRC = {
      photo: DEMOS.photo.src,
      art: DEMOS.art.src,
      pixel3: DEMOS.pixel3.src,
    };
    const defaults = [
      ['beach-trip-01.jpg', 2800, 'done'],
      ['golden-hour.jpg', 2900, 'done'],
      ['pixel-home-screen.png', 1600, 'done'],
      ['market-stall.jpg', 3400, 'done'],
      ['sketchbook-cover.jpg', 2200, 'done'],
      ['harbour-sunrise.jpg', 3500, 'done'],
      ['receipt-march.png', 1650, 'done'],
      ['family-dinner.jpg', 3900, 'converting'],
      ['garden-notes.jpg', 2500, 'waiting'],
      ['maps-screenshot.png', 1800, 'waiting'],
      ['poster-draft.jpg', 3100, 'waiting'],
      ['IMG_2041.HEIC', 4200, 'error'],
    ];
    let items = defaults.map(([name, kb, st], i) => ({
      id: i,
      name,
      orig: kb * 1000,
      st,
      kind: KINDS[i % 3],
      jit: 0.92 + ((i * 37) % 17) / 100,
      heic: /heic$/i.test(name),
      reason: '',
    }));
    let custom = null;
    try {
      custom = JSON.parse(sessionStorage.getItem('squoosh.bulk') || 'null');
    } catch (e) {}
    if (custom && custom.length > 1) {
      items = custom.map((f, i) => ({
        id: i,
        name: f.name,
        orig: f.size,
        st: 'waiting',
        kind: KINDS[i % 3],
        jit: 0.92 + ((i * 37) % 17) / 100,
        heic: /\.(heic|heif|tiff?)$/i.test(f.name),
        reason: '',
      }));
    }
    items.forEach((t) => {
      if (t.st === 'error')
        t.reason =
          "Your browser can't open HEIC pictures yet. Save it as a JPEG from your photo app, then add that copy.";
    });
    const total = items.length;

    const resSize = (t) =>
      Math.max(300, Math.round(estimate(t.orig, S.s, S.s.scale / 100) * t.jit));
    const grid = $('#grid');
    const tileHTML = (t) => {
      const thumb = t.heic
        ? `<span class="ext">${(
            t.name.split('.').pop() || ''
          ).toUpperCase()}</span>`
        : `<img src="${SRC[t.kind]}" alt="" loading="lazy">`;
      let chip = '',
        size = fmt(t.orig),
        extra = '';
      if (t.st === 'waiting')
        chip = `<span class="chip-status st-waiting">${icon(
          'clock',
        )}Waiting</span>`;
      if (t.st === 'converting')
        chip = `<span class="chip-status st-converting">${icon(
          'spinner',
          'ic ic-sm spin',
        )}Converting</span>`;
      if (t.st === 'done') {
        const r = resSize(t);
        chip = `<span class="chip-status st-done">${icon(
          'check',
        )}Saved ${pctSaved(t.orig, r)}%</span>`;
        size = `${fmt(t.orig)} → ${fmt(r)}`;
      }
      if (t.st === 'error') {
        chip = `<span class="chip-status st-error">${icon(
          'warning',
        )}Couldn't convert</span><span class="tile-reason">${
          t.reason
        }</span><button class="link-btn" type="button" data-retry="${
          t.id
        }">Retry</button>`;
      }
      return `<button class="tile-open" type="button" data-open="${
        t.id
      }" aria-label="Compare ${
        t.name
      }"><span class="tile-thumb">${thumb}<span class="veil">${icon(
        'spinner',
        'ic spin',
      )}</span></span><span class="tile-name">${t.name}</span></button>
        <span class="tile-size">${size}</span><div class="tile-foot">${chip}</div>`;
    };
    function paintTile(t) {
      let li = $(`li[data-id="${t.id}"]`, grid);
      if (!li) {
        li = document.createElement('li');
        li.className = 'tile';
        li.dataset.id = t.id;
        grid.append(li);
      }
      li.dataset.state = t.st;
      li.innerHTML = tileHTML(t);
    }
    let running = false,
      zipping = false;
    function summary() {
      const done = items.filter((t) => t.st === 'done'),
        conv = items.some((t) => t.st === 'converting');
      const errs = items.filter((t) => t.st === 'error').length;
      const o = done.reduce((a, t) => a + t.orig, 0),
        n = done.reduce((a, t) => a + resSize(t), 0);
      $('#subhead').textContent = `${total} images · ${done.length} converted`;
      $('#progressText').textContent =
        conv || running
          ? `Converting ${done.length} of ${total}`
          : done.length === total
          ? `All ${total} images converted`
          : `${done.length} of ${total} converted${
              errs ? ` · ${errs} need${errs > 1 ? '' : 's'} attention` : ''
            }`;
      const saved = `You saved ${fmt(o - n)}`;
      $('#progressSaved').textContent = saved;
      $('#totalSaved').textContent = saved;
      $('#totalLine').textContent = done.length
        ? `${fmt(o)} before, ${fmt(n)} after`
        : 'Nothing converted yet.';
      const bar = $('#bar');
      bar.setAttribute('aria-valuenow', done.length);
      bar.setAttribute('aria-valuemax', total);
      bar.firstElementChild.style.width = (done.length / total) * 100 + '%';
      bar.classList.toggle('is-done', done.length === total);
      $('#zipAll').disabled = !done.length || zipping;
      const ca = $('#convertAll');
      ca.disabled = running;
      $('span', ca).textContent = running ? 'Converting…' : 'Convert all';
      const sv = ca.firstElementChild;
      sv.classList.toggle('spin', running);
      sv.innerHTML = running
        ? '<use href="#i-spinner"/>'
        : '<use href="#i-refresh"/>';
    }
    const paintAll = () => {
      items.forEach(paintTile);
      summary();
    };
    const wait = (ms) =>
      new Promise((r) => setTimeout(r, reduceMotion ? Math.min(ms, 120) : ms));
    async function convertOne(t) {
      t.st = 'converting';
      paintTile(t);
      summary();
      await wait(650 + (t.id % 4) * 220);
      if (t.heic) {
        t.st = 'error';
        t.reason =
          "Still can't open this HEIC file. Export it as a JPEG from your photo app and add that copy.";
      } else t.st = 'done';
      paintTile(t);
      summary();
    }
    $('#convertAll').addEventListener('click', async () => {
      if (running) return;
      running = true;
      if (!items.some((t) => t.st === 'waiting'))
        items.forEach((t) => {
          if (t.st === 'done') t.st = 'waiting';
        });
      items.forEach((t) => {
        if (t.st === 'waiting') paintTile(t);
      });
      summary();
      for (const t of items.filter((x) => x.st === 'waiting'))
        await convertOne(t);
      running = false;
      summary();
      const errs = items.filter((t) => t.st === 'error').length;
      toast(
        errs
          ? `Done. ${total - errs} converted, ${errs} needs another look.`
          : `All ${total} images are converted. ${
              $('#totalSaved').textContent
            }.`,
      );
      document
        .querySelector('#spine li:nth-child(3)')
        .classList.add('is-current');
    });
    $('#zipAll').addEventListener('click', async () => {
      if (zipping) return;
      zipping = true;
      const b = $('#zipAll');
      b.disabled = true;
      $('span', b).textContent = 'Zipping…';
      await wait(1400);
      zipping = false;
      $('span', b).textContent = 'Download all (ZIP)';
      summary();
      toast(
        `Your ZIP is ready: ${
          items.filter((t) => t.st === 'done').length
        } images. (Prototype: no file is created.)`,
      );
      $$('#spine li').forEach((li, i) => {
        li.classList.toggle('is-done', true);
        li.classList.remove('is-current');
      });
    });
    grid.addEventListener('click', async (e) => {
      const rb = e.target.closest('[data-retry]');
      if (rb) {
        const t = items[+rb.dataset.retry];
        await convertOne(t);
        if (t.st === 'error')
          toast(`Still could not convert ${t.name}.`, 'error');
        return;
      }
      const ob = e.target.closest('[data-open]');
      if (ob) openDialog(items[+ob.dataset.open]);
    });

    /* dialog */
    const dlg = $('#dlg'),
      dcmp = $('#dlgCompare'),
      dcv = $('#dlgCanvas');
    initSlider(dcmp, $('#dlgDivider'), dcv);
    const imgCache = {};
    let cur = null,
      dtok = 0;
    async function openDialog(t) {
      if (t.heic || t.st === 'error')
        return toast(
          `${t.name}: ${t.reason || "We can't preview this file."}`,
          'error',
        );
      cur = t;
      $('#dlgTitle').textContent = t.name;
      $('#dlgQ').value = S.s.quality;
      $('#dlgQOut').textContent = S.s.quality;
      $('#dlgQ').style.setProperty('--fill', S.s.quality + '%');
      const img = (imgCache[t.kind] =
        imgCache[t.kind] || (await loadImage(SRC[t.kind])));
      const ar = img.naturalWidth / img.naturalHeight;
      dcv.style.setProperty('--ar', ar);
      $('#dlgLeft').src = SRC[t.kind];
      $('#dlgRight').src = SRC[t.kind];
      if (!dlg.open) dlg.showModal();
      dialogRender();
    }
    async function dialogRender() {
      const my = ++dtok,
        t = cur,
        q = +$('#dlgQ').value;
      const o = { ...S.s, quality: q };
      const sizeNow = Math.max(
        300,
        Math.round(estimate(t.orig, o, S.s.scale / 100) * t.jit),
      );
      $('#dlgTag').textContent = FRIENDLY[o.encoder] || ENC_LABEL[o.encoder];
      const p = pctSaved(t.orig, sizeNow);
      $('#dlgPill').textContent = p + '% smaller';
      $('#dlgSizes').textContent = `${fmt(t.orig)} → ${fmt(sizeNow)}`;
      const img = imgCache[t.kind],
        right = $('#dlgRight');
      try {
        const b = await toBlob(
          drawCanvas(img, o, S.s.scale / 100, 0),
          VISUAL[o.encoder],
          q,
        );
        if (my !== dtok) return;
        const old = right.dataset.blob;
        right.src = URL.createObjectURL(b);
        right.dataset.blob = right.src;
        right.style.filter = '';
        if (old) URL.revokeObjectURL(old);
      } catch (e) {
        right.src = SRC[t.kind];
        right.style.filter = `blur(${blurFor(o)}px)`;
      }
    }
    $('#dlgQ').addEventListener('input', (e) => {
      $('#dlgQOut').textContent = e.target.value;
      e.target.style.setProperty('--fill', e.target.value + '%');
      dialogRender();
    });
    $('#dlgClose').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close();
    });

    onChange = () => {
      items.forEach((t) => t.st === 'done' && paintTile(t));
      summary();
    };
    renderAdvanced();
    wirePanel();
    syncInputs();
    syncPrimary();
    paintAll();
    // The one picture already being converted finishes on its own.
    items
      .filter((t) => t.st === 'converting')
      .forEach(async (t) => {
        t.st = 'waiting';
        paintTile(t);
        t.st = 'converting';
        paintTile(t);
        await wait(2600);
        t.st = 'done';
        paintTile(t);
        summary();
      });
  }

  if (page === 'index') initIndex();
  if (page === 'editor') initEditor();
  if (page === 'bulk') initBulk();
})();
