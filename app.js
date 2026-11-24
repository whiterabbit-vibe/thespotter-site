// Spotter website: Spot, the fluted glass, and the demos. No libraries, no tracking.
(() => {
  'use strict';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const plainGlass = matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const DOWNLOAD = 'https://github.com/whiterabbit-vibe/thespotter-site/releases/latest/download/Spotter.dmg';

  // ---------- Theme ----------
  const root = document.documentElement;
  const toggle = $('#themeToggle');
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches;
  const labelToggle = () => toggle && toggle.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
  labelToggle();
  systemDark.addEventListener?.('change', labelToggle);
  toggle?.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    labelToggle();
  });

  // ---------- Spot ----------
  // The same creature as the app (SpotCreature.swift), drawn in SVG on a radius of 50.
  const NS = 'http://www.w3.org/2000/svg';
  const NAVY = '#14213D';
  let pointer = null;
  addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });

  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    parent?.appendChild(node);
    return node;
  };
  let spotCount = 0;

  class Spot {
    constructor(host) {
      this.host = host;
      this.size = +host.dataset.size || 32;
      this.mood = host.dataset.mood || 'idle';
      this.moodStart = -10;
      this.poked = -10;
      host.addEventListener('pointerdown', () => { this.poked = performance.now() / 1000; });
      const id = 'spot' + (++spotCount);
      const svg = el('svg', { width: this.size, height: this.size, viewBox: '-60 -60 120 120', 'aria-hidden': 'true' }, host);
      const defs = el('defs', {}, svg);
      const body = el('radialGradient', { id: id + 'b', gradientUnits: 'userSpaceOnUse', cx: -16, cy: -19, r: 62.5 }, defs);
      // Coral, or orange while worried (the menu bar's "your Mac needs a look", SpotCreature.swift).
      const worried = this.mood === 'worried';
      [['0', worried ? '#FFE2B3' : '#FFC9BE'], ['.45', worried ? '#FFA53D' : '#FF7D6C'], ['1', worried ? '#E8780F' : '#EE4E3D']]
        .forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, body));
      const rim = el('linearGradient', { id: id + 'r', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0 }, rim);
      el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': .35 }, rim);
      const soft = el('radialGradient', { id: id + 's' }, defs);
      el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': .55 }, soft);
      el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, soft);
      const blush = el('radialGradient', { id: id + 'c' }, defs);
      el('stop', { offset: 0, 'stop-color': '#FF8FA3', 'stop-opacity': .8 }, blush);
      el('stop', { offset: 1, 'stop-color': '#FF8FA3', 'stop-opacity': 0 }, blush);

      this.g = el('g', {}, svg);
      this.body = el('ellipse', { rx: 50, ry: 50, fill: `url(#${id}b)` }, this.g);
      this.rim = el('ellipse', { rx: 49.2, ry: 49.2, fill: 'none', stroke: `url(#${id}r)`, 'stroke-width': 2.4 }, this.g);
      this.shine = el('ellipse', { fill: `url(#${id}s)` }, this.g);
      this.cheeks = [-1, 1].map(() => el('ellipse', { fill: `url(#${id}c)` }, this.g));
      this.eyes = [-1, 1].map(() => {
        const g = el('g', {}, this.g);
        return {
          eye: el('ellipse', { fill: NAVY }, g),
          glint: el('circle', { fill: '#fff', 'fill-opacity': .95 }, g),
          small: el('circle', { fill: '#fff', 'fill-opacity': .6 }, g),
          arc: el('path', { fill: 'none', stroke: NAVY, 'stroke-linecap': 'round' }, g),
        };
      });
      // Brows, as in the app: up when curious or happy, knitted while thinking.
      this.brows = this.size >= 26 || this.mood === 'worried' ? [-1, 1].map(() => el('path', { fill: 'none', stroke: NAVY, 'stroke-opacity': .85, 'stroke-linecap': 'round' }, this.g)) : [];
      this.mouth = el('path', { stroke: NAVY, 'stroke-linecap': 'round' }, this.g);
      this.tongue = el('ellipse', { fill: '#FF8FA3' }, this.g);
      this.draw(0);
    }

    set(mood) {
      if (mood === this.mood) return;
      this.mood = mood;
      this.moodStart = performance.now() / 1000;
    }

    // A repeatable "random" number in 0..1 for a whole number, as SpotCreature.chance does.
    static chance(n, salt) {
      const x = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
      return x - Math.floor(x);
    }

    // Blinks at uneven gaps (2.5 s beats, some skipped), one in four a double blink.
    blink(t) {
      const beat = 2.5, index = Math.floor(t / beat), length = 0.15;
      let amount = 0;
      for (const n of [index - 1, index]) {
        if (Spot.chance(n, 1) >= 0.62) continue;
        const start = n * beat + Spot.chance(n, 2) * beat;
        for (const offset of Spot.chance(n, 3) < 0.25 ? [0, 0.27] : [0]) {
          const p = (t - start - offset) / length;
          if (p >= 0 && p <= 1) amount = Math.max(amount, Math.sin(p * Math.PI));
        }
      }
      return amount;
    }

    // With the pointer far away, a glance now and then.
    glance(t) {
      const beat = 3.2, index = Math.floor(t / beat);
      if (Spot.chance(index, 7) >= 0.45) return [0, 0];
      const phase = (t - index * beat) / beat, ease = Math.sin(Math.min(1, phase * 1.4) * Math.PI);
      return [(Spot.chance(index, 8) * 2 - 1) * 0.9 * ease, (Spot.chance(index, 9) * 2 - 1) * 0.5 * ease];
    }

    draw(t) {
      const still = reduceMotion.matches;
      if (still) t = 0;
      const mood = this.mood;
      const since = t - this.moodStart;
      const working = mood === 'thinking';
      const breathe = still ? 0 : Math.sin(t * 1.7) * 0.025;
      const bob = still ? 0 : Math.sin(t * 1.1) * 2;
      // A landing squash and a small hop after finding something.
      let sx = 1, sy = 1, hop = 0;
      if (!still && mood === 'happy' && since >= 0 && since < 1.2) {
        const w = Math.exp(-5.5 * since) * Math.cos(15 * since);
        sx = 1 + 0.14 * w; sy = 1 - 0.12 * w;
        if (since < 0.5) hop = Math.sin(since / 0.5 * Math.PI) * 17;
      }
      // Clicked: a quick startled squeeze.
      const poke = t - this.poked;
      if (!still && poke >= 0 && poke < 0.7) {
        const w = Math.exp(-6 * poke) * Math.cos(18 * poke);
        sx *= 1 - 0.1 * w; sy *= 1 + 0.12 * w;
      }
      const rx = 50 * (1 + breathe) * sx, ry = 50 * (1 + breathe) * sy;
      this.g.setAttribute('transform', `translate(0 ${(bob - hop + (50 - ry)).toFixed(2)})`);
      this.body.setAttribute('rx', rx); this.body.setAttribute('ry', ry);
      this.rim.setAttribute('rx', rx - .8); this.rim.setAttribute('ry', ry - .8);
      Object.entries({ cx: -rx * 0.305, cy: -ry * 0.54, rx: rx * 0.3, ry: ry * 0.18 }).forEach(([k, v]) => this.shine.setAttribute(k, v));
      this.cheeks.forEach((c, i) => {
        const side = i ? 1 : -1;
        c.setAttribute('cx', side * rx * 0.5); c.setAttribute('cy', ry * 0.28);
        c.setAttribute('rx', rx * 0.17); c.setAttribute('ry', ry * 0.1);
      });

      // Eyes: follow the pointer, scan while working.
      let lx = 0, ly = 0, curious = 0;
      if (working) { lx = still ? 0 : Math.sin(t * 2.4); ly = 0.15; }
      else {
        const r = this.host.getBoundingClientRect();
        const dx = pointer ? pointer.x - (r.left + r.width / 2) : 1e6, dy = pointer ? pointer.y - (r.top + r.height / 2) : 0;
        const dist = Math.hypot(dx, dy);
        if (pointer && dist < this.size * 8) {
          const len = Math.max(1, dist), pull = Math.min(1, len / (this.size * 3));
          lx = dx / len * pull; ly = dy / len * pull;
          // Perks up as the pointer comes close.
          curious = Math.max(0, Math.min(1, 1 - (dist - this.size * 0.6) / (this.size * 1.6)));
        } else if (!still) {
          [lx, ly] = this.glance(t);
        }
      }
      const shiftX = lx * rx * 0.12, shiftY = ly * ry * 0.1;
      const blink = still ? 0 : this.blink(t);
      const eyeW = rx * 0.26 * (1 + curious * 0.08), eyeH = ry * 0.36 * (1 + curious * 0.12);
      this.brows.forEach((b, i) => {
        const side = i ? 1 : -1;
        let raise = curious * 0.35, slant = 0;
        if (mood === 'happy') raise += 0.3;
        if (working) { raise += 0.15; slant = -0.35; }
        if (mood === 'worried') { raise += 0.2; slant = -0.6; }
        const cx = side * rx * 0.3 + lx * rx * 0.1, cy = -ry * 0.02 - eyeH * 0.95 - raise * eyeH * 0.5 + ly * ry * 0.06;
        const half = rx * 0.13;
        const ix = cx - side * half, iy = cy + slant * half * 0.6, ox = cx + side * half, oy = cy - slant * half * 0.6;
        b.setAttribute('d', `M${ix} ${iy}Q${cx} ${cy - half * 0.35} ${ox} ${oy}`);
        b.setAttribute('stroke-width', Math.max(2.2, rx * 0.055));
      });
      this.eyes.forEach((e, i) => {
        const side = i ? 1 : -1;
        const cx = side * rx * 0.28 + shiftX, cy = -ry * 0.02 + shiftY;
        const arc = mood === 'happy' || (mood === 'idle' && blink > 0.95);
        e.arc.style.display = arc ? '' : 'none';
        e.eye.style.display = e.glint.style.display = e.small.style.display = arc ? 'none' : '';
        if (arc) {
          e.arc.setAttribute('d', `M${cx - eyeW * .75} ${cy + eyeH * .12}Q${cx} ${cy - eyeH * .55} ${cx + eyeW * .75} ${cy + eyeH * .12}`);
          e.arc.setAttribute('stroke-width', Math.max(3, rx * 0.075));
          return;
        }
        let h = eyeH * (1 - blink * 0.92);
        if (working) h *= 0.88;
        e.eye.setAttribute('cx', cx); e.eye.setAttribute('cy', cy);
        e.eye.setAttribute('rx', eyeW / 2); e.eye.setAttribute('ry', Math.max(1.2, h) / 2);
        const open = h > eyeH * 0.4;
        e.glint.style.display = e.small.style.display = open ? '' : 'none';
        const glint = eyeW * 0.44, small = eyeW * 0.18;
        e.glint.setAttribute('cx', cx + glint * .45);
        e.glint.setAttribute('cy', cy - h / 2 + h * .12 + glint / 2); e.glint.setAttribute('r', glint / 2);
        e.small.setAttribute('cx', cx - eyeW / 2 + eyeW * .2 + small / 2);
        e.small.setAttribute('cy', cy + h / 2 - h * .32 + small / 2); e.small.setAttribute('r', small / 2);
      });

      // Mouth.
      const my = ry * 0.3;
      this.tongue.style.display = 'none';
      if (mood === 'happy') {
        this.mouth.setAttribute('d', `M${-rx * .18} ${my - ry * .04}Q0 ${my + ry * .3} ${rx * .18} ${my - ry * .04}Z`);
        this.mouth.setAttribute('fill', NAVY); this.mouth.setAttribute('stroke-width', 0);
        this.tongue.style.display = '';
        this.tongue.setAttribute('cx', 0); this.tongue.setAttribute('cy', my + ry * .1);
        this.tongue.setAttribute('rx', rx * .08); this.tongue.setAttribute('ry', ry * .045);
      } else if (mood === 'worried') {
        // A small frown: the smile turned over.
        this.mouth.setAttribute('d', `M${-rx * .12} ${my + ry * .07}Q0 ${my - ry * .07} ${rx * .12} ${my + ry * .07}`);
        this.mouth.setAttribute('fill', 'none'); this.mouth.setAttribute('stroke-width', Math.max(2.6, rx * 0.065));
      } else if (working) {
        this.mouth.setAttribute('d', `M${-rx * .06} ${my + ry * .025}a${rx * .06} ${ry * .065} 0 1 0 ${rx * .12} 0a${rx * .06} ${ry * .065} 0 1 0 ${-rx * .12} 0Z`);
        this.mouth.setAttribute('fill', NAVY); this.mouth.setAttribute('stroke-width', 0);
      } else {
        this.mouth.setAttribute('d', `M${-rx * .12} ${my - ry * .02}Q0 ${my + ry * .14} ${rx * .12} ${my - ry * .02}`);
        this.mouth.setAttribute('fill', 'none'); this.mouth.setAttribute('stroke-width', Math.max(2.6, rx * 0.065));
      }
    }
  }

  const spots = $$('[data-spot]').map(h => new Spot(h));
  const spotOf = host => spots.find(s => s.host === host);
  const visible = new Set(spots);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      const s = spotOf(e.target); if (!s) return;
      e.isIntersecting ? visible.add(s) : visible.delete(s);
    }));
    spots.forEach(s => io.observe(s.host));
  }
  const tick = () => {
    const t = performance.now() / 1000;
    if (!document.hidden) visible.forEach(s => s.draw(t));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ---------- Fluted glass ----------
  // A port of FlutedGlass.swift: each 11 px rib shows a squeezed, shifted slice of the light
  // behind it, with a lit left edge and a shaded right edge. Spot is the light source.
  const canvas = $('#glass');
  const heroSpot = $('#heroSpot');
  const glass = { intensity: 0.55, target: 0.55, animating: false };
  const RIB = 11, SCALE = 0.25; // the light is smooth, so it's drawn at a quarter size

  function drawLight(ctx, w, h, glow, intensity) {
    const k = SCALE, W = w * 3, reach = Math.max(w, h);
    ctx.setTransform(k, 0, 0, k, w * k, 0); // light space runs from -w to 2w
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#16244A'); base.addColorStop(1, '#0F1A31');
    ctx.fillStyle = base; ctx.fillRect(-w, 0, W, h);
    const radial = (x, y, r, stops) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      stops.forEach(([o, c]) => g.addColorStop(o, c));
      ctx.fillStyle = g; ctx.fillRect(-w, 0, W, h);
    };
    radial(w * .16, h * .2, reach * .48, [[0, 'rgba(73,88,168,.7)'], [1, 'rgba(73,88,168,0)']]);
    radial(w * .94, h * .04, reach * .3, [[0, 'rgba(244,237,224,.14)'], [1, 'rgba(244,237,224,0)']]);
    const s = 0.55 + 0.45 * intensity;
    radial(glow.x, glow.y, reach * .36, [[0, `rgba(255,107,91,${.95 * s})`], [.4, `rgba(255,107,91,${.45 * s})`], [1, 'rgba(255,107,91,0)']]);
    radial(glow.x, glow.y, reach * .1, [[0, `rgba(255,181,158,${.55 * s})`], [1, 'rgba(255,181,158,0)']]);
  }

  let light, ribShade;
  function renderGlass() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    // The glow sits where Spot is (on narrow screens Spot is lower, so is the glow).
    let glow = { x: w * .76, y: h * .45 };
    if (heroSpot) {
      const s = heroSpot.getBoundingClientRect();
      if (s.width) glow = { x: s.left + s.width / 2 - rect.left, y: s.top + s.height / 2 - rect.top + h * .06 };
    }
    light = light || document.createElement('canvas');
    light.width = Math.ceil(w * 3 * SCALE); light.height = Math.ceil(h * SCALE);
    const lctx = light.getContext('2d');
    drawLight(lctx, w, h, glow, glass.intensity);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (plainGlass.matches) {
      ctx.drawImage(light, w * SCALE, 0, w * SCALE, h * SCALE, 0, 0, canvas.width, canvas.height);
      return;
    }
    for (let x = 0; x < w; x += RIB) {
      // A rib squeezes a wider strip (RIB / 0.45) into its width and nudges it sideways.
      const p0 = x + RIB * 0.5 + (RIB * 0.5 - RIB * 0.6) / 0.45;
      const sw = RIB / 0.45;
      ctx.drawImage(light, (p0 + w) * SCALE, 0, sw * SCALE, h * SCALE,
                    Math.round(x * dpr), 0, Math.ceil(RIB * dpr), canvas.height);
    }
    if (!ribShade || ribShade.dpr !== dpr) {
      const tile = document.createElement('canvas');
      tile.width = Math.round(RIB * dpr); tile.height = 1;
      const t = tile.getContext('2d');
      const g = t.createLinearGradient(0, 0, tile.width, 0);
      g.addColorStop(0, 'rgba(255,255,255,.09)'); g.addColorStop(.2, 'rgba(255,255,255,.03)');
      g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(.75, 'rgba(0,0,0,.06)'); g.addColorStop(1, 'rgba(0,0,0,.2)');
      t.fillStyle = g; t.fillRect(0, 0, tile.width, 1);
      ribShade = { pattern: ctx.createPattern(tile, 'repeat'), dpr };
    }
    ctx.fillStyle = ribShade.pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function setGlow(target) {
    glass.target = target;
    if (reduceMotion.matches) { glass.intensity = target; renderGlass(); return; }
    if (glass.animating) return;
    glass.animating = true;
    const step = () => {
      const d = glass.target - glass.intensity;
      glass.intensity += d * 0.12;
      if (Math.abs(d) < 0.01) { glass.intensity = glass.target; glass.animating = false; }
      renderGlass();
      if (glass.animating) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if (canvas) {
    let pending = false;
    const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; renderGlass(); }); } };
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(canvas);
    addEventListener('resize', schedule);
    plainGlass.addEventListener?.('change', schedule);
    renderGlass();
  }

  // ---------- Demo helpers ----------
  const icon = name => `<svg class="i"><use href="#i-${name}"/></svg>`;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function type(target, text, token) {
    target.textContent = '';
    if (reduceMotion.matches) { target.textContent = text; return; }
    for (const ch of text) {
      if (token.cancelled) return;
      target.textContent += ch;
      await sleep(45 + Math.random() * 55);
    }
  }

  // ---------- Hero: the box finds a file ----------
  // Illustrative demo data for the made-up user Peter Veronica (California, US dollars). The ranking benchmark runs on its own fixture set (benchmark/), not on these files.
  const HERO = [
    { q: 'landlord notice to move out', kind: 'doc', name: 'Lease_Oak_St_2025.pdf',
      why: 'Scanned lease, page 3: “written notice of non-renewal at least 60 days before the end of the term.” Read from the scan.',
      tiles: [['doc', 'Lease_Renewal_Letter.pdf', 'From your landlord'], ['shot', 'Screenshot 3.18 PM.png', 'Move-out checklist · text in the image'], ['doc', 'Renters_Insurance_2026.pdf', 'Same address']] },
    { q: 'home depot receipt', kind: 'photo', name: 'IMG_5120.HEIC',
      why: 'A photo of a till receipt: Home Depot, Oakland, October 12. TOTAL $55.05. The words were read from the picture.',
      tiles: [['photo', 'IMG_5091.HEIC', 'Receipt · Ace Hardware'], ['doc', 'HomeDepot_Order_Sep.pdf', 'Order confirmation'], ['doc', 'Expenses_October.numbers', 'Mentions “Home Depot”']] },
    { q: 'insurance for the cat', kind: 'doc', name: 'Pet_Insurance_Luna.pdf',
      why: 'Pet insurance for Luna, your cat. Covers vet visits up to $1,500 a year.',
      tiles: [['doc', 'Vet_Visit_Luna.pdf', 'Vet receipt · Luna'], ['photo', 'IMG_2210.HEIC', 'Luna on the sofa'], ['doc', 'Car_Insurance_Subaru.pdf', 'Another policy']] },
    { q: 'kayak rental lake tahoe', kind: 'doc', name: 'Kayak_Rental_Tahoe.pdf',
      why: 'Tahoe Paddle Co.: four hours on Lake Tahoe, August 9. $280.',
      tiles: [['photo', 'IMG_4402.HEIC', 'Taken at Lake Tahoe'], ['doc', 'Tahoe_Cabin_Booking.pdf', 'Same summer trip'], ['shot', 'Screenshot 7.02 PM.png', 'Booking chat']] },
    { q: 'invoice i sent to bayline studio', kind: 'doc', name: 'Freelance_Invoice_007.pdf',
      why: 'Invoice 007 from you to Bayline Studio: design workshop, $1,600.',
      tiles: [['doc', 'Freelance_Invoice_006.pdf', 'The one before'], ['doc', 'Coworking_Invoice_Nov.pdf', 'Invoice · November'], ['shot', 'Screenshot 4.40 PM.png', 'Payment received']] },
  ];
  const heroTyped = $('#heroTyped'), heroResults = $('#heroResults'), heroStatus = $('#heroStatus');
  const heroSpotObj = heroSpot && spotOf(heroSpot);
  let heroToken = { cancelled: false };

  function showHero(item) {
    heroResults.innerHTML = `
      <div class="best"><span class="thumb ${item.kind}"></span><div>
        <span class="label">Best match · Sure match</span><h3>${esc(item.name)}</h3><p class="why">${esc(item.why)}</p>
        <div class="actions"><span>Open</span><span>Quick Look</span><span>Show in Finder</span></div></div></div>
      <div class="tiles">${item.tiles.map(([k, n, s]) => `<div class="tile"><span class="thumb ${k}"></span><b>${esc(n)}</b><small>${esc(s)}</small></div>`).join('')}</div>`;
  }

  async function heroLoop(token) {
    let i = 0;
    while (!token.cancelled) {
      const item = HERO[i % HERO.length];
      heroResults.innerHTML = '';
      heroStatus.textContent = '5,541 files ready';
      heroSpotObj?.set('idle'); setGlow(0.55);
      await sleep(i ? 700 : 900);
      if (token.cancelled) return;
      heroSpotObj?.set('thinking');
      await type(heroTyped, item.q, token);
      if (token.cancelled) return;
      await sleep(380);
      showHero(item);
      heroStatus.textContent = 'Searched 5,541 files on this Mac';
      heroSpotObj?.set('happy'); setGlow(1);
      await sleep(reduceMotion.matches ? 6000 : 4200);
      i++;
    }
  }

  function startHero() {
    heroToken.cancelled = true;
    heroToken = { cancelled: false };
    heroLoop(heroToken);
  }
  if (heroTyped) {
    if (reduceMotion.matches) {
      heroTyped.textContent = HERO[0].q; showHero(HERO[0]);
      heroStatus.textContent = 'Searched 5,541 files on this Mac';
      heroSpotObj?.set('happy'); setGlow(1);
    } else startHero();
  }
  // The films (made with Remotion, video/) never start by themselves; starting one pauses the others.
  const films = $$('video[controls]');
  films.forEach(v => v.addEventListener('play', () => films.forEach(o => { if (o !== v) o.pause(); })));

  // Tasks: a short, silent clip from the tour film. It plays while it's on screen (not with Reduce Motion),
  // and the button beside it pauses or plays it.
  const clip = $('#tasksClip'), clipToggle = $('#tasksClipToggle');
  if (clip && clipToggle) {
    let userPaused = reduceMotion.matches;
    const label = () => {
      const playing = !clip.paused;
      clipToggle.querySelector('span').textContent = playing ? 'Pause' : 'Play';
      clipToggle.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
      clipToggle.setAttribute('aria-label', playing ? 'Pause the clip' : 'Play the clip');
    };
    clip.addEventListener('play', label); clip.addEventListener('pause', label);
    clipToggle.addEventListener('click', () => {
      if (clip.paused) { userPaused = false; clip.play().catch(() => {}); } else { userPaused = true; clip.pause(); }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !userPaused) clip.play().catch(() => {});
        else if (!e.isIntersecting && !clip.paused) clip.pause();
      }, { threshold: 0.5 }).observe(clip);
    }
    label();
  }

  // ---------- One box, three answers ----------
  const DEMOS = {
    find: {
      q: 'wifi password',
      render: () => `
        <div class="best"><span class="thumb doc"></span><div>
          <span class="label">Best match · Sure match</span><h3>router_setup_notes.txt</h3>
          <p class="why">Home network notes with the WPA3 password for Veronica-Home-5G.</p>
          <div class="actions"><span>Open</span><span>Quick Look</span><span>Show in Finder</span></div></div></div>
        <div class="grid">
          ${[['shot', 'Screenshot 10.12 AM.png', 'Router admin page · text in the image'], ['photo', 'IMG_1187.HEIC', 'Photo of the router label'], ['doc', 'Moving_Checklist.md', 'Mentions "set up wifi"'], ['doc', 'Xfinity_Internet_Plan.pdf', 'Internet plan']]
            .map(([k, n, s]) => `<div class="item"><span class="thumb ${k}"></span><b>${n}</b><small>${s}</small></div>`).join('')}
        </div>`,
    },
    ask: {
      q: 'what does the tahoe cabin cost, and is the deposit paid?',
      render: () => `
        <div class="answer"><span class="label">Answer · Beta</span>
          <p class="big"><strong>$2,450</strong> for the Pine Ridge cabin in Tahoe City, August 3 to 10, 2026. The $500 deposit is paid.</p>
          <span class="cite"><span class="thumb doc"></span>Tahoe_Cabin_Booking.pdf · page 1</span>
          <p class="passage">“Booking confirmation. Pine Ridge Cabin, Tahoe City, Lake Tahoe. Guest Peter Veronica. August 3 to 10, 2026. <mark>Total $2,450.00, deposit paid $500.00.</mark>”</p>
        </div>`,
    },
    do: {
      q: "move october's receipts to Taxes 2026",
      render: () => `
        <div class="plan"><span class="label" style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)">Plan</span>
          <h3>Move 3 files to Documents › Taxes 2026</h3>
          <ul>
            <li>${icon('doc')}<span>Rent_Receipt_Oct2026.pdf</span><small>Rent for October · $2,850</small></li>
            <li>${icon('doc')}<span>Dentist_Invoice_Oct.pdf</span><small>Paid October 14 · $180</small></li>
            <li>${icon('photo')}<span>Receipt_Taqueria_Pancho.jpg</span><small>Restaurant receipt · photo</small></li>
          </ul>
          <div class="row" id="planRow"><span class="pill pill-coral">Approve</span><span class="pill ghost">Cancel</span>
            <span class="note">${icon('undo')}Nothing moves until you approve. One undo puts it back.</span></div>
        </div>`,
      after: async (body, token) => {
        await sleep(1700);
        if (token.cancelled) return;
        const row = $('#planRow', body);
        if (row) row.innerHTML = `<span class="done">${icon('check')}Moved 3 files.</span><span class="pill ghost">${icon('undo')}Undo</span>`;
      },
    },
  };
  const tabs = $$('.tabs [role="tab"]');
  const demoTyped = $('#demoTyped'), demoBody = $('#demoBody'), panel = $('#panel-demo');
  const bandSpot = spotOf($('#bandSpot'));
  let demoToken = { cancelled: false }, autoAdvance = true, demoVisible = false, demoRunning = false;

  async function runDemo(mode) {
    demoToken.cancelled = true;
    const token = demoToken = { cancelled: false };
    demoRunning = true;
    const demo = DEMOS[mode];
    tabs.forEach(t => {
      const on = t.dataset.mode === mode;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      t.querySelector('.progress')?.remove();
    });
    panel.setAttribute('aria-labelledby', 'tab-' + mode);
    // While the words are typed, Spot is visibly reading rather than showing an empty box.
    demoBody.innerHTML = '<div class="demo-wait" aria-hidden="true"><p>Spot is reading your files…</p><i></i><i></i><i></i></div>';
    bandSpot?.set('thinking');
    await type(demoTyped, demo.q, token);
    if (token.cancelled) return;
    await sleep(reduceMotion.matches ? 0 : 420);
    if (token.cancelled) return;
    demoBody.innerHTML = demo.render();
    bandSpot?.set('happy');
    if (demo.after && !reduceMotion.matches) await demo.after(demoBody, token);
    if (token.cancelled || !autoAdvance || reduceMotion.matches) { demoRunning = false; return; }
    // Move on to the next tab after a pause, with a thin bar showing the wait.
    const tab = tabs.find(t => t.dataset.mode === mode);
    const bar = document.createElement('span'); bar.className = 'progress';
    tab.appendChild(bar);
    bar.animate([{ width: '0%' }, { width: '100%' }], { duration: 4200, easing: 'linear', fill: 'forwards' });
    await sleep(4200);
    if (token.cancelled) return;
    bar.remove();
    demoRunning = false;
    if (!demoVisible) return; // resumes when scrolled back into view
    const next = tabs[(tabs.indexOf(tab) + 1) % tabs.length].dataset.mode;
    runDemo(next);
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { autoAdvance = false; runDemo(t.dataset.mode); });
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const next = tabs[(i + d + tabs.length) % tabs.length];
      next.focus(); autoAdvance = false; runDemo(next.dataset.mode);
    });
  });

  if (panel) {
    let started = false;
    const begin = () => { if (!started) { started = true; runDemo('find'); } };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        demoVisible = e.isIntersecting;
        if (!demoVisible) return;
        if (!started) begin();
        else if (autoAdvance && !demoRunning) {
          const cur = tabs.find(t => t.getAttribute('aria-selected') === 'true');
          runDemo(tabs[(tabs.indexOf(cur) + 1) % tabs.length].dataset.mode);
        }
      }, { threshold: 0.35 }).observe(panel);
    } else { demoVisible = true; begin(); }
  }

  // File names wrap like Finder's: after an underscore or before the extension, not mid-word.
  $$('.f > span, .meet .f > span').forEach(span => {
    const name = span.firstChild;
    if (!name || name.nodeType !== 3) return;
    const html = esc(name.textContent).replace(/_/g, '_<wbr>').replace(/\.(?=[^.]+$)/, '<wbr>.');
    const holder = document.createElement('span');
    holder.innerHTML = html;
    span.replaceChild(holder, name);
  });

  // Make sure every download link points at the same file.
  $$('a[href$="Spotter.dmg"]').forEach(a => { a.href = DOWNLOAD; });
})();
