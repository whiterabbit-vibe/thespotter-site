// Spotter website: theme, live search demo, feature tabs and scroll reveals.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---------- Theme ---------- */
  const setTheme = (t, save) => {
    root.dataset.theme = t;
    if (save) try { localStorage.setItem('theme', t); } catch (e) {}
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  };
  document.querySelector('.theme-toggle')?.addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    let saved = null; try { saved = localStorage.getItem('theme'); } catch (err) {}
    if (!saved) setTheme(e.matches ? 'dark' : 'light', false);
  });
  setTheme(root.dataset.theme || 'light', false);

  /* ---------- Nav border once scrolled ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => nav?.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

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
  const KIND = { pdf: 'PDF', img: 'JPG', vid: 'MOV', shot: 'PNG', doc: 'KEY', aud: 'M4A', zip: 'ZIP', code: 'PY' };
  const TAG = { name: 'Name', text: 'Text', ocr: 'Text in image', speech: 'Transcript', mean: 'Meaning', place: 'Place', src: 'Source', date: 'Date' };
  const SRC = { 'mail.google.com': 'Gmail', 'booking.com': 'Booking.com' };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ext = f => (f.n.split('.').pop() || KIND[f.k]).toUpperCase().slice(0, 4);

  function render(raw) {
    const q = raw.trim();
    if (!q) return `<div class="empty"><p>Describe a file the way you remember it.<br>Try <b>"invoices from last year"</b> or ask <b>"does my lease allow pets?"</b></p></div>`;
    if (isQuestion(q)) {
      const a = ANSWERS.find(x => x.re.test(q.toLowerCase()));
      if (a) return `<div class="ai-answer"><p class="answer-label">Answer from Peter's files</p><div class="answer-body">${a.ans}</div></div>`;
    }
    const { p, results } = search(q);
    const chips = p.chips.map(([k, v]) => k === 'm' ? `<span class="m">Also matching <b>${esc(v)}</b></span>` : `<span>${k} <b>${esc(v)}</b></span>`).join('');
    if (!results.length) return `${chips ? `<div class="chips">${chips}</div>` : ''}<div class="empty"><p><b>Nothing confident on Peter's Mac.</b><br>Spotter would ask: a document or a photo? From this year, or any time?</p></div>`;
    return `<div class="chips">${chips}</div><ul class="files">${results.map(({ f, v, tags, snip }, i) => {
      const where = [f.f, f.pl, f.src && 'from ' + (SRC[f.src] || f.src)].filter(Boolean).join(' · ');
      return `<li style="--i:${i}"><i class="fi" data-k="${ext(f)}"></i><div class="f-main"><b>${esc(f.n)}</b><small>${esc(where)}</small>${snip ? `<small class="snip">…${snip}</small>` : ''}<span class="tags">${tags.map(x => TAG[x]).join(' · ')}</span></div><span class="score" aria-label="Match ${v} of 100"><i style="--v:${v}"></i><b>${v}</b></span></li>`;
    }).join('')}</ul><p class="files-foot">${results.length} confident ${results.length === 1 ? 'match' : 'matches'} · ${FILES.length - results.length} other files ruled out</p>`;
  }

  /* ---------- Hero demo: types example searches until the visitor takes over ---------- */
  const input = document.getElementById('q'), answer = document.getElementById('answer');
  const btns = [...document.querySelectorAll('.try button')];
  let typing, timer, auto = true, cur = -1, inView = true;
  const update = () => {
    answer.classList.remove('in');
    answer.innerHTML = render(input.value);
    void answer.offsetWidth;
    answer.classList.add('in');
  };
  const next = () => { if (auto) timer = setTimeout(() => inView && !document.hidden ? play((cur + 1) % btns.length) : next(), 5200); };
  function play(i) {
    cur = i; clearInterval(typing); clearTimeout(timer);
    btns.forEach((b, j) => b.classList.toggle('on', j === i));
    const q = btns[i].textContent;
    if (still) { input.value = q; update(); next(); return; }
    let k = 0; input.value = '';
    typing = setInterval(() => {
      input.value = q.slice(0, ++k);
      if (k >= q.length) { clearInterval(typing); update(); next(); }
    }, 32);
  }
  if (input) {
    const stopAuto = () => { auto = false; clearInterval(typing); clearTimeout(timer); };
    btns.forEach((b, i) => b.addEventListener('click', () => { stopAuto(); play(i); }));
    ['focus', 'pointerdown', 'keydown'].forEach(ev => input.addEventListener(ev, stopAuto));
    let deb; input.addEventListener('input', e => { if (e.isTrusted) stopAuto(); btns.forEach(b => b.classList.remove('on')); clearTimeout(deb); deb = setTimeout(update, 110); });
    addEventListener('keydown', e => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || /input|textarea/i.test(document.activeElement?.tagName)) return;
      e.preventDefault(); input.focus(); input.select();
      input.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
    });
    new IntersectionObserver(e => { inView = e[0].isIntersecting; }).observe(input.closest('.spot'));
    update();
    setTimeout(() => play(0), still ? 0 : 700);
  }

  /* ---------- Feature tabs: advance on their own until clicked ---------- */
  const jobs = document.getElementById('jobs');
  if (jobs) {
    const tabs = [...jobs.querySelectorAll('[role="tab"]')];
    const DUR = 7000;
    let idx = 0, t0 = 0, left = DUR, raf, running = !still, visible = false, hover = false;
    const show = i => {
      idx = i;
      tabs.forEach((t, j) => {
        const on = j === i;
        t.classList.toggle('on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
        const p = document.getElementById(t.getAttribute('aria-controls'));
        p.hidden = !on; p.classList.toggle('on', on);
      });
      const prog = tabs[i].querySelector('.prog'); prog.style.animation = 'none'; void prog.offsetWidth; prog.style.animation = '';
      left = DUR; t0 = performance.now();
    };
    const loop = now => {
      raf = requestAnimationFrame(loop);
      if (!running || !visible || hover || document.hidden) { t0 = now; return; }
      left -= now - t0; t0 = now;
      if (left <= 0) show((idx + 1) % tabs.length);
    };
    const stop = () => { running = false; jobs.classList.remove('auto'); cancelAnimationFrame(raf); };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { stop(); show(i); });
      t.addEventListener('keydown', e => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!d) return; e.preventDefault(); stop();
        const n = (i + d + tabs.length) % tabs.length; show(n); tabs[n].focus();
      });
    });
    jobs.style.setProperty('--dur', DUR + 'ms');
    if (running) {
      jobs.classList.add('auto');
      const paused = () => jobs.classList.toggle('paused', !visible || hover);
      new IntersectionObserver(e => { visible = e[0].isIntersecting; paused(); }, { threshold: 0.35 }).observe(jobs);
      jobs.addEventListener('pointerenter', () => { hover = true; paused(); });
      jobs.addEventListener('pointerleave', () => { hover = false; paused(); });
      raf = requestAnimationFrame(loop);
    }
    show(0);
  }

  /* ---------- Scroll reveals ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in'); io.unobserve(en.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
