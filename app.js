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
 vec3 col=vec3(.012,.018,.045);
 float a=smoothstep(.38,.68,f);
 col=mix(col,vec3(.0,.36,.95),a*.8);
 col=mix(col,vec3(.55,.28,.95),smoothstep(.42,.7,q.x)*smoothstep(.4,.7,w.y)*.75);
 col=mix(col,vec3(.05,.7,.95),smoothstep(.5,.72,w.x)*a*.5);
 col+=vec3(.5,.6,1.)*pow(a,6.)*.35;
 float streak=pow(max(0.,sin((uv.x*1.3-uv.y*.8)*6.+T*5.+f*6.)),12.);
 col+=vec3(.3,.5,1.)*streak*a*.25;
 col*=mix(.35,1.05,smoothstep(.05,.95,uv.y));
 col*=1.-.45*exp(-dot((uv-vec2(.5,.62))*vec2(1.5,2.6),(uv-vec2(.5,.62))*vec2(1.5,2.6))*1.6);
 vec3 lc=vec3(.955,.965,.99);
 lc=mix(lc,vec3(.62,.76,1.),a*.6);
 lc=mix(lc,vec3(.8,.7,1.),smoothstep(.42,.7,q.x)*smoothstep(.4,.7,w.y)*.55);
 lc=mix(lc,vec3(.62,.9,1.),smoothstep(.5,.72,w.x)*a*.45);
 lc+=vec3(.3,.45,1.)*streak*a*.08;
 lc=mix(lc,vec3(.975,.98,1.),.55*exp(-dot((uv-vec2(.5,.62))*vec2(1.5,2.6),(uv-vec2(.5,.62))*vec2(1.5,2.6))*1.6));
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

  /* ---------- Hero demo ---------- */
  const ring = v => `<span class="score" style="--v:${v}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" pathLength="100"/><circle class="fill" cx="18" cy="18" r="15.5" pathLength="100"/></svg><b>${v}</b></span>`;
  const TAG = { name: ['t-name', 'Name'], text: ['t-text', 'Text'], ocr: ['t-ocr', 'Image text'], mean: ['t-mean', 'Meaning'], place: ['t-meta', 'Place'], src: ['t-src', 'Source'] };
  const S = [
    { q: "peter's salary slips", chips: [['Contains', 'peter'], ['Contains', 'salary slips'], ['m', 'payslip · pay slip · salary statement']], files: [
      ['pdf', 'PDF', 'Peter_Rossi-Payslip_Aug-2025.pdf', 'Downloads · from mail.google.com', '<mark>PAYSLIP</mark> AUG 2025 · Monthly <mark>Salary</mark>', ['name', 'text'], 98],
      ['pdf', 'PDF', 'Payslip_Feb2024.pdf', 'Documents/Work', '', ['name', 'mean'], 91],
      ['pdf', 'PDF', 'CU_2025_Certificazione_Unica.pdf', 'Documents/Tax', 'Employee <mark>salary</mark> and tax withheld, 2025', ['text'], 54]] },
    { q: "What's the notice period in my Acme contract?", html: `
      <div class="ai-answer"><span class="ai-badge"><svg><use href="#i-spark"/></svg>Answer from your files</span>
      <p><b>60 days' written notice</b> from either side. Leaving within the first year costs one month's fee.</p>
      <span class="cite">Acme_MSA_2025.pdf · p. 7</span><span class="cite">Acme_MSA_2025.pdf · p. 12</span>
      <p class="ai-more">Last year's version said 30 days. <a>Compare versions →</a></p></div>` },
    { q: 'screenshot with the wifi password', chips: [['Kind', 'Screenshot'], ['Contains', 'wifi password']], files: [
      ['img', 'PNG', 'Screenshot 2026-03-14 at 21.04.png', 'Desktop', 'Network HomeFiber_5G · <mark>Password</mark> sunrise-4471-blue', ['ocr'], 96],
      ['img', 'PNG', 'Screenshot 2025-11-02 at 10.11.png', 'Desktop/Old', 'Guest <mark>WiFi</mark>: Cafe_Lumen · pass…', ['ocr'], 72]] },
    { q: 'photos and videos from tuscany', chips: [['Kind', 'Photos, Videos'], ['Place', 'Tuscany, Italy']], files: [
      ['img', 'HEIC', 'IMG_4521.HEIC', 'Photos library · Florence, Tuscany', '', ['place'], 100],
      ['vid', 'MOV', 'IMG_4533.MOV', 'Photos library · Siena, Tuscany · 0:42', '', ['place'], 100],
      ['img', 'JPG', 'DSC_0192.JPG', 'Pictures/Tuscany Trip · San Gimignano, Tuscany', '', ['place'], 100]] },
    { q: 'what can I safely delete?', html: `
      <div class="ai-answer"><span class="ai-badge"><svg><use href="#i-broom"/></svg>Spotter Clean</span>
      <p>About <b>18.4 GB</b> you probably don't need. Everything goes to the Trash, so you can put it back.</p>
      <ul class="ai-list"><li><span>Installers you already installed</span><b>3.6 GB</b></li><li><span>Downloads untouched for a year</span><b>6.1 GB</b></li><li><span>Duplicates, turned into clones</span><b>4.0 GB</b></li><li><span>Apps unused for 6 months</span><b>4.7 GB</b></li></ul></div>` },
    { q: 'pdfs from gmail i never opened', chips: [['Kind', 'PDF'], ['From', 'mail.google.com'], ['Opened', 'Never']], files: [
      ['pdf', 'PDF', 'Statement_Oct2026.pdf', 'Downloads · 1.2 MB', '', ['src'], 100],
      ['pdf', 'PDF', 'Policy_Schedule_Renewal.pdf', 'Downloads · 640 KB', '', ['src'], 100]] }
  ];
  const typed = document.getElementById('typed'), answer = document.getElementById('answer');
  const btns = [...document.querySelectorAll('.try button')];
  let cur = -1, typing, timer, auto = true;
  const render = s => s.html || `<div class="chips">${s.chips.map(([k, v]) => k === 'm' ? `<span class="m">Also matching <b>${v}</b></span>` : `<span>${k} <b>${v}</b></span>`).join('')}</div>
    <ul class="files">${s.files.map(([c, l, n, w, snip, t, sc]) => `<li><i class="ico ${c}">${l}</i><div class="f-main"><b>${n}</b><small>${w}</small>${snip ? `<small class="snip">…${snip}…</small>` : ''}<span class="tags">${t.map(x => `<em class="${TAG[x][0]}">${TAG[x][1]}</em>`).join('')}</span></div>${ring(sc)}</li>`).join('')}</ul>`;
  function reveal(i) {
    answer.innerHTML = render(S[i]);
    requestAnimationFrame(() => answer.classList.add('in'));
    if (auto && !still) timer = setTimeout(() => show((cur + 1) % S.length), 6500);
  }
  function show(i) {
    if (!typed) return;
    cur = i; clearInterval(typing); clearTimeout(timer);
    btns.forEach((b, j) => b.classList.toggle('on', j === i));
    answer.classList.remove('in');
    const q = S[i].q;
    if (still) { typed.textContent = q; reveal(i); return; }
    let k = 0; typed.textContent = '';
    typing = setInterval(() => {
      typed.textContent = q.slice(0, ++k);
      if (k >= q.length) { clearInterval(typing); timer = setTimeout(() => reveal(i), 250); }
    }, 30);
  }
  btns.forEach((b, i) => b.addEventListener('click', () => { auto = false; show(i); }));
  show(0);

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
