/* Departures: shared behaviour. Vanilla JS, no build. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- icons: one family, 24px grid, 2.5px stroke, round caps ---------- */
  const ICONS = {
    'arrow-right': 'M4 12h16M13 5l7 7-7 7',
    'arrow-left': 'M20 12H4M11 5l-7 7 7 7',
    'arrow-down': 'M12 4v16M5 13l7 7 7-7',
    upload: 'M12 16V4M6 9l6-6 6 6M4 21h16',
    download: 'M12 3v12M6 10l6 6 6-6M4 21h16',
    paste:
      'M9 3h6v4H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1',
    luggage:
      'M7 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9 7V3h6v4M9 11v6M15 11v6',
    compress: 'M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5',
    pointer: 'M6 3l13 8-6 2-2 6z',
    lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V8a4 4 0 0 1 8 0v3',
    door: 'M14 3H6v18h8M10 12h11M17 8l4 4-4 4',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    split:
      'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM12 4v16',
    pixel: 'M4 4h7v7H4zM13 13h7v7h-7z',
    checker:
      'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 12h18M12 4v16',
    rotate: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5',
    lr: 'M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4',
    swap: 'M4 8h16M16 4l4 4-4 4M20 16H4M8 12l-4 4 4 4',
    save: 'M3 12V4h8l10 10-8 8zM7.5 8h.01',
    list: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    close: 'M5 5l14 14M19 5L5 19',
    check: 'M4 12l5 5L20 6',
    alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
    dots: 'M5 12h.01M12 12h.01M19 12h.01',
    chev: 'M8 5l7 7-7 7',
    crop: 'M6 2v16h16M2 6h16v16',
  };
  const sprite =
    '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>' +
    Object.entries(ICONS)
      .map(
        ([k, d]) =>
          `<symbol id="i-${k}" viewBox="0 0 24 24"><path d="${d}"/></symbol>`,
      )
      .join('') +
    '</defs></svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);
  const ic = (n, c = '') =>
    `<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  /* ---------- snackbar ---------- */
  let snackT;
  function snack(msg) {
    const s = $('#snack');
    if (!s) return;
    $('#snack-t').textContent = msg;
    s.hidden = false;
    clearTimeout(snackT);
    snackT = setTimeout(() => {
      s.hidden = true;
    }, 3600);
  }

  /* ---------- split-flap ---------- */
  const half = (c, ch) => `<span class="${c}"><b>${ch}</b></span>`;
  const cellHTML = (ch) =>
    half('ft', ch) + half('fb', ch) + half('lt', ch) + half('lb', ch);
  function flipCell(c, ch, d) {
    if (c.dot) {
      c.node.textContent = ch;
      c.target = ch;
      return;
    }
    if (c.target === ch) return;
    const n = c.node,
      g = (s) => $(s + ' b', n);
    const prev = c.target;
    c.target = ch;
    if (reduce.matches) {
      ['.ft', '.fb', '.lt', '.lb'].forEach((s) => (g(s).textContent = ch));
      return;
    }
    if (c.t) {
      clearTimeout(c.t);
      n.classList.remove('go');
      g('.fb').textContent = prev;
      g('.ft').textContent = prev;
      c.shown = prev;
    }
    const old = c.shown;
    g('.lt').textContent = old;
    g('.fb').textContent = old;
    g('.ft').textContent = ch;
    g('.lb').textContent = ch;
    n.classList.remove('go');
    void n.offsetWidth;
    n.style.setProperty('--d', d + 's');
    n.classList.add('go');
    c.t = setTimeout(() => {
      g('.fb').textContent = ch;
      g('.lt').textContent = ch;
      n.classList.remove('go');
      c.t = 0;
      c.shown = ch;
    }, (d + 0.14 + 0.32) * 1000 + 40);
  }
  function flapSet(el, text, delay = 0) {
    if (!el) return;
    text = String(text);
    const m = text.match(/^([\d.,]+)\s*(.*)$/),
      num = m ? m[1] : text,
      unit = m ? m[2] : '';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', text);
    if (!el._cells) {
      el.innerHTML =
        '<span class="fcs" aria-hidden="true"></span><span class="fu" aria-hidden="true"></span>';
      el._cs = el.firstChild;
      el._u = el.lastChild;
      el._cells = [];
    }
    el._u.textContent = unit;
    el._u.style.display = unit ? '' : 'none';
    const cells = el._cells;
    while (cells.length > num.length) cells.pop().node.remove();
    [...num].forEach((ch, i) => {
      const dot = ch === '.' || ch === ',';
      let c = cells[i];
      if (c && c.dot !== dot) {
        c.node.remove();
        c = null;
      }
      if (!c) {
        const node = document.createElement('span');
        node.className = 'fc' + (dot ? ' dot' : '');
        node.innerHTML = dot ? ch : cellHTML(' ');
        el._cs.insertBefore(node, el._cs.children[i] || null);
        c = cells[i] = { node, dot, target: dot ? ch : ' ', shown: ' ' };
      }
      flipCell(c, ch, delay + i * 0.05);
      if (!dot && reduce.matches) c.shown = ch;
    });
  }
  // the reduce path: keep `shown` in sync
  $$('.flap[data-flap]').forEach((el, i) =>
    flapSet(el, el.dataset.flap, 0.05 * i),
  );

  /* ---------- sizes / shared model ---------- */
  const SVGMARK =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0B0B0B"/><path d="M14 20l14 12-14 12M50 20L36 32l14 12" fill="none" stroke="#FFD400" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    );
  const IMGS = {
    photo: {
      name: 'photo.jpg',
      src: '../assets/photo.jpg',
      w: 1400,
      h: 541,
      o: 2800,
    },
    art: {
      name: 'artwork.jpg',
      src: '../assets/artwork.jpg',
      w: 1400,
      h: 937,
      o: 2900,
    },
    screen: {
      name: 'pixel3.png',
      src: '../assets/screen.jpg',
      w: 587,
      h: 1200,
      o: 1600,
    },
    svg: { name: 'squoosh.svg', src: SVGMARK, w: 512, h: 512, o: 13 },
  };
  const ENC = {
    orig: { label: 'Original Image', orig: true, f: [] },
    mozjpeg: {
      label: 'MozJPEG',
      ext: 'jpg',
      k: 0.1695,
      q: 75,
      f: ['q', 'moz'],
    },
    webp: {
      label: 'WebP',
      ext: 'webp',
      k: 0.1186,
      q: 80,
      f: ['q', 'effort6', 'lossless'],
    },
    avif: { label: 'AVIF', ext: 'avif', k: 0.266, q: 50, f: ['q', 'effort10'] },
    jxl: {
      label: 'JPEG XL (beta)',
      ext: 'jxl',
      k: 0.13,
      q: 75,
      f: ['q', 'effort6'],
    },
    webp2: {
      label: 'WebP v2 (unstable)',
      ext: 'webp2',
      k: 0.105,
      q: 75,
      f: ['q', 'effort6'],
    },
    oxipng: {
      label: 'OxiPNG',
      ext: 'png',
      r: 0.62,
      f: ['effort6', 'interlace'],
    },
    qoi: { label: 'QOI', ext: 'qoi', r: 0.78, f: [] },
    bpng: { label: 'Browser PNG', ext: 'png', r: 0.9, f: [] },
    bjpeg: { label: 'Browser JPEG', ext: 'jpg', k: 0.18, q: 75, f: ['q'] },
    bgif: { label: 'Browser GIF', ext: 'gif', r: 0.5, f: [] },
  };
  const fmt = (kb) =>
    kb >= 995
      ? (kb / 1000).toFixed(1) + ' MB'
      : Math.max(1, Math.round(kb)) + ' kB';
  function calc(st, img, bulk) {
    const e = ENC[st.enc];
    if (e.orig) return img.o;
    let r = e.r != null ? e.r : e.k * (0.05 + 0.95 * Math.pow(st.q / 100, 3));
    if (st.lossless) r = 0.55;
    let m = 1;
    if (st.rs)
      m = bulk
        ? Math.pow(st.scale / 100, 2)
        : Math.min(4, (st.w * st.h) / (img.w * img.h));
    if (st.pal) m *= 0.4 + (0.6 * Math.log2(st.colors)) / 8;
    return Math.max(1, img.o * r * m);
  }
  const pctOf = (kb, o) => Math.min(99, Math.round((1 - kb / o) * 100));
  const filt = (st) => {
    if (ENC[st.enc].orig) return 'none';
    const q = ENC[st.enc].f.includes('q') && !st.lossless ? st.q : 100;
    return `blur(${(((100 - q) / 100) * 1.6).toFixed(2)}px) contrast(${(
      1 +
      (100 - q) / 600
    ).toFixed(3)})`;
  };
  const defState = (enc, bulk, img) => {
    const e = ENC[enc];
    return {
      enc,
      q: e.q || 75,
      effort: 4,
      lossless: false,
      adv: false,
      rs: !!bulk,
      w: img ? img.w : 1400,
      h: img ? img.h : 541,
      scale: 50,
      pal: false,
      colors: 256,
      dither: 50,
    };
  };

  /* ---------- options panel ---------- */
  const rng = (k, l, min, max, v, suf = '') =>
    `<div class="fld"><label for="f-${k}-@">${l}<span class="val" data-v="${k}">${v}${suf}</span></label><input type="range" id="f-${k}-@" data-k="${k}" min="${min}" max="${max}" value="${v}" data-suf="${suf}"></div>`;
  const chk = (k, l, on, box) =>
    `<label class="chk ${
      box ? 'box' : ''
    }"><input type="checkbox" data-k="${k}" ${
      on ? 'checked' : ''
    }><span class="sw"></span>${l}</label>`;
  const sel = (k, l, opts, v) =>
    `<div class="fld"><label for="f-${k}-@">${l}</label><select id="f-${k}-@" data-k="${k}">${opts
      .map(
        (o) => `<option value="${o}" ${o == v ? 'selected' : ''}>${o}</option>`,
      )
      .join('')}</select></div>`;
  function compHTML(st) {
    const e = ENC[st.enc];
    if (!e.f.length) return '<p class="note">No options for this encoder.</p>';
    let h = '';
    e.f.forEach((f) => {
      if (f === 'q') h += rng('q', 'Quality', 0, 100, st.q);
      if (f === 'effort6')
        h += rng('effort', 'Effort', 0, 6, Math.min(st.effort, 6));
      if (f === 'effort10') h += rng('effort', 'Effort', 0, 10, st.effort);
      if (f === 'lossless') h += chk('lossless', 'Lossless', st.lossless);
      if (f === 'interlace') h += chk('interlace', 'Interlace', false);
      if (f === 'moz')
        h +=
          chk('adv', 'Advanced settings', st.adv, true) +
          `<div class="sub-opts" data-adv ${st.adv ? '' : 'hidden'}>` +
          sel('channels', 'Channels', ['YCbCr', 'Grayscale', 'RGB'], 'YCbCr') +
          chk('sepchroma', 'Separate chroma quality', false) +
          rng('subsample', 'Chroma subsample', 1, 4, 2) +
          chk('prog', 'Progressive rendering', true) +
          chk('huff', 'Optimize Huffman table', true) +
          chk('trellis', 'Trellis multipass', false) +
          rng('smooth', 'Smoothing', 0, 100, 0) +
          `</div>`;
    });
    return h;
  }
  function panelHTML(id, bulk) {
    const encs = Object.keys(ENC).filter((k) => !(bulk && k === 'orig'));
    const st = defState(bulk ? 'mozjpeg' : 'orig', bulk);
    const resize = bulk
      ? rng('scale', 'Scale', 1, 100, 50, '%')
      : sel(
          'preset',
          'Preset',
          ['Custom', '25%', '50%', '75%', '100%'],
          'Custom',
        ) +
        `<div class="fld"><label for="f-w-@">Width</label><input type="number" id="f-w-@" data-k="w" min="1" max="8000" value="1400"></div>` +
        `<div class="fld"><label for="f-h-@">Height</label><input type="number" id="f-h-@" data-k="h" min="1" max="8000" value="541"></div>` +
        sel(
          'method',
          'Method',
          [
            'Lanczos3',
            'Mitchell',
            'Catmull-Rom',
            'Triangle',
            'hqx',
            'Browser pixelated',
            'Browser low quality',
            'Browser high quality',
          ],
          'Lanczos3',
        ) +
        sel('fit', 'Fit method', ['Stretch', 'Contain'], 'Stretch') +
        chk('premul', 'Premultiply alpha', true, true) +
        chk('linear', 'Linear RGB', true, true);
    return (
      `<div class="fld"><label for="f-enc-@">Encoder</label><select id="f-enc-@" data-k="enc">${encs
        .map(
          (k) =>
            `<option value="${k}" ${k === st.enc ? 'selected' : ''}>${
              ENC[k].label
            }</option>`,
        )
        .join('')}</select></div>` +
      `<div data-edit><section class="grp"><h3 class="grp-h">${ic(
        'crop',
      )}Edit</h3>` +
      chk('rs', 'Resize', st.rs) +
      `<div class="sub-opts" data-rs ${st.rs ? '' : 'hidden'}>${resize}</div>` +
      chk('pal', 'Reduce palette', false) +
      `<div class="sub-opts" data-pal hidden>${rng(
        'colors',
        'Colors',
        2,
        256,
        256,
      )}${rng('dither', 'Dithering', 0, 100, 50)}</div></section>` +
      `<section class="grp"><h3 class="grp-h">${ic(
        'compress',
      )}Compress</h3><div data-comp>${compHTML(st)}</div></section></div>` +
      `<p class="note" data-orig hidden>Original image. Nothing is changed on this side.</p>`
    ).replace(/@/g, id);
  }
  function fillRange(r) {
    const p = ((r.value - r.min) / (r.max - r.min)) * 100;
    r.style.setProperty('--fill', p + '%');
  }
  function bindPanel(root, st, onChange, ctx) {
    $$('input[type=range]', root).forEach(fillRange);
    const sync = () => {
      const o = ENC[st.enc].orig;
      $('[data-edit]', root).hidden = o;
      $('[data-orig]', root).hidden = !o;
    };
    const handle = (e) => {
      const t = e.target,
        k = t.dataset.k;
      if (!k) return;
      const v =
        t.type === 'checkbox'
          ? t.checked
          : t.type === 'range' || t.type === 'number'
          ? +t.value
          : t.value;
      if (t.type === 'range') {
        fillRange(t);
        const lab = $(`[data-v="${k}"]`, root);
        if (lab) lab.textContent = t.value + (t.dataset.suf || '');
      }
      st[k] = v;
      if (k === 'enc') {
        st.q = ENC[v].q || st.q;
        st.lossless = false;
        st.adv = false;
        $('[data-comp]', root).innerHTML = compHTML(st);
        $$('[data-comp] input[type=range]', root).forEach(fillRange);
        sync();
      }
      if (k === 'rs') $('[data-rs]', root).hidden = !v;
      if (k === 'pal') $('[data-pal]', root).hidden = !v;
      if (k === 'adv') $('[data-adv]', root).hidden = !v;
      if (k === 'preset' && v !== 'Custom') {
        const f = parseInt(v) / 100;
        st.w = Math.round(ctx.img.w * f);
        st.h = Math.round(ctx.img.h * f);
        $('[data-k=w]', root).value = st.w;
        $('[data-k=h]', root).value = st.h;
      }
      if (k === 'w') {
        st.h = Math.max(1, Math.round((st.w * ctx.img.h) / ctx.img.w));
        $('[data-k=h]', root).value = st.h;
      }
      if (k === 'h') {
        st.w = Math.max(1, Math.round((st.h * ctx.img.w) / ctx.img.h));
        $('[data-k=w]', root).value = st.w;
      }
      onChange(k);
    };
    root.addEventListener('input', handle);
    root.addEventListener('change', (e) => {
      if (e.target.tagName === 'SELECT') handle(e);
    });
    sync();
    return { sync };
  }
  const tagHTML = (lead) =>
    `<div class="tag"><p class="enc" data-enc></p><div class="row2"><span class="flap" data-size style="--fs:2.4rem"></span></div><p class="delta"><span class="flap flap--good" data-pct style="--fs:1.25rem"></span><span data-dt></span></p><p class="load">Encoding ${
      '<span class="chev">' + ic('chev').repeat(3) + '</span>'
    }</p><a class="btn btn--big dl" data-dl download href="#">${
      lead || 'Download'
    }${ic('arrow-down')}</a></div>`;
  function paintTag(tag, st, img, bulk, nameBase, side) {
    const e = ENC[st.enc],
      kb = calc(st, img, bulk);
    $('[data-enc]', tag).textContent = e.orig
      ? 'Original Image'
      : e.label +
        (e.f.includes('q') && !st.lossless ? ' · quality ' + st.q : '');
    flapSet($('[data-size]', tag), fmt(kb));
    const dp = $('[data-pct]', tag),
      dt = $('[data-dt]', tag),
      dl = $('[data-dl]', tag),
      dlw = $('.delta', tag);
    dlw.classList.toggle('is-orig', !!e.orig);
    if (e.orig) {
      dp.hidden = true;
      dt.textContent = 'Original file, unchanged';
    } else {
      const p = pctOf(kb, img.o);
      dp.hidden = false;
      dp.classList.toggle('flap--bad', p < 0);
      dp.classList.toggle('flap--good', p >= 0);
      flapSet(dp, Math.abs(p) + '%');
      dt.textContent = p >= 0 ? ' smaller' : ' bigger';
    }
    dl.href = img.src;
    dl.setAttribute(
      'download',
      nameBase + (e.orig ? '' : '.' + (e.ext || 'jpg')),
    );
    return kb;
  }

  /* ---------- split compare ---------- */
  function initSplit(view, hooks) {
    const handle = $('.handle', view),
      mq = matchMedia('(max-width:700px)');
    let p = 50,
      drag = false;
    const orient = () => {
      view.classList.toggle('is-v', mq.matches);
      hooks && hooks.rot && hooks.rot();
    };
    const set = (v) => {
      p = Math.max(0, Math.min(100, v));
      view.style.setProperty('--p', p + '%');
      handle.setAttribute('aria-valuenow', Math.round(p));
    };
    const at = (e) => {
      const r = view.getBoundingClientRect();
      set(
        view.classList.contains('is-v')
          ? ((e.clientY - r.top) / r.height) * 100
          : ((e.clientX - r.left) / r.width) * 100,
      );
    };
    view.addEventListener('pointerdown', (e) => {
      if (view.classList.contains('is-sbs')) return;
      drag = true;
      view.setPointerCapture(e.pointerId);
      at(e);
    });
    view.addEventListener('pointermove', (e) => {
      if (drag) at(e);
    });
    ['pointerup', 'pointercancel'].forEach((n) =>
      view.addEventListener(n, () => {
        drag = false;
      }),
    );
    handle.addEventListener('keydown', (e) => {
      const k = e.key,
        d = { ArrowLeft: -4, ArrowUp: -4, ArrowRight: 4, ArrowDown: 4 }[k];
      if (d) {
        set(p + d);
        e.preventDefault();
      } else if (k === 'Home') {
        set(0);
        e.preventDefault();
      } else if (k === 'End') {
        set(100);
        e.preventDefault();
      }
    });
    mq.addEventListener('change', orient);
    orient();
    set(50);
  }
  const stageMarkup = (name, src) =>
    `<div class="stage"><div class="view"><figure class="pane pane-a"><img alt="Original ${name}" src="${src}"></figure><figure class="pane pane-b"><img alt="Converted ${name}" src="${src}"></figure><span class="lab lab-a">Original</span><span class="lab lab-b">Converted</span><div class="handle" role="slider" tabindex="0" aria-label="Comparison divider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><span class="grip">${ic(
      'lr',
    )}</span></div></div></div>`;

  /* ================= INTRO ================= */
  if (document.body.classList.contains('intro')) {
    const drop = $('#drop'),
      file = $('#file'),
      go = (n) => {
        location.href = n > 1 ? 'bulk.html' : 'editor.html?img=photo';
      };
    let depth = 0;
    addEventListener('dragenter', (e) => {
      e.preventDefault();
      depth++;
      document.body.classList.add('is-dragging');
    });
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('dragleave', () => {
      if (--depth <= 0) {
        depth = 0;
        document.body.classList.remove('is-dragging');
      }
    });
    addEventListener('drop', (e) => {
      e.preventDefault();
      depth = 0;
      document.body.classList.remove('is-dragging');
      const n = (e.dataTransfer.files || []).length;
      if (n) go(n);
    });
    file.addEventListener(
      'change',
      () => file.files.length && go(file.files.length),
    );
    $('#browse').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        file.click();
      }
    });
    const pasteBtn = $('#paste');
    if (navigator.clipboard && navigator.clipboard.read)
      pasteBtn.hidden = false;
    pasteBtn.addEventListener('click', async () => {
      try {
        const items = await navigator.clipboard.read();
        if (items.some((i) => i.types.some((t) => t.startsWith('image/'))))
          return go(1);
        snack('No image found in the clipboard');
      } catch (_) {
        snack('No image found in the clipboard');
      }
    });
    addEventListener('paste', (e) => {
      const f = [...(e.clipboardData ? e.clipboardData.files : [])].filter(
        (x) => x.type.startsWith('image/'),
      );
      f.length ? go(f.length) : snack('No image found in the clipboard');
    });
    $('#install').addEventListener('click', () =>
      snack('Use your browser menu to install Squoosh'),
    );
  }

  /* ================= EDITOR ================= */
  if (document.body.classList.contains('editor')) {
    const q = new URLSearchParams(location.search);
    let img = Object.assign({}, IMGS[q.get('img')] || IMGS.photo);
    const view = $('#view'),
      stage = $('#stage');
    const S = {
      a: { st: defState('orig', false, img) },
      b: { st: defState('mozjpeg', false, img) },
    };
    const ctx = { img };
    let active = 'b',
      z = 100,
      rot = 0;
    const imgEl = { a: $('#img-a'), b: $('#img-b') };

    ['a', 'b'].forEach((id) => {
      const root = $(`.side[data-side="${id}"]`),
        name = id === 'a' ? 'Left' : 'Right';
      root.innerHTML = `<div class="side-h"><h2>${name}</h2>
      <button class="ibtn" data-act="copy" aria-label="Copy settings to ${
        id === 'a' ? 'right' : 'left'
      } side" title="Copy settings to ${
        id === 'a' ? 'right' : 'left'
      } side">${ic('swap')}</button>
      <button class="ibtn" data-act="save" aria-label="Save ${name.toLowerCase()} side settings" title="Save settings">${ic(
        'save',
      )}</button>
      <button class="ibtn" data-act="import" aria-label="Import saved settings to ${name.toLowerCase()} side" title="Import saved settings">${ic(
        'upload',
      )}</button></div>
      ${tagHTML()}<div class="panel" data-panel>${panelHTML(id, false)}</div>`;
      const s = S[id];
      s.root = root;
      s.tag = $('.tag', root);
      s.panel = $('[data-panel]', root);
      s.bind = bindPanel(s.panel, s.st, (k) => schedule(id, k), ctx);
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const a = b.dataset.act,
          other = id === 'a' ? 'b' : 'a';
        if (a === 'copy') {
          const o = S[other];
          Object.assign(o.st, JSON.parse(JSON.stringify(s.st)));
          syncPanel(other);
          schedule(other);
          snack(
            `Settings copied to the ${other === 'a' ? 'left' : 'right'} side`,
          );
        }
        if (a === 'save') {
          try {
            localStorage.setItem('dep-' + id, JSON.stringify(s.st));
          } catch (_) {}
          snack(`${name} side settings saved`);
        }
        if (a === 'import') {
          let v;
          try {
            v = JSON.parse(localStorage.getItem('dep-' + id));
          } catch (_) {}
          if (!v) return snack('No saved settings yet');
          Object.assign(s.st, v);
          syncPanel(id);
          schedule(id);
          snack(`Settings imported to the ${name.toLowerCase()} side`);
        }
      });
    });
    function syncPanel(id) {
      const s = S[id],
        st = s.st,
        p = s.panel;
      p.innerHTML = panelHTML(id, false); // rebuild then apply state
      $('[data-k=enc]', p).value = st.enc;
      $('[data-comp]', p).innerHTML = compHTML(st);
      $$('[data-k]', p).forEach((el) => {
        const k = el.dataset.k;
        if (k in st && k !== 'enc') {
          if (el.type === 'checkbox') el.checked = !!st[k];
          else el.value = st[k];
        }
      });
      $('[data-rs]', p).hidden = !st.rs;
      $('[data-pal]', p).hidden = !st.pal;
      $$('[data-v]', p).forEach((l) => {
        const k = l.dataset.v;
        if (k in st) l.textContent = st[k] + (k === 'scale' ? '%' : '');
      });
      // handlers are on the panel element and survive innerHTML replacement
      $$('input[type=range]', p).forEach(fillRange);
      s.bind.sync();
    }
    const timers = {};
    function schedule(id) {
      const s = S[id];
      s.tag.classList.add('is-loading');
      paintMeta(id);
      clearTimeout(timers[id]);
      timers[id] = setTimeout(
        () => {
          s.tag.classList.remove('is-loading');
          paint(id);
        },
        reduce.matches ? 0 : 320,
      );
    }
    function paintMeta(id) {
      const st = S[id].st;
      imgEl[id].style.filter = filt(st);
      const e = ENC[st.enc];
      $('#lab-' + id).textContent =
        (id === 'a' ? 'Left' : 'Right') + ' · ' + e.label;
      drawLine();
    }
    function paint(id) {
      const s = S[id];
      s.kb = paintTag(
        s.tag,
        s.st,
        img,
        false,
        img.name.replace(/\.[^.]+$/, ''),
        id,
      );
      paintMeta(id);
      paintBar();
    }
    function drawLine() {
      const items = [
        `<li><span class="st"><span class="dot"></span><span class="t"><b>Original</b><span>${
          img.name
        } · ${img.w}×${img.h} · ${fmt(img.o)}</span></span></span></li>`,
      ];
      const st = (id) => {
        const e = ENC[S[id].st.enc];
        return `<li><span class="st"><span class="dot"></span><span class="t"><b>${
          e.label
        }</b><span>${
          id === 'a' ? 'Left' : 'Right'
        } side</span></span></span></li>`;
      };
      if (!ENC[S.a.st.enc].orig) items.push(st('a'));
      if (!ENC[S.b.st.enc].orig || ENC[S.a.st.enc].orig) items.push(st('b'));
      $('#line').innerHTML = items.join('');
    }
    const bar = $('#dlbar');
    bar.innerHTML = `<div class="info"><span data-bt></span><span class="flap" data-bs style="--fs:1.4rem"></span></div><a class="btn" data-bd download href="#">Download${ic(
      'arrow-down',
    )}</a>`;
    function paintBar() {
      const s = S[active],
        e = ENC[s.st.enc],
        kb = calc(s.st, img, false),
        p = pctOf(kb, img.o);
      $('[data-bt]', bar).textContent =
        (active === 'a' ? 'Left' : 'Right') +
        ' · ' +
        (e.orig
          ? 'Original'
          : p >= 0
          ? p + '% smaller'
          : Math.abs(p) + '% bigger');
      flapSet($('[data-bs]', bar), fmt(kb));
      const a = $('[data-bd]', bar);
      a.href = img.src;
      a.setAttribute('download', img.name);
    }
    // mobile tabs
    const mq = matchMedia('(max-width:900px)');
    function tabs() {
      $$('.tabs button').forEach((b) =>
        b.setAttribute('aria-selected', b.dataset.tab === active),
      );
      $$('.side').forEach((s) => {
        s.hidden = mq.matches && s.dataset.side !== active;
      });
      paintBar();
    }
    $$('.tabs button').forEach((b) =>
      b.addEventListener('click', () => {
        active = b.dataset.tab;
        tabs();
      }),
    );
    mq.addEventListener('change', tabs);

    // stage
    initSplit(view, { rot: () => applyRot() });
    const zin = $('#zin');
    function applyZoom(v) {
      z = Math.max(10, Math.min(800, Math.round(v)));
      view.style.setProperty('--z', z / 100);
      zin.value = z + '%';
    }
    function applyRot() {
      view.style.setProperty('--rot', rot + 'deg');
      let rs = 1;
      if (rot % 180) {
        const W = view.clientWidth,
          H = view.clientHeight,
          ar = img.w / img.h;
        let w, h;
        if (W / H > ar) {
          h = H;
          w = H * ar;
        } else {
          w = W;
          h = W / ar;
        }
        rs = Math.min(1, W / h, H / w);
      }
      view.style.setProperty('--rs', rs);
    }
    $('#zplus').addEventListener('click', () => applyZoom(z + 25));
    $('#zout').addEventListener('click', () => applyZoom(z - 25));
    zin.addEventListener('change', () => applyZoom(parseInt(zin.value) || 100));
    const tog = (id, fn) => {
      const b = $(id);
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on);
        fn(on);
      });
    };
    tog('#t-sbs', (on) => view.classList.toggle('is-sbs', on));
    tog('#t-pix', (on) => view.classList.toggle('pix', on));
    tog('#t-bg', (on) => view.classList.toggle('solid', !on));
    $('#t-rot').addEventListener('click', () => {
      rot += 90;
      applyRot();
    });
    const add = $('#add');
    add.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $('#addfile').click();
      }
    });
    $('#addfile').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f),
        im = new Image();
      im.onload = () => {
        img = {
          name: f.name,
          src: url,
          w: im.naturalWidth,
          h: im.naturalHeight,
          o: f.size / 1000,
        };
        ctx.img = img;
        load();
        snack('Loaded ' + f.name);
      };
      im.src = url;
    });
    function load() {
      imgEl.a.src = imgEl.b.src = img.src;
      imgEl.a.alt = 'Left side preview of ' + img.name;
      imgEl.b.alt = 'Right side preview of ' + img.name;
      ['a', 'b'].forEach((id) => {
        S[id].st.w = img.w;
        S[id].st.h = img.h;
        if (S[id].panel) {
          const w = $('[data-k=w]', S[id].panel),
            h = $('[data-k=h]', S[id].panel);
          w.value = img.w;
          h.value = img.h;
        }
      });
      rot = 0;
      applyRot();
      applyZoom(100);
      ['a', 'b'].forEach(paint);
    }
    syncPanel('a');
    syncPanel('b');
    load();
    tabs();
  }

  /* ================= BULK ================= */
  if (document.body.classList.contains('bulk')) {
    const P = IMGS.photo,
      A = IMGS.art,
      Sc = IMGS.screen;
    const items = [
      { n: 'photo.jpg', i: P, o: 2800, st: 'done' },
      { n: 'harbour-dusk.jpg', i: P, o: 3100, st: 'done' },
      { n: 'poster-final.jpg', i: A, o: 2900, st: 'done' },
      { n: 'sketch-03.jpg', i: A, o: 1900, st: 'done' },
      { n: 'home-screen.png', i: Sc, o: 1600, st: 'done' },
      { n: 'settings-screen.png', i: Sc, o: 1400, st: 'done' },
      { n: 'market-day.jpg', i: P, o: 2400, st: 'done' },
      { n: 'portrait-wide.jpg', i: P, o: 3400, st: 'processing' },
      { n: 'cover-art.jpg', i: A, o: 2700, st: 'pending' },
      { n: 'checkout-flow.png', i: Sc, o: 1800, st: 'pending' },
      {
        n: 'IMG_4021.heic',
        badge: 'HEIC',
        o: 3600,
        st: 'error',
        err: "This browser can't read HEIC files",
      },
      { n: 'scan-0007.tiff', badge: 'TIFF', o: 5200, st: 'pending' },
    ];
    const board = $('#board'),
      st = defState('mozjpeg', true),
      ctx = { img: P };
    const KB = (it) =>
      calc(st, it.i || { o: it.o, w: 1, h: 1 }, true) *
      (it.o / (it.i ? it.i.o : it.o));
    const ext = (n) => n.split('.').pop().toUpperCase();
    const dims = (it) => (it.i ? `${it.i.w}×${it.i.h}` : 'No preview');
    items.forEach((it, i) => {
      const li = document.createElement('li');
      it.li = li;
      li.innerHTML = `<button class="row" type="button" data-i="${i}"><span class="th">${
        it.badge
          ? `<span aria-hidden="true">${it.badge}</span>`
          : `<img src="${it.i.src}" alt="Thumbnail of ${it.n}" loading="lazy">`
      }</span>
      <span class="nm"><span>${it.n}</span><small>${ext(it.n)} · ${dims(
        it,
      )}</small></span><span class="orig" aria-label="Original size ${fmt(
        it.o,
      )}">${fmt(it.o)}</span>
      <span class="stat"></span><span class="res"></span></button>`;
      board.appendChild(li);
      it.stat = $('.stat', li);
      it.res = $('.res', li);
      paintStatus(it, i * 0.04);
    });
    function paintStatus(it, d) {
      const s = it.st,
        map = {
          pending: ['dots', 'Pending'],
          processing: ['chev', 'Processing'],
          done: ['check', 'Done'],
          error: ['alert', 'Error'],
        }[s];
      it.stat.className = 'stat ' + s;
      it.stat.innerHTML =
        s === 'processing'
          ? `Processing<span class="chev">${ic('chev').repeat(3)}</span>`
          : ic(map[0]) + map[1];
      it.li.firstChild.setAttribute('aria-label', `${it.n}, ${map[1]}`);
      if (s === 'done') {
        if (!it._done) {
          it.res.innerHTML = `<span class="flap" data-r style="--fs:1.05rem"></span><span class="sv"><span class="flap flap--good" data-p style="--fs:1.05rem"></span>smaller</span>`;
          it._done = true;
        }
        const kb = KB(it);
        flapSet($('[data-r]', it.res), fmt(kb), d);
        flapSet($('[data-p]', it.res), pctOf(kb, it.o) + '%', d + 0.1);
      } else {
        it._done = false;
        it.res.innerHTML =
          s === 'error'
            ? `<span class="err">${it.err}</span>`
            : `<span class="none">${
                s === 'processing' ? 'Converting' : 'Waiting'
              }</span>`;
      }
    }
    const count = () => items.filter((i) => i.st === 'done').length;
    const meta = $('#meta .flap');
    function totals(d = 0) {
      const done = items.filter((i) => i.st === 'done'),
        n = done.length,
        tot = items.length;
      const so = done.reduce((a, i) => a + i.o, 0),
        sc = done.reduce((a, i) => a + KB(i), 0),
        p = so ? pctOf(sc, so) : 0;
      flapSet(meta, n, d);
      $('#pg-t').textContent = `${n} of ${tot} converted`;
      $('#prog').setAttribute('aria-valuenow', n);
      $('#prog i').style.setProperty('--w', (n / tot) * 100 + '%');
      const t = $('#tot');
      if (!t._i) {
        t.innerHTML = `<div>Original<span class="flap" data-a style="--fs:1.1rem"></span></div><div>Converted<span class="flap" data-b style="--fs:1.1rem"></span></div><div>Saved<span class="flap flap--good" data-c style="--fs:1.1rem"></span></div>`;
        t._i = 1;
      }
      flapSet($('[data-a]', t), fmt(so), d);
      flapSet($('[data-b]', t), fmt(sc), d + 0.08);
      flapSet($('[data-c]', t), p + '%', d + 0.16);
      $('#zip').disabled = n === 0 || zipping;
    }
    let zipping = false,
      busy = false;
    totals(0.1);

    // shared options
    const optRoot = $('#opts');
    optRoot.innerHTML = panelHTML('s', true);
    let t0;
    bindPanel(
      optRoot,
      st,
      () => {
        clearTimeout(t0);
        t0 = setTimeout(
          () => {
            items.forEach(
              (it, i) => it.st === 'done' && paintStatus(it, i * 0.03),
            );
            totals(0);
          },
          reduce.matches ? 0 : 220,
        );
      },
      ctx,
    );

    // convert all
    const wait = (ms) =>
      new Promise((r) => setTimeout(r, reduce.matches ? 30 : ms));
    $('#convert').addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      const b = $('#convert');
      b.classList.add('is-busy');
      b.disabled = true;
      $('span', b).textContent = 'Converting';
      b.insertAdjacentHTML(
        'beforeend',
        `<span class="chev">${ic('chev').repeat(3)}</span>`,
      );
      for (const it of items) {
        if (it.st === 'done') continue;
        it.st = 'processing';
        paintStatus(it);
        await wait(750);
        it.st = it.badge === 'HEIC' ? 'error' : 'done';
        paintStatus(it, 0);
        totals(0);
      }
      b.classList.remove('is-busy');
      b.disabled = false;
      $('.chev', b).remove();
      $('span', b).textContent = 'Convert all';
      busy = false;
      snack(`${count()} of ${items.length} converted`);
    });
    $('#zip').addEventListener('click', async () => {
      if (zipping) return;
      zipping = true;
      const b = $('#zip');
      b.disabled = true;
      b.classList.add('is-busy');
      $('span', b).textContent = 'Zipping';
      await wait(1400);
      zipping = false;
      b.classList.remove('is-busy');
      $('span', b).textContent = 'Download all (ZIP)';
      b.disabled = false;
      snack(`squoosh-converted.zip saved (${count()} files)`);
    });
    // views
    const setView = (g) => {
      board.classList.toggle('is-grid', g);
      $('.boardwrap').classList.toggle('wrapgrid', g);
      $('#v-list').setAttribute('aria-pressed', !g);
      $('#v-grid').setAttribute('aria-pressed', g);
    };
    $('#v-list').addEventListener('click', () => setView(false));
    $('#v-grid').addEventListener('click', () => setView(true));

    // comparison modal
    const dlg = $('#cmp'),
      inner = $('#cmp-in');
    board.addEventListener('click', (e) => {
      const r = e.target.closest('.row');
      if (r) openCmp(+r.dataset.i, r);
    });
    function openCmp(i, opener) {
      const it = items[i],
        ms = Object.assign({}, st);
      if (!it.i) {
        inner.innerHTML = `<div class="cmp-h"><h2>${
          it.n
        }</h2><button class="ibtn" data-close aria-label="Close comparison">${ic(
          'close',
        )}</button></div><p class="note">${
          it.err || 'No preview is available for ' + it.badge + ' files.'
        }</p><p class="note">Original size ${fmt(it.o)}. Status: ${
          it.st === 'error' ? 'Error' : 'Pending'
        }.</p>`;
      } else {
        inner.innerHTML = `<div class="cmp-h"><h2>${
          it.n
        }</h2><button class="ibtn" data-close aria-label="Close comparison">${ic(
          'close',
        )}</button></div>${stageMarkup(it.n, it.i.src)}
        <div class="cmp-cols"><div><div class="fld"><label>Original</label></div><div class="tag"><p class="enc">Original Image</p><span class="flap" data-o style="--fs:2.4rem"></span><p class="delta is-orig">Original file, unchanged</p></div></div>
        <div><div class="fld"><label for="m-enc">Encoder</label><select id="m-enc">${Object.keys(
          ENC,
        )
          .filter((k) => k !== 'orig')
          .map(
            (k) =>
              `<option value="${k}" ${k === ms.enc ? 'selected' : ''}>${
                ENC[k].label
              }</option>`,
          )
          .join('')}</select></div>
        <div class="fld" id="m-qw"><label for="m-q">Quality<span class="val" id="m-qv">${
          ms.q
        }</span></label><input type="range" id="m-q" min="0" max="100" value="${
          ms.q
        }"></div>${tagHTML()}</div></div>`;
        initSplit($('.view', inner));
        const tag = $$('.tag', inner)[1],
          imgB = $('.pane-b img', inner),
          q = $('#m-q', inner);
        const upd = () => {
          ms.q = +q.value;
          $('#m-qv', inner).textContent = ms.q;
          fillRange(q);
          const e = ENC[ms.enc];
          $('#m-qw', inner).hidden = !e.f.includes('q');
          imgB.style.filter = filt(ms);
          const o = { o: it.o, w: it.i.w, h: it.i.h, src: it.i.src };
          paintTag(
            tag,
            ms,
            { o: it.o, w: it.i.w, h: it.i.h, src: it.i.src },
            true,
            it.n.replace(/\.[^.]+$/, ''),
            'm',
          );
        };
        $('#m-enc', inner).addEventListener('change', (e) => {
          ms.enc = e.target.value;
          ms.q = ENC[ms.enc].q || ms.q;
          q.value = ms.q;
          upd();
        });
        q.addEventListener('input', upd);
        flapSet($('[data-o]', inner), fmt(it.o));
        upd();
      }
      $('[data-close]', inner).addEventListener('click', () => dlg.close());
      dlg.addEventListener('close', () => opener && opener.focus(), {
        once: true,
      });
      dlg.showModal();
    }
  }
})();
