(function(){
  'use strict';
  const $ = s => document.querySelector(s);
  const VERM = '#E2472C';

  const state = {
    text: '',
    mark: '',
    glyph: 'fluid',
    eye: 'round',
    ink: '#17140F',
    bg: '#F4EFE6',
    pressCount: 1
  };

  /* ---------- QR engine ---------- */
  function buildQR(text, animate){
    const qr = qrcode(0, 'H');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const m = [];
    for(let r = 0; r < n; r++){ m.push(new Array(n)); for(let c = 0; c < n; c++) m[r][c] = qr.isDark(r, c); }

    const q = 4, N = n + 2 * q, ver = (n - 17) / 4;
    const cls = d => animate ? ` class="mod" style="--d:${d}ms"` : '';
    const inFinder = (r,c) => (r<7&&c<7) || (r<7&&c>=n-7) || (r>=n-7&&c<7);
    const dark = (r,c) => r>=0 && c>=0 && r<n && c<n && m[r][c];

    // centre seal geometry (matrix coordinates)
    const mark = state.mark.trim();
    const hasMark = mark.length > 0;
    const rm = hasMark ? Math.min(Math.max(2.3, n*0.135), n*0.155) : 0;
    const knocked = (r,c) => hasMark && ((r+.5-n/2)**2 + (c+.5-n/2)**2) <= (rm+0.4)**2;

    // rounded-rect path helper, corners = [tl, tr, br, bl]
    function rr(x,y,w,h,r){
      const lim = Math.min(w,h)/2;
      const [a,b,c,d] = r.map(v => Math.max(0, Math.min(v, lim)));
      const F = v => Math.round(v*1000)/1000;
      let p = `M${F(x+a)} ${F(y)}H${F(x+w-b)}`;
      if(b) p += `A${b} ${b} 0 0 1 ${F(x+w)} ${F(y+b)}`;
      p += `V${F(y+h-c)}`;
      if(c) p += `A${c} ${c} 0 0 1 ${F(x+w-c)} ${F(y+h)}`;
      p += `H${F(x+d)}`;
      if(d) p += `A${d} ${d} 0 0 1 ${F(x)} ${F(y+h-d)}`;
      p += `V${F(y+a)}`;
      if(a) p += `A${a} ${a} 0 0 1 ${F(x+a)} ${F(y)}`;
      return p + 'Z';
    }

    let under = '', mods = '', eyes = '', seal = '';
    const bleed = 0.045;
    const maxD = Math.hypot(n/2, n/2);

    for(let r = 0; r < n; r++){
      for(let c = 0; c < n; c++){
        if(!m[r][c] || inFinder(r,c) || knocked(r,c)) continue;
        const x = c+q, y = r+q;
        const d = Math.round(Math.hypot(r+.5-n/2, c+.5-n/2) / maxD * 380 + Math.random()*55);
        if(state.glyph === 'dot'){
          mods += `<circle${cls(d)} cx="${x+.5}" cy="${y+.5}" r=".45" fill="${state.ink}"/>`;
        } else {
          const U = dark(r-1,c), D = dark(r+1,c), L = dark(r,c-1), R = dark(r,c+1);
          const x0 = x-(L?bleed:0), y0 = y-(U?bleed:0), x1 = x+1+(R?bleed:0), y1 = y+1+(D?bleed:0);
          const rad = state.glyph === 'fluid'
            ? [(!U&&!L)?0.5:0, (!U&&!R)?0.5:0, (!D&&!R)?0.5:0, (!D&&!L)?0.5:0]
            : [0,0,0,0];
          mods += `<path${cls(d)} d="${rr(x0,y0,x1-x0,y1-y0,rad)}" fill="${state.ink}"/>`;
        }
      }
    }

    // finder "eyes": light underlay + custom ring + pupil
    [[0,0],[n-7,0],[0,n-7]].forEach(([oc, orw]) => {
      const x = q+oc, y = q+orw, cx = x+3.5, cy = y+3.5;
      if(state.bg !== 'none'){
        under += state.eye === 'circle'
          ? `<circle cx="${cx}" cy="${cy}" r="4.4" fill="${state.bg}"/>`
          : `<rect x="${cx-4.4}" y="${cy-4.4}" width="8.8" height="8.8" rx="${state.eye==='sharp'?0.4:2.4}" fill="${state.bg}"/>`;
      }
      const ring = `fill="none" stroke="${state.ink}" stroke-width="1"${cls(430)}`;
      const pupil = `fill="${state.ink}"${cls(430)}`;
      if(state.eye === 'sharp')
        eyes += `<rect ${ring} x="${x+.5}" y="${y+.5}" width="6" height="6" rx=".3"/><rect ${pupil} x="${x+2}" y="${y+2}" width="3" height="3" rx=".15"/>`;
      else if(state.eye === 'round')
        eyes += `<rect ${ring} x="${x+.5}" y="${y+.5}" width="6" height="6" rx="2"/><rect ${pupil} x="${x+2}" y="${y+2}" width="3" height="3" rx="1"/>`;
      else
        eyes += `<circle ${ring} cx="${cx}" cy="${cy}" r="3"/><circle ${pupil} cx="${cx}" cy="${cy}" r="1.5"/>`;
    });

    // centre seal
    if(hasMark){
      const lab = mark.toUpperCase().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const fs = rm * (lab.length >= 3 ? 0.6 : lab.length === 2 ? 0.82 : 1.12);
      const gap = state.bg === 'none' ? '#FFFFFF' : state.bg;
      seal += `<circle${cls(150)} cx="${q+n/2}" cy="${q+n/2}" r="${(rm+0.3).toFixed(2)}" fill="${gap}"/>`;
      seal += `<circle${cls(190)} cx="${q+n/2}" cy="${q+n/2}" r="${rm.toFixed(2)}" fill="${VERM}"/>`;
      seal += `<text${cls(240)} x="${q+n/2}" y="${q+n/2}" text-anchor="middle" dominant-baseline="central" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="${fs.toFixed(2)}" fill="#F6F1E8">${lab}</text>`;
    }

    return { N, n, ver, under, mods, eyes, seal };
  }

  function renderQR(animate = true){
    const poster = $('#poster');
    const text = state.text.trim();
    if(!text){ poster.classList.add('empty'); $('#specs').style.visibility = 'hidden'; return; }
    poster.classList.remove('empty'); $('#specs').style.visibility = '';
    let qr;
    try { qr = buildQR(text, animate); }
    catch(e){ toast('TOO HEAVY FOR THE PRESS — SHORTEN THE TEXT'); return; }
    const svg = $('#qr');
    svg.setAttribute('viewBox', `0 0 ${qr.N} ${qr.N}`);
    svg.classList.remove('in');
    svg.innerHTML = qr.under + qr.mods + qr.eyes + qr.seal;
    if(animate){
      requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('in')));
    }
    $('#specs').innerHTML = `VER ${String(qr.ver).padStart(2,'0')} — ${qr.n}×${qr.n} MODULES<br>EC LEVEL H · 30% RECOVERY<br>STATUS&ensp;<span class="dot"></span>READY`;
  }

  /* ---------- export ---------- */
  function exportSVGString(){
    const qr = buildQR(state.text.trim(), false);
    const bg = state.bg === 'none' ? '' : `<rect width="${qr.N}" height="${qr.N}" fill="${state.bg}"/>`;
    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.N} ${qr.N}" width="1024" height="1024" shape-rendering="geometricPrecision">${bg}${qr.under}${qr.mods}${qr.eyes}${qr.seal}</svg>`;
  }
  function saveBlob(blob, name){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function pressAnim(){
    const c = $('#card');
    c.classList.add('pressed');
    setTimeout(() => c.classList.remove('pressed'), 280);
  }
  function bumpPressNo(){
    state.pressCount++;
    $('#pressNo').textContent = 'PRESS N°' + String(state.pressCount).padStart(3,'0');
  }

  $('#dlPng').addEventListener('click', () => {
    if(!state.text.trim()){ toast('NOTHING TO PRESS — ADD CONTENT FIRST'); return; }
    pressAnim();
    const name = `hanko-stamp-${String(state.pressCount).padStart(3,'0')}.png`;
    bumpPressNo();
    const url = URL.createObjectURL(new Blob([exportSVGString()], {type:'image/svg+xml;charset=utf-8'}));
    const img = new Image();
    img.onload = () => {
      const S = 1600, cv = document.createElement('canvas');
      cv.width = S; cv.height = S;
      cv.getContext('2d').drawImage(img, 0, 0, S, S);
      URL.revokeObjectURL(url);
      cv.toBlob(b => {
        saveBlob(b, name);
        toast((state.bg === 'none' ? 'PRESSED ON CLEAR — SCAN NEEDS A LIGHT SURFACE · ' : 'STAMP PRESSED · ') + name.toUpperCase());
      }, 'image/png');
    };
    img.onerror = () => toast('PRESS JAMMED — TRY THE SVG EXPORT');
    img.src = url;
  });

  $('#dlSvg').addEventListener('click', () => {
    if(!state.text.trim()){ toast('NOTHING TO PRESS — ADD CONTENT FIRST'); return; }
    pressAnim();
    const name = `hanko-stamp-${String(state.pressCount).padStart(3,'0')}.svg`;
    bumpPressNo();
    saveBlob(new Blob([exportSVGString()], {type:'image/svg+xml;charset=utf-8'}), name);
    toast('STAMP PRESSED · ' + name.toUpperCase());
  });

  /* ---------- controls ---------- */
  const INKS = [['SUMI · 墨','#17140F'],['SHU · 朱','#E2472C'],['AI · 藍','#24466B'],['MATCHA · 抹茶','#56743F'],['KURI · 栗','#6B4A3A']];
  const PAPERS = [['WASHI PAPER','#F4EFE6'],['WHITE','#FFFFFF'],['CLEAR','none']];

  function markOn(el){ if(!el) return; el.parentElement.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === el)); }

  function buildSwatches(){
    const box = $('#inks');
    INKS.forEach(([name, hex]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw'; b.title = name;
      b.style.background = hex;
      b.addEventListener('click', () => { state.ink = hex; markOn(b); renderQR(false); });
      box.appendChild(b);
    });
    const label = document.createElement('label');
    label.className = 'sw sw-custom'; label.title = 'Custom ink';
    label.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><circle cx="12" cy="12" r="7.5"/><path d="M12 8.5v7M8.5 12h7"/></svg><input type="color" value="#1B7A5A" aria-label="Custom ink colour">`;
    const inp = label.querySelector('input');
    inp.addEventListener('input', () => {
      state.ink = inp.value;
      label.style.background = inp.value;
      markOn(label); renderQR(false);
    });
    box.appendChild(label);
    markOn(box.children[0]);
  }

  function buildPapers(){
    const box = $('#papers');
    PAPERS.forEach(([name, val]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw'; b.title = name;
      if(val === 'none') b.classList.add('hatch'); else b.style.background = val;
      b.addEventListener('click', () => { state.bg = val; markOn(b); applyPaper(); renderQR(false); });
      box.appendChild(b);
    });
    markOn(box.children[0]);
  }
  function applyPaper(){
    $('#frame').style.setProperty('--cardbg', state.bg === 'none' ? 'transparent' : state.bg);
  }

  function segInit(id, key){
    const el = $(id);
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if(!b) return;
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      state[key] = b.dataset.v;
      renderQR(false);
    });
  }

  /* ---------- inputs ---------- */
  const contentEl = $('#content');
  let debT, debM;
  contentEl.addEventListener('input', () => {
    $('#counter').textContent = `${contentEl.value.length} / 300`;
    clearTimeout(debT);
    debT = setTimeout(() => { state.text = contentEl.value; renderQR(true); }, 280);
  });
  $('#mark').addEventListener('input', e => {
    state.mark = e.target.value;
    clearTimeout(debM);
    debM = setTimeout(() => renderQR(true), 220);
  });

  /* ---------- re-press on click ---------- */
  const card = $('#card');
  function repress(){
    if(!state.text.trim()) return;
    pressAnim(); renderQR(true);
  }
  card.addEventListener('click', repress);
  card.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); repress(); }
  });

  /* ---------- tilt ---------- */
  (function tilt(){
    if(!matchMedia('(pointer:fine)').matches) return;
    const poster = $('#poster'), tiltEl = $('#tilt');
    let tx = 0, ty = 0, cx = 0, cy = 0;
    poster.addEventListener('pointermove', e => {
      const r = poster.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - .5) * 9;
      ty = -((e.clientY - r.top) / r.height - .5) * 7;
    });
    poster.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    (function loop(){
      cx += (tx - cx) * .08; cy += (ty - cy) * .08;
      tiltEl.style.transform = `rotateY(${cx.toFixed(2)}deg) rotateX(${cy.toFixed(2)}deg)`;
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg){
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ---------- chrome: clock, date, marquee ---------- */
  function tick(){
    $('#clock').textContent = new Date().toLocaleTimeString('en-GB', {timeZone:'Asia/Tokyo', hour12:false});
  }
  $('#today').textContent = new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}).toUpperCase();

  const items = ['QUICK RESPONSE','DENSO WAVE · 1994','ERROR CORRECTION · LEVEL H','30% DAMAGE RECOVERY','DRAWN AS PURE VECTOR','PRESS · SCAN · SHARE','HANKO · @SALARIKDEV'];
  const half = items.map(t => `<span>${t}<i></i></span>`).join('');
  $('#track').innerHTML = half + half;

  /* ---------- init ---------- */
  if(typeof qrcode === 'undefined'){
    $('#emptyState').textContent = 'QR ENGINE OFFLINE';
    toast('QR ENGINE FAILED TO LOAD — CHECK YOUR CONNECTION');
    return;
  }
  try { qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']; } catch(e){}

  buildSwatches();
  buildPapers();
  applyPaper();
  segInit('#segGlyph', 'glyph');
  segInit('#segEye', 'eye');
  contentEl.value = state.text;
  $('#counter').textContent = `${state.text.length} / 300`;
  tick(); setInterval(tick, 1000);
  renderQR(true);
})();