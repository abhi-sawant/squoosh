/* Squoosh / Light Table: shared prototype behaviour (vanilla JS, no build). */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]),
    );
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const params = new URLSearchParams(location.search);

  /* ------------------------------------------------------------------ icons (one family, 1.75px stroke) */
  const ICONS = {
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 4.5V11h-6.5"/>',
    pixels: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    checker:
      '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16M4 12h16"/>',
    split:
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/>',
    sbs: '<rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/>',
    loupe: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    import:
      '<path d="M4 15v4h16v-4"/><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/>',
    download:
      '<path d="M4 15v4h16v-4"/><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    paste:
      '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>',
    folder:
      '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    install:
      '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M12 8v6M9 11.5l3 3 3-3"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    arrows: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
  };
  const ic = (n, cls = '') =>
    `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
  const spinner =
    '<svg class="spin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7.5"/><path d="M16.6 16.6L21 21"/></svg>';
  function hydrate(root = document) {
    $$('[data-i]', root).forEach((el) => {
      if (!el.firstElementChild) el.innerHTML = ic(el.dataset.i);
    });
  }

  /* ------------------------------------------------------------------ helpers */
  const fmtBytes = (b) =>
    b >= 1e6
      ? (b / 1e6).toFixed(1) + ' MB'
      : Math.max(1, Math.round(b / 1e3)) + ' kB';
  let snackT;
  function snack(msg) {
    const el = $('#snackbar');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(snackT);
    snackT = setTimeout(() => el.classList.remove('show'), 3800);
  }

  const SQ_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f5f3ee"/><rect x="104" y="104" width="304" height="304" rx="60" fill="none" stroke="#1f2023" stroke-width="26"/><rect x="176" y="204" width="160" height="104" rx="26" fill="#ff4b2b"/></svg>';
  const DEMOS = {
    photo: {
      key: 'photo',
      name: 'photo.jpg',
      alt: 'Landscape photograph',
      src: '../assets/photo.jpg',
      w: 1400,
      h: 541,
      bytes: 2800000,
    },
    art: {
      key: 'art',
      name: 'art.jpg',
      alt: 'Colourful artwork',
      src: '../assets/artwork.jpg',
      w: 1400,
      h: 937,
      bytes: 2900000,
    },
    screen: {
      key: 'screen',
      name: 'pixel3.png',
      alt: 'Phone screenshot',
      src: '../assets/screen.jpg',
      w: 587,
      h: 1200,
      bytes: 1600000,
    },
    svg: {
      key: 'svg',
      name: 'squoosh.svg',
      alt: 'Squoosh logo',
      src: 'data:image/svg+xml;utf8,' + encodeURIComponent(SQ_SVG),
      w: 512,
      h: 512,
      bytes: 13000,
    },
  };

  /* ------------------------------------------------------------------ file intake (shared by intro + editor "add") */
  function readFile(file) {
    return new Promise((resolve) => {
      const rec = { name: file.name, bytes: file.size, w: 0, h: 0, src: '' };
      if (file.size > 3.4e6) return resolve(rec);
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => {
          rec.src = fr.result;
          rec.w = im.naturalWidth;
          rec.h = im.naturalHeight;
          resolve(rec);
        };
        im.onerror = () => resolve(rec);
        im.src = fr.result;
      };
      fr.onerror = () => resolve(rec);
      fr.readAsDataURL(file);
    });
  }
  async function routeFiles(files) {
    files = [...files].filter(
      (f) =>
        /^image\//.test(f.type) ||
        /\.(heic|tiff?|avif|svg|webp|png|jpe?g|gif)$/i.test(f.name),
    );
    if (!files.length) {
      snack('No image found. Drop a JPEG, PNG, WebP, AVIF or SVG file.');
      return;
    }
    if (files.length > 1) {
      location.href = 'bulk.html?n=' + files.length;
      return;
    }
    const rec = await readFile(files[0]);
    try {
      sessionStorage.setItem('lt-file', JSON.stringify(rec));
    } catch (e) {
      /* too big: editor falls back to the demo photo */
    }
    location.href = 'editor.html?img=file';
  }
  const hasFiles = (e) =>
    [...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files');

  /* ------------------------------------------------------------------ encoder model (formula-driven, plausible) */
  const ENC = {
    orig: { label: 'Original Image', short: 'ORIGINAL', ratio: () => 1 },
    mozjpeg: {
      label: 'MozJPEG',
      short: 'MOZJPEG',
      ext: 'jpg',
      q: 75,
      mime: 'image/jpeg',
      ratio: (o) => 0.0764 * Math.exp(0.045 * (o.q - 75)),
    },
    webp: {
      label: 'WebP',
      short: 'WEBP',
      ext: 'webp',
      q: 80,
      mime: 'image/webp',
      ratio: (o) =>
        0.0636 * Math.exp(0.047 * (o.q - 80)) * (o.lossless ? 9 : 1),
    },
    avif: {
      label: 'AVIF',
      short: 'AVIF',
      ext: 'avif',
      q: 50,
      mime: 'image/webp',
      sim: true,
      ratio: (o) => 0.05 * Math.exp(0.05 * (o.q - 50)),
    },
    jxl: {
      label: 'JPEG XL (beta)',
      short: 'JXL',
      ext: 'jxl',
      q: 75,
      mime: 'image/webp',
      sim: true,
      ratio: (o) => 0.058 * Math.exp(0.05 * (o.q - 75)),
    },
    webp2: {
      label: 'WebP v2 (unstable)',
      short: 'WEBP2',
      ext: 'wp2',
      q: 75,
      mime: 'image/webp',
      sim: true,
      ratio: (o) => 0.052 * Math.exp(0.048 * (o.q - 75)),
    },
    oxipng: { label: 'OxiPNG', short: 'OXIPNG', ext: 'png', ratio: () => 2.1 },
    qoi: { label: 'QOI', short: 'QOI', ext: 'qoi', ratio: () => 3.0 },
    bpng: { label: 'Browser PNG', short: 'PNG', ext: 'png', ratio: () => 2.6 },
    bjpeg: {
      label: 'Browser JPEG',
      short: 'JPEG',
      ext: 'jpg',
      q: 75,
      mime: 'image/jpeg',
      ratio: (o) => 0.096 * Math.exp(0.042 * (o.q - 75)),
    },
    bgif: { label: 'Browser GIF', short: 'GIF', ext: 'gif', ratio: () => 1.4 },
  };
  const defSide = (enc, img, bulk) => ({
    enc,
    bulk: !!bulk,
    q: ENC[enc].q ?? 75,
    effort: 4,
    lossless: false,
    adv: false,
    chan: 'YCbCr',
    sepChroma: false,
    cq: 75,
    sub: '4:2:0',
    prog: true,
    huff: true,
    trellis: false,
    smooth: 0,
    resize: {
      on: !!bulk,
      preset: 'Custom',
      w: img ? img.w : 0,
      h: img ? img.h : 0,
      method: 'Lanczos3',
      fit: 'Stretch',
      premult: true,
      linear: true,
      pct: 50,
    },
    pal: { on: false, colors: 256, dither: 100 },
  });
  function calc(img, o) {
    let w = img.w,
      h = img.h;
    if (o.resize.on) {
      if (o.bulk) {
        const k = o.resize.pct / 100;
        w = Math.max(1, Math.round(w * k));
        h = Math.max(1, Math.round(h * k));
      } else {
        w = o.resize.w || w;
        h = o.resize.h || h;
      }
    }
    let r = ENC[o.enc].ratio(o);
    if (o.pal.on) r *= Math.pow(o.pal.colors / 256, 0.3);
    const bytes = Math.max(
      300,
      Math.round(img.bytes * r * ((w * h) / (img.w * img.h))),
    );
    return { bytes, w, h, pct: Math.round((1 - bytes / img.bytes) * 100) };
  }
  const codecTag = (o) => {
    const d = ENC[o.enc];
    if (o.enc === 'orig') return 'Original';
    if (o.enc === 'oxipng') return 'OxiPNG L2';
    return d.q != null ? `${d.short} Q${o.q}` : d.short;
  };
  const outName = (img, o) =>
    o.enc === 'orig' || !ENC[o.enc].ext
      ? img.name
      : img.name.replace(/\.[^.]+$/, '') + '.' + ENC[o.enc].ext;

  /* real re-encode when the canvas is readable (served over http); otherwise a soft-focus stand-in */
  const imgCache = new Map();
  const loadImage = (src) => {
    if (!imgCache.has(src))
      imgCache.set(
        src,
        new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = src;
        }),
      );
    return imgCache.get(src);
  };
  async function makeVariant(img, o) {
    const d = ENC[o.enc];
    if (o.enc === 'orig' || !d.mime) return { url: img.src, blur: 0 };
    try {
      const el = await loadImage(img.src);
      const c = document.createElement('canvas');
      c.width = el.naturalWidth;
      c.height = el.naturalHeight;
      c.getContext('2d').drawImage(el, 0, 0);
      const blob = await new Promise((res, rej) => {
        try {
          c.toBlob(
            (b) => (b ? res(b) : rej(new Error('encode'))),
            d.mime,
            o.q / 100,
          );
        } catch (e) {
          rej(e);
        }
      });
      return { url: URL.createObjectURL(blob), blur: 0, blob };
    } catch (e) {
      return { url: img.src, blur: ((100 - o.q) / 100) * 1.3 };
    }
  }

  /* ------------------------------------------------------------------ option panel */
  const SUBS = ['4:4:4', '4:2:2', '4:2:0', '4:1:1'];
  const METHODS = [
    'Lanczos3',
    'Mitchell',
    'Catrom',
    'Triangle',
    'Hqx',
    'Browser pixelated',
    'Browser low quality',
    'Browser high quality',
  ];
  const PRESETS = ['Custom', '25%', '50%', '75%', '200%'];
  const LOSSY = 'mozjpeg webp avif jxl webp2 bjpeg';
  const getp = (o, k) => k.split('.').reduce((a, p) => a[p], o);
  const setp = (o, k, v) => {
    const p = k.split('.');
    const last = p.pop();
    p.reduce((a, x) => a[x], o)[last] = v;
  };

  function panelHTML(id, cfg) {
    const cid = (k) => `${id}-${k.replace(/\./g, '-')}`;
    const sel = (k, opts) =>
      `<select id="${cid(k)}" data-k="${k}">${opts
        .map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return `<option value="${esc(v)}">${esc(l)}</option>`;
        })
        .join('')}</select>`;
    const fld = (k, label, ctrl, attrs = '') =>
      `<div class="fld" ${attrs}><label for="${cid(
        k,
      )}">${label}</label>${ctrl}</div>`;
    const num = (k) =>
      `<input type="number" inputmode="numeric" min="1" max="16000" id="${cid(
        k,
      )}" data-k="${k}">`;
    const rng = (k, label, min, max, attrs = '') =>
      `<div class="fld rng" ${attrs}><label for="${cid(
        k,
      )}">${label}</label><output for="${cid(
        k,
      )}" data-out="${k}"></output><input type="range" id="${cid(
        k,
      )}" data-k="${k}" min="${min}" max="${max}" step="1"></div>`;
    const chk = (k, label, attrs = '') =>
      `<label class="chk" ${attrs}><input type="checkbox" class="cb" data-k="${k}"><span>${label}</span></label>`;
    const sw = (k, label) =>
      `<label class="sw"><input type="checkbox" data-k="${k}"><span class="sw-track" aria-hidden="true"></span><span>${label}</span></label>`;
    const encs = Object.keys(ENC)
      .filter((k) => !(cfg.bulk && k === 'orig'))
      .map((k) => [k, ENC[k].label]);
    const tool = (t, label) =>
      `<button class="btn icon" type="button" data-tool="${t}" aria-label="${label}" title="${label}">${ic(
        t,
      )}</button>`;
    return `
<div class="opt">
  <header class="opt-head"><h2>${esc(cfg.title)}</h2>${
      cfg.bulk
        ? ''
        : `<div class="tools">${tool(
            'copy',
            'Copy settings to the other side',
          )}${tool('save', 'Save these settings')}${tool(
            'import',
            'Import saved settings',
          )}</div>`
    }</header>
  ${fld('enc', 'Encoder', sel('enc', encs))}
  <section class="grp" aria-label="Edit"><h3>Edit</h3>
    <div class="sub">${sw('resize.on', 'Resize')}
      <div class="sub-body" data-show="resize.on">
        ${
          cfg.bulk
            ? rng('resize.pct', 'Scale', 1, 100)
            : `
        ${fld('resize.preset', 'Preset', sel('resize.preset', PRESETS))}
        ${fld('resize.w', 'Width', num('resize.w'))}
        ${fld('resize.h', 'Height', num('resize.h'))}
        ${fld('resize.method', 'Method', sel('resize.method', METHODS))}
        ${fld(
          'resize.fit',
          'Fit method',
          sel('resize.fit', ['Stretch', 'Contain']),
        )}
        ${chk('resize.premult', 'Premultiply alpha channel')}
        ${chk('resize.linear', 'Linear RGB')}`
        }
      </div>
    </div>
    <div class="sub">${sw('pal.on', 'Reduce palette')}
      <div class="sub-body" data-show="pal.on">
        ${rng('pal.colors', 'Colors', 2, 256)}
        ${rng('pal.dither', 'Dithering', 0, 100)}
      </div>
    </div>
  </section>
  <p class="opt-note" data-enc="orig">Shown as loaded, with no compression. Resize and palette still apply.</p>
  <section class="grp" aria-label="Compress" data-enc="mozjpeg webp avif jxl webp2 oxipng qoi bpng bjpeg bgif"><h3>Compress</h3>
    <p class="opt-note" data-enc="qoi bpng bgif">This format has no settings.</p>
    ${rng('q', 'Quality', 0, 100, `data-enc="${LOSSY}"`)}
    ${chk('lossless', 'Lossless', 'data-enc="webp"')}
    ${rng('effort', 'Effort', 0, 9, 'data-enc="webp avif jxl webp2 oxipng"')}
    ${chk('adv', 'Advanced settings', 'data-enc="mozjpeg"')}
    <div class="sub-body" data-enc="mozjpeg" data-show="adv">
      ${fld('chan', 'Channels', sel('chan', ['YCbCr', 'Grayscale', 'RGB']))}
      ${chk('sepChroma', 'Separate chroma quality')}
      ${rng('cq', 'Chroma quality', 0, 100, 'data-show="sepChroma"')}
      ${fld('sub', 'Chroma subsample', sel('sub', SUBS))}
      ${chk('prog', 'Progressive rendering')}
      ${chk('huff', 'Optimize Huffman table')}
      ${chk('trellis', 'Trellis multipass')}
      ${rng('smooth', 'Smoothing', 0, 100)}
    </div>
  </section>
</div>`;
  }

  class Panel {
    constructor(host, o, cfg) {
      this.host = host;
      this.o = o;
      this.cfg = cfg;
      host.innerHTML = panelHTML(cfg.id, cfg);
      hydrate(host);
      host.addEventListener('input', (e) => this.onInput(e));
      host.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tool]');
        if (t && cfg.onTool) cfg.onTool(t.dataset.tool);
      });
      this.refresh();
    }
    onInput(e) {
      const el = e.target,
        k = el.dataset && el.dataset.k;
      if (!k) return;
      const o = this.o,
        img = this.cfg.img;
      let v =
        el.type === 'checkbox'
          ? el.checked
          : el.type === 'range' || el.type === 'number'
          ? Number(el.value)
          : el.value;
      if (el.type === 'number') v = clamp(Math.round(v) || 1, 1, 16000);
      setp(o, k, v);
      if (k === 'enc') {
        const d = ENC[v];
        if (d.q != null) o.q = d.q;
      }
      if (k === 'resize.preset' && v !== 'Custom') {
        const f = parseInt(v, 10) / 100;
        o.resize.w = Math.round(img.w * f);
        o.resize.h = Math.round(img.h * f);
      }
      if (k === 'resize.w') {
        o.resize.h = Math.max(1, Math.round((v * img.h) / img.w));
        o.resize.preset = 'Custom';
      }
      if (k === 'resize.h') {
        o.resize.w = Math.max(1, Math.round((v * img.w) / img.h));
        o.resize.preset = 'Custom';
      }
      this.refresh(el);
      this.cfg.onChange && this.cfg.onChange(k);
    }
    setState(o) {
      this.o = o;
      this.refresh();
    }
    refresh(skip) {
      const o = this.o;
      $$('[data-k]', this.host).forEach((el) => {
        const v = getp(o, el.dataset.k);
        if (el !== skip) {
          if (el.type === 'checkbox') el.checked = !!v;
          else el.value = v;
        }
        if (el.type === 'range') {
          el.style.setProperty(
            '--fill',
            ((el.value - el.min) / (el.max - el.min)) * 100 + '%',
          );
          const out = $(`[data-out="${el.dataset.k}"]`, this.host);
          if (out)
            out.textContent =
              el.value +
              (el.dataset.k === 'resize.pct' || el.dataset.k === 'pal.dither'
                ? '%'
                : '');
        }
      });
      $$('[data-enc],[data-show]', this.host).forEach((el) => {
        let show = true;
        if (el.dataset.enc) show = el.dataset.enc.split(' ').includes(o.enc);
        if (show && el.dataset.show)
          show = el.dataset.show.split('&').every((k) => getp(o, k));
        el.hidden = !show;
      });
    }
  }

  /* ------------------------------------------------------------------ compare + loupe */
  class Compare {
    constructor(host, opt) {
      this.host = host;
      this.o = opt;
      this.scope = host.closest('[data-cmp-scope]') || host;
      this.iw = opt.img.w;
      this.ih = opt.img.h;
      this.rot = 0;
      this.zoom = null;
      this.mode = 'split';
      this.split = 0.5;
      this.loupeOn = true;
      this.sides = [
        { url: opt.img.src, blur: 0, label: 'original' },
        { url: opt.img.src, blur: 0, label: 'original' },
      ];
      host.innerHTML = `
<div class="cmp" data-mode="split" data-orient="h" data-bg="check" data-smooth="on">
  <div class="cmp-view">
    <div class="cmp-pane cmp-a"><img alt="${esc(
      (opt.img.alt || opt.img.name) + ', left side',
    )}" draggable="false"></div>
    <div class="cmp-pane cmp-b"><img alt="${esc(
      (opt.img.alt || opt.img.name) + ', right side',
    )}" draggable="false"></div>
    <div class="cmp-handle" role="slider" tabindex="0" aria-label="Comparison divider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><span class="knob">${ic(
      'arrows',
    )}</span></div>
    <div class="loupe" hidden aria-hidden="true">
      <div class="lp-lens">
        <div class="lp-half lp-a"><div class="lp-img"></div></div>
        <div class="lp-half lp-b"><div class="lp-img"></div></div>
        <i class="lp-seam"></i>
      </div>
      <span class="lp-read"></span>
    </div>
  </div>
</div>`;
      this.root = $('.cmp', host);
      this.view = $('.cmp-view', host);
      this.imgA = $('.cmp-a img', host);
      this.imgB = $('.cmp-b img', host);
      this.paneA = $('.cmp-a', host);
      this.paneB = $('.cmp-b', host);
      this.handle = $('.cmp-handle', host);
      this.loupe = $('.loupe', host);
      this.lpA = $('.lp-a .lp-img', host);
      this.lpB = $('.lp-b .lp-img', host);
      this.lpHalfA = $('.lp-a', host);
      this.lpHalfB = $('.lp-b', host);
      this.seam = $('.lp-seam', host);
      this.read = $('.lp-read', host);
      this.bind();
      this.setSide(0, this.sides[0]);
      this.setSide(1, this.sides[1]);
      this.setSplit(0.5);
      this.layout();
      if (opt.observe)
        new ResizeObserver(() => this.layout()).observe(opt.observe);
    }
    get orient() {
      return this.o.orient ? this.o.orient() : 'h';
    }
    setSide(i, s) {
      this.sides[i] = s;
      (i ? this.imgB : this.imgA).src = s.url;
      (i ? this.lpB : this.lpA).style.backgroundImage = `url("${s.url}")`;
      this.applyBlur();
      this.read.innerHTML = `4x, ${esc(this.sides[0].label)} | <b>${esc(
        this.sides[1].label,
      )}</b>`;
    }
    applyBlur() {
      const s = this.s || 1;
      [
        [this.imgA, this.lpA, 0],
        [this.imgB, this.lpB, 1],
      ].forEach(([im, lp, i]) => {
        const b = this.sides[i].blur;
        im.style.filter = b ? `blur(${(b * s).toFixed(2)}px)` : '';
        lp.style.filter = b ? `blur(${(b * s * 4).toFixed(2)}px)` : '';
      });
    }
    layout() {
      const odd = this.rot % 180 !== 0;
      const dw = odd ? this.ih : this.iw,
        dh = odd ? this.iw : this.ih;
      const sbs = this.mode === 'sbs',
        gap = sbs ? 14 : 0;
      const b = this.o.box();
      const fit = Math.max(
        0.02,
        Math.min((b.w - gap) / (sbs ? 2 : 1) / dw, b.h / dh, 1),
      );
      const s =
        this.zoom == null ? Math.floor(fit * 100) / 100 : this.zoom / 100;
      this.s = s;
      this.dw = dw * s;
      this.dh = dh * s;
      const sc = this.scope.style;
      sc.setProperty('--pw', this.dw + 'px');
      sc.setProperty('--ph', this.dh + 'px');
      sc.setProperty('--vw', (sbs ? this.dw * 2 + gap : this.dw) + 'px');
      sc.setProperty('--gap', gap + 'px');
      sc.setProperty('--cols', sbs ? 2 : 1);
      [this.imgA, this.imgB].forEach((im) => {
        im.style.width = this.iw * s + 'px';
        im.style.height = this.ih * s + 'px';
      });
      this.root.style.setProperty('--rot', this.rot + 'deg');
      [this.lpA, this.lpB].forEach(
        (l) => (l.style.transform = `rotate(${this.rot}deg)`),
      );
      this.root.dataset.orient = this.orient;
      this.root.dataset.mode = this.mode;
      this.R = this.touch ? 66 : 80;
      this.root.style.setProperty('--R', this.R + 'px');
      this.applyBlur();
      this.setSplit(this.split);
      this.o.onZoom && this.o.onZoom(Math.round(s * 100));
    }
    setZoom(p) {
      this.zoom = p == null ? null : clamp(p, 5, 800);
      this.layout();
    }
    rotate() {
      this.rot = (this.rot + 90) % 360;
      this.layout();
    }
    setMode(m) {
      this.mode = m;
      this.layout();
    }
    setSmooth(on) {
      this.root.dataset.smooth = on ? 'on' : 'off';
    }
    setBg(b) {
      this.root.dataset.bg = b;
    }
    setLoupe(on) {
      this.loupeOn = on;
      if (!on) this.hideLoupe();
    }
    setSplit(f) {
      this.split = clamp(f, 0, 1);
      this.view.style.setProperty('--split', this.split * 100 + '%');
      this.handle.setAttribute('aria-valuenow', Math.round(this.split * 100));
      this.handle.setAttribute(
        'aria-orientation',
        this.orient === 'h' ? 'horizontal' : 'vertical',
      );
    }
    fromEvent(e) {
      const r = this.paneA.getBoundingClientRect();
      this.setSplit(
        this.orient === 'h'
          ? (e.clientX - r.left) / r.width
          : (e.clientY - r.top) / r.height,
      );
      this.placeLoupe(e);
    }
    bind() {
      const v = this.view;
      v.addEventListener('contextmenu', (e) => e.preventDefault());
      v.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const touch = e.pointerType !== 'mouse';
        this.touch = touch;
        this.R = touch ? 66 : 80;
        this.root.style.setProperty('--R', this.R + 'px');
        const onHandle = !!e.target.closest('.cmp-handle');
        this.start = { x: e.clientX, y: e.clientY };
        if (this.mode === 'split' && (onHandle || !touch)) {
          this.drag = true;
          try {
            v.setPointerCapture(e.pointerId);
          } catch (err) {
            /* ignore */
          }
          this.fromEvent(e);
          if (touch) this.showLoupe(e);
          e.preventDefault();
        } else if (touch) {
          clearTimeout(this.holdT);
          this.holdT = setTimeout(() => {
            this.holding = true;
            this.showLoupe(e);
          }, 320); // press and hold
        }
      });
      v.addEventListener('pointermove', (e) => {
        const touch = e.pointerType !== 'mouse';
        if (this.drag) {
          this.fromEvent(e);
          return;
        }
        if (touch) {
          if (!this.holding) {
            if (
              this.start &&
              Math.hypot(e.clientX - this.start.x, e.clientY - this.start.y) >
                10
            )
              clearTimeout(this.holdT);
          } else {
            this.placeLoupe(e);
          }
          return;
        }
        this.touch = false;
        this.showLoupe(e);
      });
      const end = (e) => {
        clearTimeout(this.holdT);
        this.drag = false;
        if (e.pointerType !== 'mouse') {
          this.holding = false;
          this.hideLoupe();
        }
      };
      v.addEventListener('pointerup', end);
      v.addEventListener('pointercancel', end);
      v.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse' && !this.drag) this.hideLoupe();
      });
      v.addEventListener(
        'touchmove',
        (e) => {
          if (this.holding || this.drag) e.preventDefault();
        },
        { passive: false },
      );
      this.handle.addEventListener('keydown', (e) => {
        const h = this.orient === 'h';
        const dec = h ? 'ArrowLeft' : 'ArrowUp',
          inc = h ? 'ArrowRight' : 'ArrowDown';
        const step = e.shiftKey ? 0.1 : 0.02;
        if (e.key === dec) this.setSplit(this.split - step);
        else if (e.key === inc) this.setSplit(this.split + step);
        else if (e.key === 'Home') this.setSplit(0);
        else if (e.key === 'End') this.setSplit(1);
        else return;
        e.preventDefault();
      });
    }
    showLoupe(e) {
      if (!this.loupeOn) return;
      if (this.loupe.hidden) {
        this.loupe.hidden = false;
        this.root.classList.add('lp-on');
      }
      this.placeLoupe(e);
    }
    hideLoupe() {
      this.loupe.hidden = true;
      this.root.classList.remove('lp-on');
    }
    placeLoupe(e) {
      if (this.loupe.hidden) return;
      const vr = this.view.getBoundingClientRect();
      let pr = this.paneA.getBoundingClientRect();
      if (this.mode === 'sbs') {
        const br = this.paneB.getBoundingClientRect();
        if (e.clientX >= br.left) pr = br;
      }
      const px = clamp(e.clientX - pr.left, 0, this.dw),
        py = clamp(e.clientY - pr.top, 0, this.dh);
      const R = this.R,
        s = this.s,
        k = 4;
      const lx0 = pr.left - vr.left + px,
        ly0 = pr.top - vr.top + py - (this.touch ? R + 34 : 0);
      this.loupe.style.left = lx0 + 'px';
      this.loupe.style.top = ly0 + 'px';
      // map display point back into image space (undo rotation)
      const a = (this.rot * Math.PI) / 180,
        cos = Math.cos(a),
        sin = Math.sin(a);
      const vx = px - this.dw / 2,
        vy = py - this.dh / 2;
      const ux = vx * cos + vy * sin,
        uy = -vx * sin + vy * cos;
      const lx = (this.iw * s) / 2 + ux,
        ly = (this.ih * s) / 2 + uy;
      [this.lpA, this.lpB].forEach((l) => {
        l.style.backgroundSize = `${this.iw * s * k}px ${this.ih * s * k}px`;
        l.style.backgroundPosition = `${R - lx * k}px ${R - ly * k}px`;
      });
      // the lens is cut along the slider line
      const h = this.orient === 'h';
      let cut;
      if (this.mode === 'sbs') cut = R;
      else
        cut = clamp(
          (h ? this.split * this.dw - px : this.split * this.dh - py) + R,
          0,
          2 * R,
        );
      if (h) {
        this.lpHalfA.style.clipPath = `inset(0 ${2 * R - cut}px 0 0)`;
        this.lpHalfB.style.clipPath = `inset(0 0 0 ${cut}px)`;
        Object.assign(this.seam.style, {
          left: cut - 1 + 'px',
          top: '0',
          width: '2px',
          height: '100%',
        });
      } else {
        this.lpHalfA.style.clipPath = `inset(0 0 ${2 * R - cut}px 0)`;
        this.lpHalfB.style.clipPath = `inset(${cut}px 0 0 0)`;
        Object.assign(this.seam.style, {
          top: cut - 1 + 'px',
          left: '0',
          height: '2px',
          width: '100%',
        });
      }
    }
  }

  /* ------------------------------------------------------------------ result printing (film-edge + caption) */
  function printHTML(img, o, r, loading) {
    return `<span>${esc(outName(img, o))}</span><span>${esc(
      codecTag(o),
    )}</span><span>${fmtBytes(r.bytes)}</span><span class="nocap">${r.w}x${
      r.h
    }</span>`;
  }
  function capHTML(img, o, r, loading, side) {
    const dl = `<button class="btn mark" type="button" data-dl="${side}" aria-label="Download ${esc(
      outName(img, o),
    )}" ${loading ? 'disabled aria-disabled="true"' : ''}>${ic(
      'download',
    )}<span class="lbl">Download</span></button>`;
    let txt;
    if (loading)
      txt = `<span class="cap-text" role="status">${spinner}Encoding</span>`;
    else if (o.enc === 'orig' && !o.resize.on && !o.pal.on)
      txt = `<span class="cap-text">Original<small>${fmtBytes(
        r.bytes,
      )}</small></span>`;
    else if (r.bytes <= img.bytes)
      txt = `<span class="cap-text"><span class="pct">${Math.max(
        0,
        r.pct,
      )}% smaller</span><small>${fmtBytes(r.bytes)}</small></span>`;
    else
      txt = `<span class="cap-text"><span class="pct worse">${Math.round(
        (r.bytes / img.bytes - 1) * 100,
      )}% bigger</span><small>${fmtBytes(r.bytes)}</small></span>`;
    return side ? dl + txt : txt + dl;
  }
  function saveBlob(variant, name) {
    if (variant && variant.blob) {
      const a = document.createElement('a');
      a.href = variant.url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    snack(`${name} saved`);
  }

  /* ================================================================== INTRO */
  function initIntro() {
    const input = $('#file');
    $('#browse').addEventListener('click', () => input.click());
    input.addEventListener('change', () => routeFiles(input.files));

    let depth = 0;
    addEventListener('dragenter', (e) => {
      if (!hasFiles(e)) return;
      depth++;
      document.body.classList.add('is-dragover');
    });
    addEventListener('dragleave', () => {
      depth = Math.max(0, depth - 1);
      if (!depth) document.body.classList.remove('is-dragover');
    });
    addEventListener('dragover', (e) => {
      if (hasFiles(e)) e.preventDefault();
    });
    addEventListener('drop', (e) => {
      e.preventDefault();
      depth = 0;
      document.body.classList.remove('is-dragover');
      routeFiles(e.dataTransfer.files);
    });
    if (params.get('state') === 'dragover')
      document.body.classList.add('is-dragover');

    const paste = $('#paste');
    if (navigator.clipboard && navigator.clipboard.read) paste.hidden = false;
    paste.addEventListener('click', async () => {
      try {
        const items = await navigator.clipboard.read();
        for (const it of items) {
          const t = it.types.find((x) => x.startsWith('image/'));
          if (t) {
            const blob = await it.getType(t);
            return routeFiles([
              new File([blob], 'pasted-image.' + t.split('/')[1], { type: t }),
            ]);
          }
        }
        snack('No image found in the clipboard');
      } catch (e) {
        snack('Could not read the clipboard. Allow access and try again.');
      }
    });
    addEventListener('paste', (e) => {
      const files = [...((e.clipboardData && e.clipboardData.files) || [])];
      if (files.length) routeFiles(files);
      else snack('No image found in the clipboard');
    });

    const inst = $('#install');
    if (params.has('install')) inst.hidden = false;
    addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      inst.hidden = false;
    });
    inst.addEventListener('click', () =>
      snack('Installing is available in the full app.'),
    );
  }

  /* ================================================================== EDITOR */
  function initEditor() {
    let img = DEMOS[params.get('img')];
    if (params.get('img') === 'file') {
      try {
        const f = JSON.parse(sessionStorage.getItem('lt-file'));
        if (f && f.src && f.w) img = { ...f, alt: f.name };
      } catch (e) {
        /* fall through */
      }
    }
    img = img || DEMOS.photo;
    document.title = `${img.name}: Squoosh editor`;

    const sides = [defSide('orig', img), defSide('mozjpeg', img)];
    const variants = [
      { url: img.src, blur: 0 },
      { url: img.src, blur: 0 },
    ];
    const loading = [false, false];
    const timers = [0, 0];
    const mqNarrow = matchMedia('(max-width: 760px)');

    const stage = $('#stage'),
      sheet = $('#sheet');
    let cmp;
    cmp = new Compare($('#cmp'), {
      img,
      observe: stage,
      orient: () => (mqNarrow.matches ? 'v' : 'h'),
      onZoom: (p) => {
        $('#zoom').value = p + '%';
      },
      box: () => {
        const cs = getComputedStyle(stage);
        const px = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
          py = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const vh = cmp && cmp.view.offsetHeight;
        const extraY = vh > 0 ? sheet.offsetHeight - vh : 150;
        return {
          w: stage.clientWidth - px - 32,
          h: Math.max(80, stage.clientHeight - py - extraY),
        };
      },
    });

    function paint(i) {
      const o = sides[i],
        r = calc(img, o);
      (i ? $('#printR') : $('#printL')).innerHTML = printHTML(img, o, r);
      (i ? $('#capR') : $('#capL')).innerHTML = capHTML(
        img,
        o,
        r,
        loading[i],
        i,
      );
      (i ? $('#printR') : $('#printL')).classList.toggle(
        'is-loading',
        loading[i],
      );
      cmp.setSide(i, {
        ...variants[i],
        label: o.enc === 'orig' ? 'original' : ENC[o.enc].label,
      });
      const seg = $(i ? '#segR' : '#segL');
      seg.textContent =
        (i ? 'Right: ' : 'Left: ') +
        (o.enc === 'orig' ? 'Original' : ENC[o.enc].label);
    }
    function reencode(i, instant) {
      paint(i); // numbers move live
      clearTimeout(timers[i]);
      loading[i] = true;
      paint(i);
      timers[i] = setTimeout(
        async () => {
          variants[i] = await makeVariant(img, sides[i]);
          if (!(params.get('state') === 'loading' && i === 1))
            loading[i] = false;
          paint(i);
        },
        instant ? 60 : 480,
      );
    }

    const panels = [0, 1].map(
      (i) =>
        new Panel($(i ? '#optR' : '#optL'), sides[i], {
          id: 'p' + i,
          title: i ? 'Right side' : 'Left side',
          img,
          bulk: false,
          onChange: () => reencode(i),
          onTool: (t) => {
            const key = 'lt-saved';
            if (t === 'copy') {
              Object.assign(sides[1 - i], JSON.parse(JSON.stringify(sides[i])));
              panels[1 - i].refresh();
              reencode(1 - i, true);
              snack(
                `Copied ${i ? 'right' : 'left'} settings to the ${
                  i ? 'left' : 'right'
                } side`,
              );
            }
            if (t === 'save') {
              try {
                localStorage.setItem(key, JSON.stringify(sides[i]));
                snack('Settings saved');
              } catch (e) {
                snack('Could not save settings in this browser.');
              }
            }
            if (t === 'import') {
              try {
                const s = JSON.parse(localStorage.getItem(key));
                if (!s) throw 0;
                Object.assign(sides[i], s);
                panels[i].refresh();
                reencode(i, true);
                snack('Saved settings imported');
              } catch (e) {
                snack('No saved settings yet. Use Save settings first.');
              }
            }
          },
        }),
    );
    // default 0 / MozJPEG initial render
    reencode(0, true);
    reencode(1, true);
    sheet.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dl]');
      if (!b || b.disabled) return;
      const i = +b.dataset.dl;
      saveBlob(variants[i], outName(img, sides[i]));
    });

    /* toolbar */
    const steps = [10, 25, 33, 50, 67, 75, 100, 150, 200, 300, 400, 600, 800];
    const zoomBy = (dir) => {
      const cur = cmp.s * 100;
      const next =
        dir > 0
          ? steps.find((s) => s > cur + 0.5)
          : [...steps].reverse().find((s) => s < cur - 0.5);
      if (next) cmp.setZoom(next);
    };
    $('#zoomIn').addEventListener('click', () => zoomBy(1));
    $('#zoomOut').addEventListener('click', () => zoomBy(-1));
    $('#zoom').addEventListener('change', (e) => {
      const v = parseInt(e.target.value, 10);
      if (v) cmp.setZoom(v);
      else cmp.layout();
    });
    $('#zoom').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.target.blur();
    });
    const toggle = (id, fn) => {
      const b = $(id);
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on);
        fn(on);
      });
    };
    toggle('#tgSmooth', (on) => cmp.setSmooth(!on));
    toggle('#tgBg', (on) => cmp.setBg(on ? 'solid' : 'check'));
    toggle('#tgLayout', (on) => cmp.setMode(on ? 'sbs' : 'split'));
    toggle('#tgLoupe', (on) => cmp.setLoupe(on));
    $('#rotate').addEventListener('click', () => cmp.rotate());
    mqNarrow.addEventListener('change', () => {
      if (mqNarrow.matches) {
        cmp.mode = 'split';
        $('#tgLayout').setAttribute('aria-pressed', 'false');
      }
      cmp.layout();
    });
    const file = $('#file');
    $('#add').addEventListener('click', () => file.click());
    file.addEventListener('change', () => routeFiles(file.files));
    addEventListener('dragover', (e) => {
      if (hasFiles(e)) e.preventDefault();
    });
    addEventListener('drop', (e) => {
      e.preventDefault();
      routeFiles(e.dataTransfer.files);
    });

    /* mobile side switch */
    $$('.seg button').forEach((b) =>
      b.addEventListener('click', () => {
        document.body.dataset.seg = b.dataset.seg;
        $$('.seg button').forEach((x) =>
          x.setAttribute('aria-selected', x === b),
        );
      }),
    );
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(() => cmp.layout());
  }

  /* ================================================================== BULK */
  function initBulk() {
    const IMG = { p: DEMOS.photo, a: DEMOS.art, s: DEMOS.screen };
    const items = [
      { name: 'harbour-dusk.jpg', k: 'p', mb: 3.1, status: 'done' },
      { name: 'market-stall.jpg', k: 'a', mb: 2.4, status: 'done' },
      { name: 'pixel3-home.png', k: 's', mb: 1.6, status: 'done' },
      { name: 'portrait-study.jpg', k: 'a', mb: 2.9, status: 'done' },
      { name: 'coast-road.jpg', k: 'p', mb: 3.4, status: 'done' },
      { name: 'settings-dark.png', k: 's', mb: 1.9, status: 'done' },
      { name: 'loom-detail.jpg', k: 'a', mb: 3.5, status: 'done' },
      { name: 'city-night.jpg', k: 'p', mb: 3.3, status: 'processing' },
      {
        name: 'IMG_4821.HEIC',
        k: null,
        ext: 'HEIC',
        mb: 2.2,
        status: 'pending',
        w: 3024,
        h: 4032,
      },
      {
        name: 'broken-export.png',
        k: 'a',
        mb: 1.2,
        status: 'error',
        msg: 'Can’t read this file. It may be damaged.',
      },
      { name: 'field-notes.jpg', k: 'p', mb: 2.6, status: 'pending' },
      { name: 'lobby-wide.jpg', k: 'a', mb: 2.9, status: 'pending' },
    ].map((it) => {
      const base = it.k ? IMG[it.k] : { src: '', alt: '', w: it.w, h: it.h };
      return {
        ...it,
        src: base.src,
        alt: base.alt,
        w: base.w,
        h: base.h,
        bytes: Math.round(it.mb * 1e6),
      };
    });

    const o = defSide('mozjpeg', null, true);
    const markDone =
      '<svg class="mk mk-done" viewBox="0 0 44 44" aria-hidden="true"><path pathLength="1" d="M7 24.5c3.4 3 6 6 8.2 10 4.2-9.6 11-18.6 21.3-27.2"/></svg>';
    const xout =
      '<svg class="xout" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M10 12C34 36 62 62 90 90"/><path pathLength="1" d="M91 10C64 36 36 64 9 91"/></svg>';
    const stText = {
      done: 'Done',
      pending: 'Pending',
      processing: 'Processing',
      error: 'Error',
    };
    const total = items.length;
    const grid = $('#grid');

    function tile(it, i) {
      const n = String(i + 1).padStart(2, '0');
      let print;
      if (it.status === 'done') {
        const r = calc(it, o);
        print = `<span class="fr"><span>${esc(
          codecTag(o),
        )}</span><span>${fmtBytes(r.bytes)}</span><span class="gain">-${
          r.pct
        }%</span></span>`;
      } else if (it.status === 'processing')
        print = '<span class="fr"><span>Encoding</span></span>';
      else if (it.status === 'error')
        print = `<span class="fr msg">${esc(it.msg)}</span>`;
      else
        print = `<span class="fr"><span>Waiting</span><span>${fmtBytes(
          it.bytes,
        )}</span></span>`;
      const pic = it.src
        ? `<img class="${it.k === 's' ? 'top' : ''}" src="${
            it.src
          }" alt="" loading="lazy">`
        : `<span class="badge-ext" aria-hidden="true">${esc(it.ext)}</span>`;
      const over =
        it.status === 'processing'
          ? `<span class="pic-over">${spinner}</span>`
          : it.status === 'done'
          ? markDone
          : it.status === 'error'
          ? xout
          : '';
      return `<li class="frame" data-status="${
        it.status
      }"><button class="frame-btn" type="button" data-idx="${i}" aria-label="${esc(
        it.name,
      )}, frame ${n}, ${stText[it.status].toLowerCase()}">
  <span class="frame-top"><span class="fno">${n}</span><span class="st">${
        stText[it.status]
      }</span></span>
  <span class="pic">${pic}${over}</span>
  <span class="fn">${esc(it.name)}</span>${print}</button></li>`;
    }
    const renderTile = (i) => {
      const li = grid.children[i],
        t = document.createElement('div');
      t.innerHTML = tile(items[i], i);
      const had =
        document.activeElement && li && li.contains(document.activeElement);
      li.replaceWith(t.firstElementChild);
      if (had) grid.children[i].querySelector('button').focus();
    };
    function renderAll() {
      grid.innerHTML = items.map(tile).join('');
    }

    let converting = false,
      zipping = false;
    function totals() {
      const done = items.filter((x) => x.status === 'done');
      const orig = done.reduce((a, x) => a + x.bytes, 0),
        conv = done.reduce((a, x) => a + calc(x, o).bytes, 0);
      $('#subline').textContent = `${total} images · ${done.length} converted`;
      $('#rollMain').textContent = `${
        done.length
      } of ${total} converted, saved ${fmtBytes(orig - conv)}`;
      $('#rollEdge').innerHTML = `<span>Original ${fmtBytes(
        orig,
      )}</span>&nbsp;&nbsp;<span>Converted ${fmtBytes(conv)}</span>`;
      const prog = $('#prog');
      prog.setAttribute('aria-valuenow', done.length);
      prog.style.setProperty('--p', (done.length / total) * 100 + '%');
      const pending = items.filter(
        (x) => x.status === 'pending' || x.status === 'processing',
      ).length;
      const cb = $('#convert');
      cb.disabled = converting || pending === 0;
      cb.setAttribute('aria-busy', converting);
      cb.querySelector('span').textContent = converting
        ? `Converting ${done.length}/${total}`
        : 'Convert all';
      cb.firstElementChild.innerHTML = converting ? spinner : ic('play');
      const zb = $('#zip');
      zb.disabled = done.length === 0 || zipping;
      zb.setAttribute('aria-busy', zipping);
      zb.querySelector('span').textContent = zipping
        ? 'Zipping'
        : 'Download all (ZIP)';
      zb.firstElementChild.innerHTML = zipping ? spinner : ic('download');
      return { done: done.length, orig, conv };
    }

    const panel = new Panel($('#opts'), o, {
      id: 'b',
      title: 'Options for all images',
      img: null,
      bulk: true,
      onChange: () => {
        renderAll();
        totals();
        if (lb.open) lbRender();
      },
    });
    renderAll();
    totals();

    $('#convert').addEventListener('click', async () => {
      if (converting) return;
      converting = true;
      totals();
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.status !== 'pending' && it.status !== 'processing') continue;
        it.status = 'processing';
        renderTile(i);
        totals();
        await wait(520 + Math.random() * 520);
        it.status = 'done';
        renderTile(i);
        totals();
      }
      converting = false;
      const t = totals();
      snack(
        `${t.done} of ${total} converted, saved ${fmtBytes(t.orig - t.conv)}`,
      );
    });
    $('#zip').addEventListener('click', async () => {
      if (zipping) return;
      zipping = true;
      totals();
      await wait(1500);
      zipping = false;
      const t = totals();
      snack(`converted-images.zip saved, ${fmtBytes(t.conv)}`);
    });

    /* lightbox */
    const lb = $('#lightbox');
    let cur = -1,
      cmp = null,
      timer = 0,
      variant = { url: '', blur: 0 };
    const mqNarrow = matchMedia('(max-width: 760px)');
    function lbRender() {
      const it = items[cur],
        r = calc(it, o),
        orig = { enc: 'orig', resize: { on: false }, pal: { on: false } };
      const ro = calc(it, orig);
      $('#lbPrintL').innerHTML = `<span>${esc(
        it.name,
      )}</span><span>Original</span><span>${fmtBytes(
        ro.bytes,
      )}</span><span class="nocap">${it.w}x${it.h}</span>`;
      $('#lbPrintR').innerHTML = printHTML(it, o, r);
      $(
        '#lbCapL',
      ).innerHTML = `<span class="cap-text">Original<small>${fmtBytes(
        ro.bytes,
      )}</small></span>`;
      $('#lbCapR').innerHTML = capHTML(it, o, r, false, 1).replace(
        /<button.*<\/button>/,
        '',
      );
      cmp.setSide(0, { url: it.src, blur: 0, label: 'original' });
      cmp.setSide(1, { ...variant, label: ENC[o.enc].label });
      $('#lbQ').value = o.q;
      $('#lbS').value = o.resize.pct;
      $('#lbQ').style.setProperty('--fill', o.q + '%');
      $('#lbS').style.setProperty('--fill', o.resize.pct + '%');
      $('#lbQo').textContent = o.q;
      $('#lbSo').textContent = o.resize.pct + '%';
      $('#lbQ').closest('.fld').hidden = ENC[o.enc].q == null;
    }
    async function lbEncode() {
      variant = await makeVariant(items[cur], o);
      lbRender();
    }
    function open(i) {
      const it = items[i];
      if (it.status === 'error') return snack(`${it.name}: ${it.msg}`);
      if (!it.src)
        return snack(
          `${it.name}: no preview in this browser. It will still be converted.`,
        );
      cur = i;
      $('#lbNo').textContent = String(i + 1).padStart(2, '0');
      $('#lbName').textContent = it.name;
      lb.showModal();
      if (!cmp)
        cmp = new Compare($('#lbCmp'), {
          img: it,
          observe: $('#lbStage'),
          orient: () => (mqNarrow.matches ? 'v' : 'h'),
          box: () => {
            const st = $('#lbStage'),
              sh = $('#lbSheet'),
              vh = cmp && cmp.view.offsetHeight;
            return {
              w: st.clientWidth - 32 - 32,
              h: Math.max(
                80,
                st.clientHeight - 16 - (vh ? sh.offsetHeight - vh : 150),
              ),
            };
          },
        });
      cmp.iw = it.w;
      cmp.ih = it.h;
      cmp.zoom = null;
      cmp.rot = 0;
      cmp.imgA.alt = cmp.imgB.alt = it.name;
      variant = { url: it.src, blur: 0 };
      cmp.layout();
      lbRender();
      lbEncode();
    }
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.frame-btn');
      if (b) open(+b.dataset.idx);
    });
    $('#lbClose').addEventListener('click', () => lb.close());
    lb.addEventListener('click', (e) => {
      if (e.target === lb) lb.close();
    });
    const lbSet = (k, v) => {
      setp(o, k, Number(v));
      panel.refresh();
      renderAll();
      totals();
      lbRender();
      clearTimeout(timer);
      timer = setTimeout(lbEncode, 350);
    };
    $('#lbQ').addEventListener('input', (e) => lbSet('q', e.target.value));
    $('#lbS').addEventListener('input', (e) =>
      lbSet('resize.pct', e.target.value),
    );
    $('#lbDl').addEventListener('click', () =>
      saveBlob(variant, outName(items[cur], o)),
    );
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('drop', (e) => {
      e.preventDefault();
      if (hasFiles(e))
        snack(
          `${e.dataTransfer.files.length} files added to the contact sheet`,
        );
    });
  }

  /* ------------------------------------------------------------------ boot */
  hydrate();
  const page = document.body.dataset.page;
  if (page === 'index') initIntro();
  if (page === 'editor') initEditor();
  if (page === 'bulk') initBulk();
})();
