// Spotter website: shader background, hero demo, scroll reveals and counters.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const isLight = () => root.dataset.theme === 'light';

  /* ---------- Theme ---------- */
  const setTheme = (t, save) => {
    root.dataset.theme = t;
    if (save) try { localStorage.setItem('theme', t); } catch (e) {}
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    window.dispatchEvent(new Event('themechange'));
  };
  document.querySelector('.theme-toggle')?.addEventListener('click', () => setTheme(isLight() ? 'dark' : 'light', true));
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    let saved = null; try { saved = localStorage.getItem('theme'); } catch (err) {}
    if (!saved) setTheme(e.matches ? 'light' : 'dark', false);
  });
  setTheme(root.dataset.theme || 'dark', false);

  /* ---------- Flowing light background (WebGL) ---------- */
  const canvas = document.getElementById('bg');
  const gl = canvas && !still && canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (gl) {
    const vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    const fs = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float s;uniform float L;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
 vec2 uv=gl_FragCoord.xy/r;
 vec2 p=uv*vec2(r.x/r.y,1.)*1.05+vec2(0.,s*.3);
 float T=t*.045;
 vec2 q=vec2(fbm(p+vec2(0.,T)),fbm(p+vec2(5.2,1.3)-T));
 vec2 w=vec2(fbm(p+2.8*q+vec2(1.7,9.2)+T*1.3),fbm(p+2.8*q+vec2(8.3,2.8)-T*.9));
 float f=fbm(p+2.6*w+(m-.5)*.5);
 vec3 col=vec3(.025,.03,.09);
 float a=smoothstep(.38,.68,f);
 col=mix(col,vec3(.17,.16,.5),a*.85);
 col=mix(col,vec3(1.,.42,.1),smoothstep(.45,.72,q.x)*smoothstep(.42,.7,w.y)*.7);
 col=mix(col,vec3(.95,.22,.55),smoothstep(.5,.72,w.x)*a*.45);
 col+=vec3(.55,.4,1.)*pow(a,6.)*.3;
 float streak=pow(max(0.,sin((uv.x*1.3-uv.y*.8)*6.+T*5.+f*6.)),12.);
 col+=vec3(1.,.55,.2)*streak*a*.22;
 col*=mix(.35,1.05,smoothstep(.05,.95,uv.y));
 col*=1.-.45*exp(-dot((uv-vec2(.5,.62))*vec2(1.5,2.6),(uv-vec2(.5,.62))*vec2(1.5,2.6))*1.6);
 vec3 lc=vec3(.985,.972,.955);
 lc=mix(lc,vec3(.86,.84,1.),a*.6);
 lc=mix(lc,vec3(1.,.8,.62),smoothstep(.45,.72,q.x)*smoothstep(.42,.7,w.y)*.6);
 lc=mix(lc,vec3(1.,.8,.88),smoothstep(.5,.72,w.x)*a*.45);
 lc+=vec3(1.,.6,.3)*streak*a*.06;
 lc=mix(lc,vec3(.99,.985,.975),.55*exp(-dot((uv-vec2(.5,.62))*vec2(1.5,2.6),(uv-vec2(.5,.62))*vec2(1.5,2.6))*1.6));
 col=mix(col,lc,L);
 col+=(h(gl_FragCoord.xy+fract(t))-.5)*mix(.025,.012,L);
 gl_FragColor=vec4(col,1.);
}`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't');
      const uM = gl.getUniformLocation(prog, 'm'), uS = gl.getUniformLocation(prog, 's'), uL = gl.getUniformLocation(prog, 'L');
      let light = isLight() ? 1 : 0;
      const mouse = [0.5, 0.5], target = [0.5, 0.5];
      addEventListener('pointermove', e => { target[0] = e.clientX / innerWidth; target[1] = 1 - e.clientY / innerHeight; }, { passive: true });
      const scale = Math.min(devicePixelRatio || 1, 2) * 0.45;
      const resize = () => {
        canvas.width = Math.ceil(innerWidth * scale); canvas.height = Math.ceil(innerHeight * scale);
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      resize(); addEventListener('resize', () => { resize(); draw(performance.now()); });
      let last = 0;
      const start = performance.now();
      const draw = now => {
        mouse[0] += (target[0] - mouse[0]) * 0.04; mouse[1] += (target[1] - mouse[1]) * 0.04;
        gl.uniform2f(uR, canvas.width, canvas.height);
        gl.uniform1f(uT, 20 + (now - start) / 1000);
        gl.uniform2f(uM, mouse[0], mouse[1]);
        light += ((isLight() ? 1 : 0) - light) * 0.12;
        gl.uniform1f(uL, light);
        gl.uniform1f(uS, scrollY / innerHeight);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      const frame = now => {
        requestAnimationFrame(frame);
        if (document.hidden || now - last < 33) return;
        last = now;
        draw(now);
      };
      draw(start);
      addEventListener('themechange', () => { light = isLight() ? 1 : 0; draw(performance.now()); });
      requestAnimationFrame(frame);
      document.documentElement.classList.add('has-gl');
    }
  }

  /* ---------- Peter's Mac: a real search over sample files ---------- */
  // k: kind, f: folder, src: download source, d: date, pl: place, t: text inside, how: where the text came from
  const FILES = [
    { n: 'Peter_Rossi-Payslip_Aug-2025.pdf', k: 'pdf', f: 'Downloads', src: 'mail.google.com', d: '2025-09-02', t: 'payslip august 2025 monthly salary net pay peter rossi acme srl' },
    { n: 'Payslip_Feb2024.pdf', k: 'pdf', f: 'Documents/Work', d: '2024-03-01', t: 'pay slip february 2024 salary statement gross net peter rossi' },
    { n: 'CU_2025_Certificazione_Unica.pdf', k: 'pdf', f: 'Documents/Tax', d: '2025-03-10', t: 'certificazione unica 2025 employee salary income tax withheld employer acme' },
    { n: 'Folio_Hotel_Belvedere_Dec25.pdf', k: 'pdf', f: 'Downloads', src: 'mail.google.com', d: '2025-12-23', pl: 'Positano, Amalfi Coast', t: 'guest folio hotel belvedere positano check-in 21 december 2025 room charges 1840 eur receipt' },
    { n: 'IMG_20250614_ricevuta.jpg', k: 'img', f: 'Downloads', src: 'WhatsApp', d: '2025-06-14', pl: 'Florence, Tuscany', how: 'ocr', t: 'albergo firenze hotel ricevuta tax invoice room 2 nights 386 eur' },
    { n: 'Booking_Confirmation_Rome.pdf', k: 'pdf', f: 'Downloads', src: 'booking.com', d: '2024-04-10', pl: 'Rome', t: 'booking confirmation hotel reservation rome 3 nights guest peter rossi' },
    { n: 'Acme_MSA_2025.pdf', k: 'pdf', f: 'Documents/Clients', d: '2025-01-15', t: 'master services agreement acme 60 days written notice termination early exit fee contract' },
    { n: 'Acme_MSA_2024.pdf', k: 'pdf', f: 'Documents/Clients', d: '2024-01-12', t: 'master services agreement acme 30 days written notice termination contract' },
    { n: 'Screenshot 2026-03-14 at 21.04.png', k: 'shot', f: 'Desktop', d: '2026-03-14', how: 'ocr', t: 'network casa_fibra_5g wifi password girasole-4471 router' },
    { n: 'Screenshot 2026-02-02 at 10.11.png', k: 'shot', f: 'Desktop', d: '2026-02-02', how: 'ocr', t: 'poste italiane tracking number rr123456789it parcel delivery' },
    { n: 'IMG_4521.HEIC', k: 'img', f: 'Photos library', d: '2025-05-03', pl: 'Florence, Tuscany' },
    { n: 'IMG_4533.MOV', k: 'vid', f: 'Photos library', d: '2025-05-04', pl: 'Siena, Tuscany' },
    { n: 'DSC_0192.JPG', k: 'img', f: 'Pictures/Tuscany Trip', d: '2025-05-05', pl: 'San Gimignano, Tuscany' },
    { n: 'IMG_7781.HEIC', k: 'img', f: 'Photos library', d: '2025-12-22', pl: 'Positano, Amalfi Coast' },
    { n: 'IMG_7790.MOV', k: 'vid', f: 'Photos library', d: '2025-12-22', pl: 'Amalfi, Amalfi Coast' },
    { n: 'Glovo_Invoice_9921.pdf', k: 'pdf', f: 'Downloads', src: 'mail.google.com', d: '2025-02-02', t: 'glovo invoice order 9921 total 18.40 eur receipt delivery' },
    { n: 'Statement_Oct2026.pdf', k: 'pdf', f: 'Downloads', src: 'mail.google.com', d: '2026-10-31', never: true, t: 'bank statement october 2026 account balance' },
    { n: 'Policy_Schedule_Renewal.pdf', k: 'pdf', f: 'Downloads', src: 'mail.google.com', d: '2026-09-12', never: true, t: 'insurance policy schedule renewal premium' },
    { n: 'Pitch_Deck_v7.key', k: 'doc', f: 'Projects/Startup', d: '2026-10-20', t: 'pitch deck pricing 69 eur month investors slides presentation' },
    { n: 'Lease_Agreement_Milano.pdf', k: 'pdf', f: 'Documents/Home', d: '2024-09-01', pl: 'Milan', t: 'lease agreement rental apartment milano pets allowed with written consent deposit contract' },
    { n: 'Boarding_Pass_FCO_LHR.pdf', k: 'pdf', f: 'Downloads', src: 'mail.google.com', d: '2026-04-02', pl: 'Rome', t: 'boarding pass flight rome fiumicino london heathrow e-ticket pnr itinerary' },
    { n: 'Passport_scan.pdf', k: 'pdf', f: 'Documents/ID', d: '2023-06-10', how: 'ocr', t: 'passport scan identity document peter rossi repubblica italiana' },
    { n: 'Tessera_Sanitaria.jpg', k: 'img', f: 'Documents/ID', d: '2023-06-10', how: 'ocr', t: 'tessera sanitaria codice fiscale health card identity' },
    { n: 'Lab_Report_March.pdf', k: 'pdf', f: 'Documents/Health', d: '2026-03-20', t: 'lab report blood test medical results' },
    { n: 'Voice Memo 2026-01-12.m4a', k: 'aud', f: 'Voice Memos', d: '2026-01-12', how: 'speech', t: 'meeting notes budget q1 hiring plan launch date' },
    { n: 'Q3_Board_Deck.key', k: 'doc', f: 'Projects/Startup', d: '2026-10-05', t: 'board deck q3 revenue presentation slides hiring' },
    { n: 'Resume_Peter_Rossi.pdf', k: 'pdf', f: 'Documents/Work', d: '2026-02-11', t: 'resume cv curriculum vitae product manager milan' },
    { n: 'Wedding_Photos.zip', k: 'zip', f: 'Downloads', d: '2024-07-21', t: 'wedding photos archive' },
    { n: 'invoice_parser.py', k: 'code', f: 'Projects/scripts', d: '2025-11-02', t: 'python script invoice parser receipt' }
  ];
  const SYN = [
    ['payslip', 'pay slip', 'salary slip', 'salary statement', 'pay stub', 'salary'],
    ['invoice', 'bill', 'receipt', 'ricevuta', 'tax invoice'],
    ['hotel', 'stay', 'booking', 'reservation', 'check-in', 'folio', 'room', 'guest', 'albergo'],
    ['flight', 'airline', 'boarding pass', 'e-ticket', 'pnr', 'itinerary', 'ticket'],
    ['contract', 'agreement', 'msa', 'terms'],
    ['tax', 'income tax', 'certificazione unica', 'withheld'],
    ['id', 'identity', 'passport', 'codice fiscale', 'personal documents', 'document'],
    ['medical', 'lab report', 'blood test', 'health'],
    ['resume', 'cv', 'curriculum vitae'],
    ['deck', 'presentation', 'slides', 'pitch'],
    ['wifi', 'wi-fi', 'network', 'router'],
    ['notes', 'meeting notes', 'memo', 'transcript'],
    ['lease', 'rental', 'apartment']
  ];
  const PLACES = { tuscany: ['tuscany', 'florence', 'siena', 'san gimignano'], florence: ['florence'], siena: ['siena'], rome: ['rome'], milan: ['milan'], milano: ['milan'],
    amalfi: ['amalfi', 'positano'], positano: ['positano'], italy: ['tuscany', 'amalfi', 'rome', 'milan', 'positano', 'florence', 'siena'] };
  const KINDS = { pdf: ['pdf'], pdfs: ['pdf'], photo: ['img'], photos: ['img'], picture: ['img'], pictures: ['img'], image: ['img', 'shot'], images: ['img', 'shot'],
    video: ['vid'], videos: ['vid'], screenshot: ['shot'], screenshots: ['shot'], recording: ['aud'], recordings: ['aud'], code: ['code'] };
  const STOP = new Set('a an the my me i of in on at to for from with and or all any show find get files file that this these those is are was were it its what whats which where when how do does did please some s last year never opened ever coast'.split(' '));
  const sing = w => w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
  const wordsOf = str => (str || '').toLowerCase().replace(/[_\-.]/g, ' ').split(/[^a-z0-9à-ù']+/).filter(Boolean).map(w => sing(w.replace(/'s$/, '')));

  function parse(raw) {
    const q = raw.toLowerCase().trim();
    const out = { kinds: null, places: null, year: null, src: null, never: false, terms: [], chips: [] };
    let rest = ' ' + q.replace(/[?!.,]/g, ' ') + ' ';
    const take = (re, fn) => { const m = rest.match(re); if (m) { fn(m); rest = rest.replace(re, ' '); } };
    take(/ (?:that )?i (?:have )?never opened | never opened | unopened /, () => { out.never = true; out.chips.push(['Opened', 'Never']); });
    for (const g of SYN) for (const v of g) if (v.includes(' ')) take(new RegExp(' ' + v + 's? '), () => out.terms.push(v));
    take(/ (?:from |on )?(gmail|google mail|whatsapp|booking(?:\.com)?) /, m => { out.src = m[1].startsWith('g') ? 'mail.google.com' : m[1].startsWith('w') ? 'WhatsApp' : 'booking.com'; out.chips.push(['From', out.src]); });
    take(/ last year /, () => { out.year = '2025'; out.chips.push(['Date', '2025']); });
    take(/ (20\d\d) /, m => { out.year = m[1]; out.chips.push(['Date', m[1]]); });
    for (const w of rest.split(/\s+/).filter(Boolean)) {
      const word = w.replace(/'s$/, '');
      if (KINDS[word]) { out.kinds = (out.kinds || []).concat(KINDS[word]); out.chips.push(['Kind', word.replace(/s$/, '')]); continue; }
      if (PLACES[word]) { out.places = (out.places || []).concat(PLACES[word]); out.chips.push(['Place', word[0].toUpperCase() + word.slice(1) + ', Italy']); continue; }
      if (word === 'and' && out.kinds) continue;
      if (!STOP.has(word) && word.length > 1) out.terms.push(sing(word));
    }
    out.terms = [...new Set(out.terms)];
    for (const t of out.terms) out.chips.splice(out.chips.length, 0, ['Contains', t]);
    return out;
  }
  function synonymsFor(term, text) {
    for (const g of SYN) {
      const hit = g.some(v => sing(v) === term || v === term);
      if (hit) { const found = g.find(v => v !== term && (' ' + text + ' ').includes(' ' + v + ' ')); if (found) return found; }
    }
    return null;
  }
  function search(raw) {
    const p = parse(raw);
    const results = [];
    let alsoMatching = new Set();
    for (const f of FILES) {
      if (p.kinds && !p.kinds.includes(f.k)) continue;
      if (p.places && !(f.pl && p.places.some(x => f.pl.toLowerCase().includes(x)))) continue;
      if (p.year && !(f.d || '').startsWith(p.year)) continue;
      if (p.src && f.src !== p.src) continue;
      if (p.never && !f.never) continue;
      const nameW = new Set(wordsOf(f.n)), textW = new Set(wordsOf(f.t)), text = (f.t || '').toLowerCase();
      let score = 0, nameHits = 0; const tags = new Set(); let snipWords = [];
      for (const t of p.terms) {
        if (t.includes(' ')) { const nm = f.n.toLowerCase().replace(/[_\-.]/g, ' '); if ((' ' + text + ' ').includes(' ' + t) || nm.includes(t)) { score += 1; tags.add(f.how === 'ocr' ? 'ocr' : 'text'); snipWords.push(t); continue; } const s2 = synonymsFor(t, text + ' ' + nm); if (s2) { score += 0.62; tags.add('mean'); alsoMatching.add(s2); snipWords.push(s2); } continue; }
        if (nameW.has(t)) { score += 1; nameHits++; tags.add('name'); snipWords.push(t); }
        else if (textW.has(t)) { score += 1; tags.add(f.how === 'ocr' ? 'ocr' : f.how === 'speech' ? 'speech' : 'text'); snipWords.push(t); }
        else { const s = synonymsFor(t, text + ' ' + f.n.toLowerCase().replace(/[_\-.]/g, ' ')); if (s) { score += 0.62; tags.add('mean'); alsoMatching.add(s); snipWords.push(s); } }
      }
      let pct;
      if (p.terms.length) {
        if (score === 0) continue;
        pct = (score / p.terms.length) * 0.92 + (nameHits / p.terms.length) * 0.08;
        if (f.k === 'code' && !(p.kinds || []).includes('code') && !p.terms.some(t => ['python', 'script', 'code'].includes(t))) pct *= 0.25;
      } else if (p.kinds || p.places || p.year || p.src || p.never) pct = 1; else continue;
      if (p.places) tags.add('place');
      if (p.src || p.never) tags.add('src');
      if (p.year && !p.terms.length) tags.add('date');
      const v = Math.max(1, Math.min(100, Math.round(pct * 100)));
      results.push({ f, v, tags: [...tags], snip: snippet(f, snipWords) });
    }
    results.sort((a, b) => b.v - a.v || (b.f.d || '').localeCompare(a.f.d || ''));
    if (alsoMatching.size) p.chips.push(['m', [...alsoMatching].slice(0, 3).join(' · ')]);
    return { p, results: results.filter(r => r.v >= 30).slice(0, 4) };
  }
  function snippet(f, words) {
    if (!f.t || !words.length) return '';
    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    let s = esc(f.t);
    for (const w of [...new Set(words)].sort((a, b) => b.length - a.length)) s = s.replace(new RegExp('\\b(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?)\\b', 'i'), '<mark>$1</mark>');
    return s.length > 96 ? s.slice(0, 96) + '…' : s;
  }
  const ANSWERS = [
    { re: /notice|terminat|cancel/, ans: `<p><b>60 days' written notice</b> from either side. Leaving within the first year costs an early-exit fee.</p><span class="cite">Acme_MSA_2025.pdf · p. 7</span><span class="cite">Acme_MSA_2025.pdf · p. 12</span><p class="ai-more">Last year's version said 30 days. <a>Compare versions →</a></p>` },
    { re: /\bpets?\b|dog|cat/, ans: `<p><b>Yes, with written consent</b> from the landlord. The deposit covers any damage.</p><span class="cite">Lease_Agreement_Milano.pdf · p. 4</span>` },
    { re: /spend|spent|total|how much/, ans: `<p>Your Glovo receipts this year add up to <b>€486.70</b> across 23 orders.</p><span class="cite">23 sources</span><span class="cite">Export to Numbers</span>` },
    { re: /delete|clean|space|free up/, ans: `<p>About <b>18.4 GB</b> you probably don't need. Everything goes to the Trash, so you can put it back.</p><ul class="ai-list"><li><span>Installers you already installed</span><b>3.6 GB</b></li><li><span>Downloads untouched for a year</span><b>6.1 GB</b></li><li><span>Duplicates, turned into clones</span><b>4.0 GB</b></li></ul>` }
  ];
  const isQuestion = q => /\?\s*$/.test(q) || /^(what|whats|what's|when|how|does|do|is|can|which|who|why)\b/i.test(q.trim());
  const ICO = { pdf: ['pdf', 'PDF'], img: ['img', 'IMG'], vid: ['vid', 'MOV'], shot: ['img', 'PNG'], doc: ['doc', 'KEY'], aud: ['aud', 'M4A'], zip: ['zip', 'ZIP'], code: ['code', 'PY'] };
  const TAG = { name: ['t-name', 'Name'], text: ['t-text', 'Text'], ocr: ['t-ocr', 'Image text'], speech: ['t-ocr', 'Transcript'], mean: ['t-mean', 'Meaning'], place: ['t-meta', 'Place'], src: ['t-src', 'Source'], date: ['t-name', 'Date'] };
  const ring = v => `<span class="score" style="--v:${v}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" pathLength="100"/><circle class="fill" cx="18" cy="18" r="15.5" pathLength="100"/></svg><b>${v}</b></span>`;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function render(raw) {
    const q = raw.trim();
    if (!q) return `<div class="empty"><img src="logo.webp" alt="" width="70" height="64"><p>Ask Peter's Mac anything. Try <b>"invoices from last year"</b> or <b>"does my lease allow pets?"</b></p></div>`;
    if (isQuestion(q)) {
      const a = ANSWERS.find(x => x.re.test(q.toLowerCase()));
      if (a) return `<div class="ai-answer"><span class="ai-badge"><svg><use href="#i-spark"/></svg>Answer from Peter's files</span>${a.ans}</div>`;
    }
    const { p, results } = search(q);
    const chips = p.chips.map(([k, v]) => k === 'm' ? `<span class="m">Also matching <b>${esc(v)}</b></span>` : `<span>${k} <b>${esc(v)}</b></span>`).join('');
    if (!results.length) return `<div class="chips">${chips}</div><div class="empty ask"><p><b>Nothing confident on Peter's Mac.</b> Spotter would ask: did you mean a document or a photo? From this year, or any time?</p></div>`;
    return `<div class="chips">${chips}</div><ul class="files">${results.map(({ f, v, tags, snip }) => {
      const [c, l] = ICO[f.k];
      const where = [f.f, f.pl, f.src && 'from ' + f.src].filter(Boolean).join(' · ');
      return `<li><i class="ico ${c}">${l}</i><div class="f-main"><b>${esc(f.n)}</b><small>${esc(where)}</small>${snip ? `<small class="snip">…${snip}</small>` : ''}<span class="tags">${tags.map(x => `<em class="${TAG[x][0]}">${TAG[x][1]}</em>`).join('')}</span></div>${ring(v)}</li>`;
    }).join('')}</ul>`;
  }

  const input = document.getElementById('q'), answer = document.getElementById('answer');
  const fc = document.getElementById('fileCount'); if (fc) fc.textContent = FILES.length;
  const btns = [...document.querySelectorAll('.try button')];
  let typing, timer, auto = true, cur = -1;
  const update = () => {
    answer.classList.remove('in');
    answer.innerHTML = render(input.value);
    requestAnimationFrame(() => answer.classList.add('in'));
    window.dispatchEvent(new CustomEvent('spotted'));
  };
  function play(i) {
    if (!input) return;
    cur = i; clearInterval(typing); clearTimeout(timer);
    btns.forEach((b, j) => b.classList.toggle('on', j === i));
    const q = btns[i].textContent;
    if (still) { input.value = q; update(); return; }
    let k = 0; input.value = '';
    typing = setInterval(() => {
      input.value = q.slice(0, ++k);
      if (k >= q.length) { clearInterval(typing); update(); if (auto) timer = setTimeout(() => play((cur + 1) % btns.length), 6500); }
    }, 28);
  }
  if (input) {
    const stopAuto = () => { auto = false; clearInterval(typing); clearTimeout(timer); };
    btns.forEach((b, i) => b.addEventListener('click', () => { stopAuto(); play(i); input.focus({ preventScroll: true }); }));
    ['focus', 'pointerdown', 'keydown'].forEach(ev => input.addEventListener(ev, stopAuto));
    let deb; input.addEventListener('input', e => { if (e.isTrusted) stopAuto(); btns.forEach(b => b.classList.remove('on')); clearTimeout(deb); deb = setTimeout(update, 120); });
    play(0);
  }

  /* ---------- Logo scene: file dots flowing into the Spotter orb ---------- */
  const flow = document.getElementById('flow');
  const scene = document.querySelector('.scene');
  if (flow && scene && !still) {
    const ctx = flow.getContext('2d');
    const logo = scene.querySelector('.scene-logo');
    const COLORS = ['#ff7a1a', '#ffc53d', '#ff3d8b', '#8b5cf6', '#1fb6ff', '#d946ef', '#ff5a5f'];
    let W = 0, H = 0, dpr = 1, box = { x: 0, y: 0, w: 1, h: 1 }, dots = [], glow = 0, visible = true, last = 0;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = scene.getBoundingClientRect(), l = logo.getBoundingClientRect();
      W = r.width; H = r.height; flow.width = W * dpr; flow.height = H * dpr;
      box = { x: l.left - r.left, y: l.top - r.top, w: l.width, h: l.height };
    };
    const orb = () => ({ x: box.x + box.w * 0.783, y: box.y + box.h * 0.573, r: box.w * 0.15 });
    const spawn = burst => {
      const o = orb();
      const sy = box.y + box.h * (0.38 + Math.random() * 0.36);
      dots.push({ x0: box.x - box.w * (0.05 + Math.random() * 0.25) * (burst ? 0.4 : 1), y0: sy, t: 0, sp: (burst ? 0.012 : 0.004) + Math.random() * 0.004,
        r: 3 + Math.random() * 5, c: COLORS[(Math.random() * COLORS.length) | 0], wob: Math.random() * 6.28, ox: o.x, oy: o.y });
    };
    const tick = now => {
      requestAnimationFrame(tick);
      if (!visible || document.hidden || now - last < 16) return;
      last = now;
      if (dots.length < 26 && Math.random() < 0.18) spawn(false);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const o = orb();
      dots = dots.filter(d => {
        d.t += d.sp;
        if (d.t >= 1) { glow = Math.min(1, glow + 0.18); return false; }
        const e = d.t * d.t * (3 - 2 * d.t);
        const x = d.x0 + (o.x - d.x0) * e;
        const y = d.y0 + (o.y - d.y0) * (e * e) + Math.sin(d.wob + d.t * 9) * 6 * (1 - e);
        const r = d.r * (1 - e * 0.85);
        ctx.globalAlpha = Math.min(1, d.t * 6) * (1 - Math.max(0, e - 0.85) / 0.15);
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = d.c; ctx.shadowColor = d.c; ctx.shadowBlur = 12; ctx.fill();
        return true;
      });
      ctx.shadowBlur = 0;
      if (glow > 0.01) {
        const g = ctx.createRadialGradient(o.x, o.y, o.r * 0.6, o.x, o.y, o.r * 2.2);
        g.addColorStop(0, `rgba(255, 170, 60, ${0.35 * glow})`); g.addColorStop(1, 'rgba(255, 120, 30, 0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 2.2, 0, 6.283); ctx.fill();
        glow *= 0.94;
      }
      ctx.globalAlpha = 1;
    };
    const ready = () => { size(); requestAnimationFrame(tick); };
    if (logo.complete) ready(); else logo.addEventListener('load', ready);
    addEventListener('resize', size);
    new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(scene);
    addEventListener('spotted', () => { for (let i = 0; i < 14; i++) spawn(true); });
  }

  /* ---------- Before / after switch ---------- */
  const ba = document.getElementById('ba');
  if (ba) {
    const seg = [...document.querySelectorAll('.seg button')];
    let flip;
    const set = v => { ba.dataset.v = v; seg.forEach(b => { b.classList.toggle('on', b.dataset.v === v); b.setAttribute('aria-selected', b.dataset.v === v); }); };
    seg.forEach(b => b.addEventListener('click', () => { clearInterval(flip); set(b.dataset.v); }));
    if (!still) flip = setInterval(() => set(ba.dataset.v === 'after' ? 'before' : 'after'), 4200);
  }

  /* ---------- Tilt on the hero desktop ---------- */
  const desk = document.querySelector('.desk');
  if (desk && !still && matchMedia('(pointer: fine)').matches) {
    desk.addEventListener('pointermove', e => {
      const r = desk.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      desk.style.transform = `perspective(1800px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`;
    });
    desk.addEventListener('pointerleave', () => { desk.style.transform = ''; });
  }

  /* ---------- Scroll reveals and count-ups ---------- */
  const count = el => {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    if (still) { el.textContent = end.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1600;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (end * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    en.target.querySelectorAll('[data-count]').forEach(count);
    io.unobserve(en.target);
  }), { threshold: 0.18 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
