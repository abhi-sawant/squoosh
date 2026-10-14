/* Sprout prototype: shared behaviour for index / editor / bulk */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const KEY = 'sprout-pick';
  const page = document.body.dataset.page;

  const ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#eef6f0"/><rect x="6" y="6" width="88" height="88" rx="26" fill="#fff"/><path d="M26 70C26 42 40 28 74 28c0 32-14 42-48 42Z" fill="#8ccba6" stroke="#1f3a2d" stroke-width="4" stroke-linejoin="round"/><path d="M32 64c9-14 19-23 31-28" fill="none" stroke="#1f3a2d" stroke-width="4" stroke-linecap="round"/></svg>';
  const DEMOS = {
    photo: {
      name: 'photo.jpg',
      bytes: 2.8e6,
      src: '../assets/photo.jpg',
      w: 1400,
      h: 541,
    },
    art: {
      name: 'artwork.jpg',
      bytes: 2.9e6,
      src: '../assets/artwork.jpg',
      w: 1400,
      h: 937,
    },
    screen: {
      name: 'pixel3.png',
      bytes: 1.6e6,
      src: '../assets/screen.jpg',
      w: 587,
      h: 1200,
    },
    icon: {
      name: 'squoosh.svg',
      bytes: 13e3,
      src: 'data:image/svg+xml,' + encodeURIComponent(ICON_SVG),
      w: 512,
      h: 512,
    },
  };

  const fmt = (b) =>
    b < 1e3
      ? Math.round(b) + ' B'
      : b < 1e6
      ? Math.round(b / 1e3) + ' KB'
      : (b / 1e6).toFixed(1) + ' MB';

  const snackEl = $('#snack');
  let snackT;
  function snack(msg) {
    if (!snackEl) return;
    snackEl.textContent = msg;
    snackEl.classList.add('show');
    clearTimeout(snackT);
    snackT = setTimeout(() => snackEl.classList.remove('show'), 3800);
  }

  const fillRange = (el) =>
    el.style.setProperty('--pct', (el.value - el.min) / (el.max - el.min));
  document.addEventListener('input', (e) => {
    if (e.target.type === 'range') fillRange(e.target);
  });
  const initRanges = () => $$('input[type=range]').forEach(fillRange);

  const ENC = [
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
  const EI = {
    mozjpeg: { k: 1, mime: 'image/jpeg', ext: 'jpg' },
    webp: { k: 0.83, mime: 'image/webp', ext: 'webp' },
    avif: { k: 0.62, ext: 'avif' },
    jxl: { k: 0.7, ext: 'jxl' },
    webp2: { k: 0.6, ext: 'wp2' },
    browserjpeg: { k: 1.15, mime: 'image/jpeg', ext: 'jpg' },
    oxipng: { r: 0.55, lossless: true, ext: 'png' },
    qoi: { r: 0.9, lossless: true, ext: 'qoi' },
    browserpng: { r: 0.7, lossless: true, mime: 'image/png', ext: 'png' },
    browsergif: { r: 0.4, lossless: true, ext: 'gif' },
  };
  const HINTS = {
    mozjpeg: 'JPEG: works everywhere, great for photos.',
    webp: 'WebP: small files, works in all modern browsers.',
    avif: 'AVIF: the smallest files, newer apps only.',
    oxipng: 'PNG: sharp and lossless, best for screenshots and logos.',
  };
  const hintFor = (enc) => HINTS[enc] || 'Set in More settings.';
  const PRESETS = [40, 75, 92];

  function estimate(bytes, s) {
    if (s.enc === 'original') return bytes;
    const e = EI[s.enc] || EI.mozjpeg;
    let r = e.lossless ? e.r : e.k * 0.00567 * Math.exp(0.0347 * s.q);
    const sc = s.resize ? s.scale / 100 : 1;
    r *= sc * sc;
    if (s.palette) r *= Math.pow(s.colors / 256, 0.3);
    return Math.max(300, Math.round(bytes * r));
  }

  /* ---------- Compare slider (editor + dialog) ---------- */
  function makeCompare(stage) {
    const after = $('.layer.after', stage),
      handle = $('.handle', stage);
    let pos = 50,
      drag = false;
    const set = (p) => {
      pos = Math.min(95, Math.max(5, p));
      after.style.clipPath = `inset(0 0 0 ${pos}%)`;
      handle.style.left = pos + '%';
      handle.setAttribute('aria-valuenow', Math.round(pos));
      handle.setAttribute(
        'aria-valuetext',
        `Showing ${Math.round(pos)}% before`,
      );
    };
    const fromEvent = (e) => {
      const r = stage.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    };
    stage.addEventListener('pointerdown', (e) => {
      if (
        e.target.closest('.toolbar, .layout-btn') ||
        stage.classList.contains('sbs')
      )
        return;
      drag = true;
      stage.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    stage.addEventListener('pointermove', (e) => {
      if (drag) fromEvent(e);
    });
    const end = () => {
      drag = false;
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    handle.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      const m = {
        ArrowLeft: -step,
        ArrowDown: -step,
        ArrowRight: step,
        ArrowUp: step,
      };
      if (e.key in m) {
        set(pos + m[e.key]);
        e.preventDefault();
      } else if (e.key === 'Home') {
        set(0);
        e.preventDefault();
      } else if (e.key === 'End') {
        set(100);
        e.preventDefault();
      }
    });
    set(50);
    return { set };
  }

  const blurFor = (s) => {
    if (s.enc === 'original' || (EI[s.enc] && EI[s.enc].lossless && !s.palette))
      return 'none';
    const px =
      Math.max(0, (100 - s.q) / 55) + (s.palette ? (256 - s.colors) / 200 : 0);
    return px < 0.15 ? 'none' : `blur(${px.toFixed(2)}px)`;
  };

  /* ================= INDEX ================= */
  if (page === 'index') {
    const drop = $('#drop'),
      file = $('#file');
    const store = (o) => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(o));
        return true;
      } catch (e) {
        return false;
      }
    };

    async function handleFiles(list) {
      const files = [...list].filter(
        (f) =>
          f.type.startsWith('image/') ||
          /\.(heic|tiff?|avif|jxl|qoi)$/i.test(f.name),
      );
      if (!files.length) {
        snack(
          "That doesn't look like a picture. Try a JPEG, PNG or WebP file.",
        );
        return;
      }
      if (files.length > 1) {
        store({ type: 'many', count: files.length });
        location.href = 'bulk.html';
        return;
      }
      const f = files[0];
      const base = {
        type: 'file',
        name: f.name,
        size: f.size,
        dataUrl: null,
        w: 0,
        h: 0,
      };
      if (f.size < 3.5e6 && f.type.startsWith('image/')) {
        const url = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = () => res(null);
          r.readAsDataURL(f);
        });
        if (url) {
          const dims = await new Promise((res) => {
            const i = new Image();
            i.onload = () => res([i.naturalWidth, i.naturalHeight]);
            i.onerror = () => res([0, 0]);
            i.src = url;
          });
          Object.assign(base, { dataUrl: url, w: dims[0], h: dims[1] });
        }
      }
      if (!store(base)) {
        base.dataUrl = null;
        store(base);
      }
      location.href = 'editor.html';
    }

    $('#choose').addEventListener('click', () => file.click());
    file.addEventListener(
      'change',
      () => file.files.length && handleFiles(file.files),
    );

    let depth = 0;
    const over = (on) => drop.classList.toggle('is-over', on);
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      depth++;
      over(true);
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', () => {
      depth = Math.max(0, depth - 1);
      if (!depth) over(false);
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      depth = 0;
      over(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });

    const pasteBtn = $('#paste');
    if (navigator.clipboard && navigator.clipboard.read) {
      pasteBtn.hidden = false;
      pasteBtn.addEventListener('click', async () => {
        try {
          const items = await navigator.clipboard.read();
          for (const it of items) {
            const t = it.types.find((x) => x.startsWith('image/'));
            if (t) {
              const b = await it.getType(t);
              handleFiles([
                new File([b], 'pasted-image.' + t.split('/')[1], { type: t }),
              ]);
              return;
            }
          }
          snack(
            'No image found in the clipboard. Copy a picture first, then try again.',
          );
        } catch (e) {
          snack(
            "We couldn't read the clipboard. Allow access, or use Choose pictures.",
          );
        }
      });
    }
    window.addEventListener('paste', (e) => {
      const fs = [...(e.clipboardData ? e.clipboardData.files : [])];
      if (fs.length) handleFiles(fs);
      else
        snack(
          'No image found in the clipboard. Copy a picture first, then try again.',
        );
    });

    $$('[data-demo]').forEach((a) =>
      a.addEventListener('click', () =>
        store({ type: 'demo', key: a.dataset.demo }),
      ),
    );
    $('#install').addEventListener('click', () =>
      snack(
        "Installing isn't available in this preview, but it works in the real app.",
      ),
    );
  }

  /* ================= EDITOR ================= */
  if (page === 'editor') {
    let pick = null;
    try {
      pick = JSON.parse(sessionStorage.getItem(KEY));
    } catch (e) {
      /* none */
    }
    let src;
    if (pick && pick.type === 'file') {
      src = {
        name: pick.name,
        bytes: pick.size,
        url: pick.dataUrl || DEMOS.photo.src,
        w: pick.w || DEMOS.photo.w,
        h: pick.h || DEMOS.photo.h,
        real: !!pick.dataUrl,
      };
    } else {
      const d = DEMOS[(pick && pick.key) || 'photo'] || DEMOS.photo;
      src = {
        name: d.name,
        bytes: d.bytes,
        url: d.src,
        w: d.w,
        h: d.h,
        real: false,
      };
    }
    $('#fName').textContent = src.name;
    $('#fSize').textContent = fmt(src.bytes);
    document.title = `Squoosh: ${src.name}`;

    const stage = $('#stage'),
      imgB = $('#imgBefore'),
      imgA = $('#imgAfter');
    imgB.src = imgA.src = src.url;
    const srcImg = new Image();
    const dimsText = () => ($('#fDims').textContent = `${src.w} × ${src.h}`);
    srcImg.onload = () => {
      if (pick && pick.type === 'file' && !pick.w) {
        src.w = srcImg.naturalWidth;
        src.h = srcImg.naturalHeight;
      }
      dimsText();
      update();
    };
    srcImg.onerror = () => {
      $('#loadError').hidden = false;
    };
    srcImg.src = src.url;
    dimsText();

    const mk = (o) =>
      Object.assign(
        {
          enc: 'mozjpeg',
          q: 75,
          resize: false,
          scale: 50,
          palette: false,
          colors: 64,
        },
        o,
      );
    const state = { left: mk({ enc: 'original' }), right: mk() };
    const compare = makeCompare(stage);

    /* view tools */
    const zoomSteps = [25, 50, 75, 100, 125, 150, 200, 300, 400];
    let zoom = 100,
      rot = 0;
    const zoomInput = $('#zoomVal');
    const applyView = () => {
      stage.style.setProperty('--zoom', zoom / 100);
      stage.style.setProperty('--rot', rot + 'deg');
      zoomInput.value = zoom + '%';
    };
    $('#zoomIn').onclick = () => {
      zoom = zoomSteps.find((z) => z > zoom) || 400;
      applyView();
    };
    $('#zoomOut').onclick = () => {
      zoom = [...zoomSteps].reverse().find((z) => z < zoom) || 25;
      applyView();
    };
    zoomInput.onchange = () => {
      const n = parseInt(zoomInput.value, 10);
      zoom = Math.min(500, Math.max(10, isNaN(n) ? 100 : n));
      applyView();
    };
    $('#rotate').onclick = () => {
      rot += 90;
      applyView();
    };
    $('#bgBtn').onclick = (e) => {
      const s = stage.dataset.bg === 'checker' ? 'solid' : 'checker';
      stage.dataset.bg = s;
      e.currentTarget.setAttribute('aria-pressed', s === 'solid');
    };
    $('#smoothBtn').onclick = (e) => {
      const off = stage.dataset.smooth === 'on';
      stage.dataset.smooth = off ? 'off' : 'on';
      e.currentTarget.setAttribute('aria-pressed', off);
    };
    $('#layoutBtn').onclick = (e) => {
      const on = stage.classList.toggle('sbs');
      e.currentTarget.setAttribute('aria-pressed', on);
    };

    /* side panels (More settings) */
    const tpl = $('#sideTpl');
    const sides = {};
    const encOpts = ENC.map(
      ([v, l]) => `<option value="${v}">${l}</option>`,
    ).join('');
    ['left', 'right'].forEach((which) => {
      const node = tpl.content.cloneNode(true);
      const root = node.querySelector('.side');
      $('[data-f=title]', root).textContent =
        which === 'left' ? 'Left side (Original)' : 'Right side (Your result)';
      $('[data-f=copyLabel]', root).textContent =
        which === 'left' ? 'Copy to right side' : 'Copy to left side';
      $('[data-f=enc]', root).innerHTML = encOpts;
      $('#sides').appendChild(node);
      sides[which] = root;
      const f = (n) => $(`[data-f="${n}"]`, root);
      const s = state[which];
      root.addEventListener('input', (e) => {
        const n = e.target.dataset.f;
        if (!n) return;
        if (n === 'enc') s.enc = e.target.value;
        else if (n === 'q') s.q = +e.target.value;
        else if (n === 'resize') s.resize = e.target.checked;
        else if (n === 'pre') {
          if (e.target.value) {
            s.scale = +e.target.value;
          }
        } else if (n === 'w') {
          s.scale = Math.min(
            100,
            Math.max(1, Math.round((e.target.value / src.w) * 100)),
          );
        } else if (n === 'h') {
          s.scale = Math.min(
            100,
            Math.max(1, Math.round((e.target.value / src.h) * 100)),
          );
        } else if (n === 'palette') s.palette = e.target.checked;
        else if (n === 'colors') s.colors = +e.target.value;
        update(which);
      });
      root.addEventListener('change', (e) => {
        if (e.target.dataset.f === 'enc') update(which);
      });
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const other = which === 'left' ? 'right' : 'left';
        const pick2 = (o) => ({
          enc: o.enc,
          q: o.q,
          resize: o.resize,
          scale: o.scale,
          palette: o.palette,
          colors: o.colors,
        });
        if (b.dataset.act === 'copy') {
          Object.assign(state[other], pick2(s));
          snack(`Copied to the ${other} side.`);
          update();
        }
        if (b.dataset.act === 'save') {
          try {
            localStorage.setItem('sprout-side', JSON.stringify(pick2(s)));
            snack('Settings saved on this device.');
          } catch (x) {
            snack("We couldn't save the settings here.");
          }
        }
        if (b.dataset.act === 'import') {
          let o = null;
          try {
            o = JSON.parse(localStorage.getItem('sprout-side'));
          } catch (x) {
            /* none */
          }
          if (o) {
            Object.assign(s, o);
            snack('Saved settings imported.');
            update();
          } else snack("There aren't any saved settings yet. Save some first.");
        }
      });
    });

    function syncSide(which) {
      const root = sides[which],
        s = state[which];
      const set = (n, v, prop = 'value') => {
        const e = $(`[data-f="${n}"]`, root);
        if (e && e !== document.activeElement) e[prop] = v;
      };
      root.dataset.enc = s.enc;
      set('enc', s.enc);
      set('q', s.q);
      set('resize', s.resize, 'checked');
      set('palette', s.palette, 'checked');
      set('colors', s.colors);
      set(
        'pre',
        [100, 75, 50, 25, 10].includes(s.scale) ? String(s.scale) : '',
      );
      set('w', Math.round(src.w * (s.resize ? s.scale / 100 : 1)));
      set('h', Math.round(src.h * (s.resize ? s.scale / 100 : 1)));
      $$('output', root).forEach((o) => {
        const inp = o.closest('.field').querySelector('input');
        o.textContent = inp.value;
      });
      $$('input[type=range]', root).forEach(fillRange);
    }

    /* main (right-side) controls */
    const q = $('#quality'),
      fmtSel = $('#format'),
      resizeOn = $('#resizeOn'),
      scale = $('#scale'),
      paletteOn = $('#paletteOn'),
      colors = $('#colors');
    $$('input[name=preset]').forEach((r) =>
      r.addEventListener('change', () => {
        state.right.q = +r.value;
        update();
      }),
    );
    q.addEventListener('input', () => {
      state.right.q = +q.value;
      update();
    });
    fmtSel.addEventListener('change', () => {
      state.right.enc = fmtSel.value;
      update();
    });
    resizeOn.addEventListener('change', () => {
      state.right.resize = resizeOn.checked;
      update();
    });
    scale.addEventListener('input', () => {
      state.right.scale = +scale.value;
      update();
    });
    paletteOn.addEventListener('change', () => {
      state.right.palette = paletteOn.checked;
      update();
    });
    colors.addEventListener('input', () => {
      state.right.colors = +colors.value;
      update();
    });

    function syncMain() {
      const s = state.right,
        lossless = !!(EI[s.enc] && EI[s.enc].lossless);
      if (![...fmtSel.options].some((o) => o.value === s.enc)) {
        let o = $('option[data-other]', fmtSel);
        if (!o) {
          o = new Option('Other (see More settings)', s.enc);
          o.dataset.other = '1';
          fmtSel.add(o);
        }
        o.value = s.enc;
      }
      fmtSel.value = s.enc;
      $('#fmtHint').textContent = hintFor(s.enc);
      q.value = s.q;
      q.disabled = lossless;
      fillRange(q);
      $('#qBubble').textContent = s.q;
      $('#qWrap').style.setProperty('--pct', (s.q - 1) / 99);
      $('#qHint').hidden = !lossless;
      const match = PRESETS.includes(s.q) && !lossless;
      $$('input[name=preset]').forEach((r) => {
        r.checked = match && +r.value === s.q;
        r.disabled = lossless;
      });
      $('#customNote').textContent = lossless
        ? ''
        : match
        ? ''
        : `Custom settings: quality ${s.q}`;
      resizeOn.checked = s.resize;
      scale.value = s.scale;
      fillRange(scale);
      $('#scaleOut').textContent = s.scale + '%';
      $('#scaleHint').textContent = `${src.w} × ${src.h} becomes ${Math.round(
        (src.w * s.scale) / 100,
      )} × ${Math.round((src.h * s.scale) / 100)} pixels.`;
      paletteOn.checked = s.palette;
      colors.value = s.colors;
      fillRange(colors);
      $('#colorsOut').textContent = s.colors;
    }

    /* compute + render */
    let token = 0,
      timer,
      leafT,
      rightBlob = null,
      lastBytes = src.bytes;
    async function encodeCanvas(s) {
      const e = EI[s.enc];
      if (
        !e ||
        !e.mime ||
        location.protocol === 'file:' ||
        !srcImg.naturalWidth
      )
        return null;
      try {
        const sc = s.resize ? s.scale / 100 : 1;
        const w = Math.max(1, Math.round(srcImg.naturalWidth * sc)),
          h = Math.max(1, Math.round(srcImg.naturalHeight * sc));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.drawImage(srcImg, 0, 0, w, h);
        if (s.palette && s.colors < 64) {
          const lv = Math.max(2, Math.round(Math.cbrt(s.colors))),
            d = x.getImageData(0, 0, w, h),
            a = d.data,
            st = 255 / (lv - 1);
          for (let i = 0; i < a.length; i += 4) {
            a[i] = Math.round(a[i] / st) * st;
            a[i + 1] = Math.round(a[i + 1] / st) * st;
            a[i + 2] = Math.round(a[i + 2] / st) * st;
          }
          x.putImageData(d, 0, 0);
        }
        const blob = await new Promise((r) =>
          c.toBlob(r, e.mime, e.lossless ? undefined : s.q / 100),
        );
        if (!blob || blob.type !== e.mime) return null;
        return { url: URL.createObjectURL(blob), bytes: blob.size, blob };
      } catch (err) {
        return null;
      }
    }

    function paintSizes(which, bytes) {
      const el = $('[data-f=size]', sides[which]);
      if (state[which].enc === 'original')
        el.textContent = `${fmt(src.bytes)}, original`;
      else
        el.textContent = `${fmt(bytes)}, ${Math.round(
          (1 - bytes / src.bytes) * 100,
        )}% smaller`;
    }

    function setLeafPop() {
      const leaf = $('#leaf');
      leaf.style.animation = 'none';
      void leaf.offsetWidth;
      leaf.style.animation = '';
    }

    async function render(my) {
      const out = {};
      for (const which of ['left', 'right']) {
        const s = state[which];
        let r =
          s.enc === 'original'
            ? { url: src.url, bytes: src.bytes, original: true }
            : await encodeCanvas(s);
        if (my !== token) return;
        const bytes =
          r && !r.original && src.real ? r.bytes : estimate(src.bytes, s);
        out[which] = {
          url: r ? r.url : src.url,
          bytes,
          filter: r ? 'none' : blurFor(s),
          blob: r && r.blob,
        };
      }
      imgB.src = out.left.url;
      imgB.style.filter = out.left.filter;
      imgA.src = out.right.url;
      imgA.style.filter = out.right.filter;
      rightBlob = out.right.blob || null;
      lastBytes = out.right.bytes;
      paintSizes('left', out.left.bytes);
      paintSizes('right', out.right.bytes);
      const pct = Math.round((1 - out.right.bytes / src.bytes) * 100);
      const res = $('#result');
      const smaller = pct > 0;
      $('#leaf').hidden = !smaller;
      $('#resTitle').textContent = smaller
        ? `Nice! ${pct}% smaller`
        : 'That one came out a little bigger';
      $('#resSizes').textContent = smaller
        ? `${fmt(src.bytes)} → ${fmt(out.right.bytes)}`
        : `${fmt(src.bytes)} → ${fmt(
            out.right.bytes,
          )}. Try a smaller size or another format.`;
      $('#stickyMain').textContent = smaller
        ? `${pct}% smaller`
        : 'Slightly bigger';
      $('#stickySub').textContent = `${fmt(src.bytes)} → ${fmt(
        out.right.bytes,
      )}`;
      res.dataset.state = 'done';
      $('#download').disabled = $('#download2').disabled = false;
      if (smaller) setLeafPop();
    }

    function update() {
      syncMain();
      syncSide('left');
      syncSide('right');
      $('#result').dataset.state = 'working';
      $('#download').disabled = $('#download2').disabled = true;
      $('#stickyMain').textContent = 'Working…';
      clearTimeout(timer);
      const my = ++token;
      timer = setTimeout(() => render(my), 380);
    }

    function download() {
      const ext = (EI[state.right.enc] || EI.mozjpeg).ext;
      const base = src.name.replace(/\.[^.]+$/, '');
      if (rightBlob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(rightBlob);
        a.download = `${base}-squoosh.${ext}`;
        a.click();
        snack(`Saved ${base}-squoosh.${ext}`);
      } else
        snack(
          `Saved ${base}-squoosh.${ext} (${fmt(
            lastBytes,
          )}). In the real app the file downloads here.`,
        );
    }
    $('#download').onclick = download;
    $('#download2').onclick = download;

    initRanges();
    applyView();
    update();
  }

  /* ================= BULK ================= */
  if (page === 'bulk') {
    const ITEMS = [
      { n: 'Beach-walk.jpg', k: 'photo', b: 2.8e6, s: 'done' },
      { n: 'Grandma-garden.jpg', k: 'art', b: 2.9e6, s: 'done' },
      { n: 'Phone-screenshot.png', k: 'screen', b: 1.6e6, s: 'done' },
      { n: 'Birthday-cake.jpg', k: 'photo', b: 3.4e6, s: 'done' },
      { n: 'Lake-morning.jpg', k: 'photo', b: 2.2e6, s: 'done' },
      { n: 'Poster-draft.jpg', k: 'art', b: 3.1e6, s: 'done' },
      { n: 'Receipt-scan.tiff', ext: 'TIFF', b: 4.2e6, s: 'done' },
      {
        n: 'Garden-party.jpg',
        k: 'art',
        b: 2.5e6,
        s: 'error',
        why: 'It looks like a corrupted file.',
      },
      { n: 'Camping-trip.jpg', k: 'photo', b: 3.0e6, s: 'pending' },
      { n: 'App-settings.png', k: 'screen', b: 1.4e6, s: 'pending' },
      { n: 'IMG_3320.heic', ext: 'HEIC', b: 2.1e6, s: 'pending' },
      { n: 'Sketchbook.jpg', k: 'art', b: 2.7e6, s: 'pending' },
    ];
    ITEMS.forEach((it, i) => {
      it.j = 0.94 + ((i * 37) % 13) / 100;
      it.retries = 0;
    });
    const S = { enc: 'mozjpeg', q: 75, scale: 50, palette: false, colors: 64 };
    const ratio = (it) => {
      const e = EI[S.enc] || EI.mozjpeg;
      const base = e.lossless ? e.r * 0.5 : (0.05 + (S.q / 100) * 0.35) * e.k;
      let r = base * (0.3 + 0.7 * (S.scale / 100)) * it.j;
      if (S.palette) r *= Math.pow(S.colors / 256, 0.3);
      return Math.min(0.95, r);
    };
    const outBytes = (it) => it.b * ratio(it);

    const tilesEl = $('#tiles');
    const spinner = '<span class="spin" aria-hidden="true"></span>';
    const ic = (p) =>
      `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
    function tileHTML(it, i) {
      const d = it.k && DEMOS[it.k];
      const ph = d
        ? `<img src="${d.src}" alt="" loading="lazy">`
        : `<span class="ext">${it.ext}</span>`;
      const spin = it.s === 'processing' ? spinner : '';
      let chip = '',
        meta = fmt(it.b),
        extra = '';
      if (it.s === 'pending') chip = '<span class="chip">Waiting</span>';
      if (it.s === 'processing')
        chip = `<span class="chip busy">Converting</span>`;
      if (it.s === 'done') {
        const ob = outBytes(it);
        chip = `<span class="chip done">${ic(
          '<path d="m5 12 5 5 9-10"/>',
        )}Done, saved ${Math.round((1 - ob / it.b) * 100)}%</span>`;
        meta = `${fmt(it.b)} → ${fmt(ob)}`;
      }
      if (it.s === 'error') {
        chip = `<span class="chip err">Couldn't convert</span>`;
        extra = `<p class="why">${
          it.retries
            ? "Still didn't work. This file looks corrupted, so try saving it again from the app that made it."
            : it.why + ' Try again, or pick another file.'
        }</p><button class="btn secondary small" type="button" data-retry="${i}">${ic(
          '<path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/>',
        )}Try again</button>`;
      }
      return `<li class="tile" data-status="${it.s}"><button class="tile-open" type="button" data-open="${i}" aria-label="Compare ${it.n}"><span class="ph">${ph}${spin}</span><span class="name">${it.n}</span><span class="meta">${meta}</span></button><div class="tile-foot">${chip}${extra}</div></li>`;
    }

    let running = false,
      zipBusy = false;
    function render(note) {
      tilesEl.innerHTML = ITEMS.map(tileHTML).join('');
      const done = ITEMS.filter((i) => i.s === 'done'),
        total = ITEMS.length,
        errs = ITEMS.filter((i) => i.s === 'error').length;
      const saved = done.reduce((a, i) => a + (i.b - outBytes(i)), 0);
      $('#sub').textContent = `${total} images · ${done.length} converted`;
      const proc = ITEMS.find((i) => i.s === 'processing');
      let txt = `${done.length} of ${total} converted`;
      if (proc) txt = `Converting ${done.length + 1} of ${total}`;
      else if (note === 'finished')
        txt = errs
          ? `All done! ${done.length} of ${total} converted. ${errs} needs another look.`
          : `All done! All ${total} converted.`;
      $('#progText').textContent = txt;
      $('#savedText').textContent = `You've saved ${fmt(saved)} so far`;
      $('#progFill').style.width = (done.length / total) * 100 + '%';
      $('#track').setAttribute('aria-valuenow', done.length);
      const btn = $('#convertAll');
      const left = ITEMS.some((i) => i.s === 'pending');
      btn.disabled = !left && !running;
      btn.setAttribute('aria-busy', running);
      btn.innerHTML = running ? `${spinner} Converting…` : 'Convert all';
      if (running) btn.disabled = true;
      const zip = $('#zip');
      zip.disabled = done.length === 0 || zipBusy;
      zip.setAttribute('aria-busy', zipBusy);
      zip.innerHTML = zipBusy
        ? `${spinner} Making your ZIP…`
        : `${ic(
            '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
          )} Download all as ZIP`;
    }

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    async function convertAll() {
      if (running) return;
      running = true;
      for (const it of ITEMS.filter((i) => i.s === 'pending')) {
        it.s = 'processing';
        render();
        await wait(700);
        it.s = 'done';
        render();
      }
      running = false;
      render('finished');
      snack('All done! Your pictures are ready.');
    }
    $('#convertAll').onclick = convertAll;
    $('#zip').onclick = async () => {
      if (zipBusy) return;
      zipBusy = true;
      render();
      await wait(1300);
      zipBusy = false;
      render();
      snack('Your ZIP is ready: squoosh-pictures.zip');
    };

    tilesEl.addEventListener('click', async (e) => {
      const r = e.target.closest('[data-retry]');
      if (r) {
        const it = ITEMS[+r.dataset.retry];
        it.s = 'processing';
        render();
        await wait(900);
        it.s = 'error';
        it.retries++;
        render();
        return;
      }
      const o = e.target.closest('[data-open]');
      if (o) openDialog(+o.dataset.open);
    });

    /* settings */
    const q = $('#quality'),
      fmtSel = $('#format'),
      enc = $('#enc'),
      scale = $('#scale'),
      pal = $('#paletteOn'),
      colors = $('#colors');
    enc.innerHTML = ENC.filter(([v]) => v !== 'original')
      .map(([v, l]) => `<option value="${v}">${l}</option>`)
      .join('');
    function syncSettings() {
      if (![...fmtSel.options].some((o) => o.value === S.enc)) {
        let o = $('option[data-other]', fmtSel);
        if (!o) {
          o = new Option('Other (see More settings)', S.enc);
          o.dataset.other = '1';
          fmtSel.add(o);
        }
        o.value = S.enc;
      }
      fmtSel.value = S.enc;
      enc.value = S.enc;
      q.value = S.q;
      $('#qOut').textContent = S.q;
      $('#cmpQ').value = S.q;
      $('#cmpQOut').textContent = S.q;
      scale.value = S.scale;
      $('#scaleOut').textContent = S.scale + '%';
      pal.checked = S.palette;
      colors.value = S.colors;
      $('#colorsOut').textContent = S.colors;
      $('#fmtHint').textContent = hintFor(S.enc);
      const lossless = !!(EI[S.enc] && EI[S.enc].lossless);
      q.disabled = $('#cmpQ').disabled = lossless;
      const match = PRESETS.includes(S.q) && !lossless;
      $$('input[name=preset]').forEach((r) => {
        r.checked = match && +r.value === S.q;
        r.disabled = lossless;
      });
      $('#customNote').textContent =
        lossless || match ? '' : `Custom settings: quality ${S.q}`;
      initRanges();
      render();
      if (cmp.open) paintDialog();
    }
    $$('input[name=preset]').forEach((r) =>
      r.addEventListener('change', () => {
        S.q = +r.value;
        syncSettings();
      }),
    );
    q.addEventListener('input', () => {
      S.q = +q.value;
      syncSettings();
    });
    $('#cmpQ').addEventListener('input', (e) => {
      S.q = +e.target.value;
      syncSettings();
    });
    fmtSel.addEventListener('change', () => {
      S.enc = fmtSel.value;
      syncSettings();
    });
    enc.addEventListener('change', () => {
      S.enc = enc.value;
      syncSettings();
    });
    scale.addEventListener('input', () => {
      S.scale = +scale.value;
      syncSettings();
    });
    pal.addEventListener('change', () => {
      S.palette = pal.checked;
      syncSettings();
    });
    colors.addEventListener('input', () => {
      S.colors = +colors.value;
      syncSettings();
    });

    /* dialog */
    const cmp = $('#cmp');
    let current = 0;
    const cmpCompare = makeCompare($('#cmpStage'));
    function paintDialog() {
      const it = ITEMS[current],
        d = it.k && DEMOS[it.k];
      $('#cmpTitle').textContent = it.n;
      const ok = !!d;
      const fake = Object.assign({}, S, { enc: S.enc });
      $('#cmpBefore').src = ok ? d.src : DEMOS.photo.src;
      $('#cmpAfter').src = ok ? d.src : DEMOS.photo.src;
      $('#cmpAfter').style.filter = blurFor(fake);
      const ob = outBytes(it);
      const pct = Math.round((1 - ob / it.b) * 100);
      $('#cmpMeta').textContent =
        it.s === 'done'
          ? `${fmt(it.b)} → ${fmt(ob)}. Saved ${pct}%.`
          : it.s === 'error'
          ? `This one didn't convert: ${it.why.toLowerCase()} This is a preview only.`
          : `Preview at the current settings: about ${fmt(
              ob,
            )}, ${pct}% smaller. Not converted yet.`;
      if (!ok)
        $('#cmpMeta').textContent +=
          ' (No preview for this file type, so a sample image is shown.)';
    }
    function openDialog(i) {
      current = i;
      paintDialog();
      cmpCompare.set(50);
      cmp.showModal();
      initRanges();
    }
    $('#cmpClose').onclick = () => cmp.close();
    $('#cmpDone').onclick = () => cmp.close();
    cmp.addEventListener('click', (e) => {
      if (e.target === cmp) cmp.close();
    });

    initRanges();
    syncSettings();
  }
})();
