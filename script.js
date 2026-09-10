(function(){
  'use strict';

  const $ = s => document.querySelector(s);
  const VERM = '#E2472C';
  const pad3 = n => String(n).padStart(3, '0');
  const KEY = 'hanko.state.v2';

  const TYPES = ['link', 'wifi', 'email'];

  /* ================= dynamic field templates ================= */
  const FIELD_DEFS = {
    link: { label:'CONTENT', html:
      `<input id="content" class="f-in" data-k="link" type="text" spellcheck="false" autocomplete="off" maxlength="300" placeholder="https://your-link.com" aria-label="Link or text">` +
      `<span class="counter" id="counter">0 / 300</span>` },
    wifi: { label:'NETWORK', html:
      `<input class="f-in" data-k="ssid" type="text" spellcheck="false" autocomplete="off" maxlength="32" placeholder="NETWORK NAME (SSID)" aria-label="Network name">` +
      `<span class="counter" id="counter"></span>` +
      `<div class="f-line">` +
        `<input class="f-in grow" data-k="pass" type="text" spellcheck="false" autocomplete="off" maxlength="64" placeholder="PASSWORD — LEAVE EMPTY FOR OPEN NETWORK" aria-label="Password">` +
      `</div>` },
    email: { label:'EMAIL', html:
      `<input class="f-in" data-k="mto" type="email" spellcheck="false" autocomplete="off" maxlength="80" placeholder="NAME@DOMAIN.COM" aria-label="Email address">` +
      `<span class="counter" id="counter"></span>` }
  };

  const DEFAULT_F = { link:'', ssid:'', pass:'', mto:'' };

  const state = {
    type: 'link',
    f: Object.assign({}, DEFAULT_F),
    mark: '',
    glyph: 'fluid',
    eye: 'round',
    ink: '#17140F',
    bg: '#F4EFE6',
    pressCount: 1
  };

  /* ================= persistence ================= */
  function save(){
    try{
      localStorage.setItem(KEY, JSON.stringify({
        type: state.type, f: state.f, mark: state.mark, glyph: state.glyph,
        eye: state.eye, ink: state.ink, bg: state.bg, pressCount: state.pressCount
      }));
    }catch(e){}
  }
  function loadSaved(){
    try{ return JSON.parse(localStorage.getItem(KEY)); }catch(e){ return null; }
  }

  /* ================= payload builder ================= */
  function buildPayload(){
    const f = state.f;
    switch(state.type){
      case 'wifi': {
        if(!f.ssid.trim()) return '';
        const esc = s => s.replace(/([\\;,:"])/g, '\\$1');
        // WPA covers WPA/WPA2/WPA3 on all modern scanners; empty password = open network
        let p = 'WIFI:T:' + (f.pass ? 'WPA' : 'nopass') + ';S:' + esc(f.ssid.trim()) + ';';
        if(f.pass) p += 'P:' + esc(f.pass) + ';';
        return p + ';';
      }
      case 'email': {
        const to = f.mto.trim();
        return to ? 'mailto:' + to : '';
      }
      default:
        return f.link.trim();
    }
  }

  /* ================= QR builder ================= */
  function buildQR(text, animate){
    const qr = qrcode(0, 'H');
    qr.addData(text);
    qr.make();

    const n = qr.getModuleCount();
    const m = [];
    for(let r = 0; r < n; r++){
      m.push(new Array(n));
      for(let c = 0; c < n; c++) m[r][c] = qr.isDark(r, c);
    }

    const q = 4, N = n + 2 * q, ver = (n - 17) / 4;
    const cls = d => animate ? ` class="mod" style="--d:${d}ms"` : '';
    const inFinder = (r,c) => (r<7&&c<7) || (r<7&&c>=n-7) || (r>=n-7&&c<7);
    const dark = (r,c) => r>=0 && c>=0 && r<n && c<n && m[r][c];

    // centre seal geometry (matrix coordinates)
    const mark = state.mark.trim();
    const hasMark = mark.length > 0;
    const rm = hasMark ? Math.min(Math.max(2.3, n*0.135), n*0.155) : 0;
    const knocked = (r,c) => hasMark && ((r+.5-n/2)**2 + (c+.5-n/2)**2) <= (rm+0.4)**2;

    // rounded-rect path, corners = [tl, tr, br, bl]
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

    // finder eyes: light underlay + ring + pupil
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

  /* ================= render ================= */
  function updateCounter(payload){
    const c = $('#counter');
    if(!c) return;
    if(state.type === 'link'){
      c.textContent = `${state.f.link.length} / 300`;
      c.classList.remove('over');
    } else {
      const bytes = new TextEncoder().encode(payload).length;
      c.textContent = `PAYLOAD · ${bytes} BYTES`;
      c.classList.toggle('over', bytes > 900);
    }
  }

  function renderQR(animate = true){
    save();
    const poster = $('#poster');
    const payload = buildPayload();
    updateCounter(payload);
    if(!payload){ poster.classList.add('empty'); $('#specs').style.visibility = 'hidden'; return; }
    poster.classList.remove('empty'); $('#specs').style.visibility = '';

    let qr;
    try { qr = buildQR(payload, animate); }
    catch(e){ toast('TOO HEAVY FOR THE PRESS — SHORTEN IT'); return; }

    const svg = $('#qr');
    svg.setAttribute('viewBox', `0 0 ${qr.N} ${qr.N}`);
    svg.classList.remove('in');
    svg.innerHTML = qr.under + qr.mods + qr.eyes + qr.seal;
    if(animate) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('in')));

    $('#specs').innerHTML = `VER ${String(qr.ver).padStart(2,'0')} — ${qr.n}×${qr.n} MODULES<br>EC LEVEL H · 30% RECOVERY<br>STATUS&ensp;<span class="dot"></span>READY`;
  }

  /* ================= export ================= */
  // square card: white frame + hard offset shadow, transparent margin, no text
  const GEO = (() => {
    const M = 90, PAD = 110, CARD = 1600;
    const QRS = CARD - PAD * 2;
    return { M, CARD, QRS, W: CARD + M * 2, H: CARD + M * 2, fx: M + PAD, fy: M + PAD };
  })();

  function qrSVGString(){
    const qr = buildQR(buildPayload(), false);
    const bg = state.bg === 'none' ? '' : `<rect width="${qr.N}" height="${qr.N}" fill="${state.bg}"/>`;
    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.N} ${qr.N}" width="1024" height="1024" shape-rendering="geometricPrecision">${bg}${qr.under}${qr.mods}${qr.eyes}${qr.seal}</svg>`;
  }

  function cardSVGString(){
    const qr = buildQR(buildPayload(), false);
    const g = GEO, LINE = 'rgba(23,20,15,.38)';
    const bgRect = state.bg === 'none' ? '' : `<rect x="${g.fx}" y="${g.fy}" width="${g.QRS}" height="${g.QRS}" fill="${state.bg}"/>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.W} ${g.H}" width="${g.W}" height="${g.H}">
<rect x="${g.M + 30}" y="${g.M + 34}" width="${g.CARD}" height="${g.CARD}" fill="rgba(23,20,15,.16)"/>
<rect x="${g.M}" y="${g.M}" width="${g.CARD}" height="${g.CARD}" fill="#FFFFFF" stroke="${LINE}" stroke-width="2"/>
<rect x="${g.fx}" y="${g.fy}" width="${g.QRS}" height="${g.QRS}" fill="none" stroke="${LINE}" stroke-width="2"/>
 ${bgRect}
<g transform="translate(${g.fx} ${g.fy}) scale(${g.QRS / qr.N})">${qr.under}${qr.mods}${qr.eyes}${qr.seal}</g>
</svg>`;
  }

  function drawCard(ctx, qrCanvas){
    const g = GEO;
    ctx.clearRect(0, 0, g.W, g.H);
    ctx.fillStyle = 'rgba(23,20,15,.16)';
    ctx.fillRect(g.M + 30, g.M + 34, g.CARD, g.CARD);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(g.M, g.M, g.CARD, g.CARD);
    ctx.strokeStyle = 'rgba(23,20,15,.38)'; ctx.lineWidth = 2;
    ctx.strokeRect(g.M + 1, g.M + 1, g.CARD - 2, g.CARD - 2);
    if(state.bg !== 'none'){ ctx.fillStyle = state.bg; ctx.fillRect(g.fx, g.fy, g.QRS, g.QRS); }
    ctx.strokeStyle = 'rgba(23,20,15,.38)'; ctx.lineWidth = 2;
    ctx.strokeRect(g.fx, g.fy, g.QRS, g.QRS);
    ctx.drawImage(qrCanvas, g.fx, g.fy, g.QRS, g.QRS);
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
    $('#pressNo').textContent = 'PRESS N°' + pad3(state.pressCount);
    save();
  }

  $('#dlPng').addEventListener('click', () => {
    if(!buildPayload()){ toast('NOTHING TO PRESS — ADD CONTENT FIRST'); return; }
    pressAnim();
    const name = `hanko-card-${pad3(state.pressCount)}.png`;
    bumpPressNo();
    const url = URL.createObjectURL(new Blob([qrSVGString()], {type:'image/svg+xml;charset=utf-8'}));
    const img = new Image();
    img.onload = () => {
      const qc = document.createElement('canvas');
      qc.width = qc.height = 2944;
      qc.getContext('2d').drawImage(img, 0, 0, 2944, 2944);
      URL.revokeObjectURL(url);
      const cv = document.createElement('canvas');
      cv.width = GEO.W; cv.height = GEO.H;
      drawCard(cv.getContext('2d'), qc);
      cv.toBlob(b => { saveBlob(b, name); toast('CARD PRESSED · ' + name.toUpperCase()); }, 'image/png');
    };
    img.onerror = () => toast('PRESS JAMMED — TRY THE SVG EXPORT');
    img.src = url;
  });

  $('#dlSvg').addEventListener('click', () => {
    if(!buildPayload()){ toast('NOTHING TO PRESS — ADD CONTENT FIRST'); return; }
    pressAnim();
    const name = `hanko-card-${pad3(state.pressCount)}.svg`;
    bumpPressNo();
    saveBlob(new Blob([cardSVGString()], {type:'image/svg+xml;charset=utf-8'}), name);
    toast('CARD PRESSED · ' + name.toUpperCase());
  });

  /* ================= swatches ================= */
  const INKS = [['SUMI · 墨','#17140F'],['SHU · 朱','#E2472C'],['AI · 藍','#24466B'],['MATCHA · 抹茶','#56743F'],['KURI · 栗','#6B4A3A']];
  const PAPERS = [['WASHI PAPER','#F4EFE6'],['WHITE','#FFFFFF'],['CLEAR','none']];

  function markOn(el){
    if(!el) return;
    const box = el.closest('.swatches');
    if(!box) return;
    box.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === el));
  }

  function buildSwatches(){
    const box = $('#inks');
    INKS.forEach(([name, hex]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw'; b.title = name; b.dataset.hex = hex;
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
  }

  function buildPapers(){
    const box = $('#papers');
    PAPERS.forEach(([name, val]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw'; b.title = name; b.dataset.hex = val;
      if(val === 'none') b.classList.add('hatch'); else b.style.background = val;
      b.addEventListener('click', () => { state.bg = val; markOn(b); applyPaper(); renderQR(false); });
      box.appendChild(b);
    });
  }

  function applyPaper(){
    const clear = state.bg === 'none';
    $('#frame').style.setProperty('--cardbg', clear ? 'transparent' : state.bg);
    $('#frame').classList.toggle('is-clear', clear);
  }

  // highlight the saved ink & paper swatches (custom ink included)
  function applyColors(){
    let inkSw = $('#inks').querySelector(`[data-hex="${state.ink}"]`);
    if(!inkSw){
      inkSw = $('#inks .sw-custom');
      inkSw.style.background = state.ink;
    }
    markOn(inkSw);
    markOn($('#papers').querySelector(`[data-hex="${state.bg}"]`));
  }

  /* ================= segments ================= */
  function segInit(id, key){
    const el = $(id);
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if(!b) return;
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      state[key] = b.dataset.v;
      renderQR(false);
    });
  }

  /* ================= dynamic fields ================= */
  const fieldsEl = $('#fields');
  let debG;

  function queueGenerate(){
    clearTimeout(debG);
    debG = setTimeout(() => renderQR(true), 280);
  }
  function flushGenerate(){
    clearTimeout(debG);
    renderQR(true);
  }

  function buildFields(){
    const def = FIELD_DEFS[state.type];
    $('#contentLabel').textContent = '02 / ' + def.label;
    fieldsEl.innerHTML = def.html;
    fieldsEl.querySelectorAll('.f-in').forEach(inp => { inp.value = state.f[inp.dataset.k] || ''; });
  }

  function setType(t, animate = true){
    state.type = t;
    $('#segType').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === t));
    buildFields();
    renderQR(animate);
  }

  fieldsEl.addEventListener('input', e => {
    const el = e.target;
    const k = el.dataset.k;
    if(!k) return;
    state.f[k] = el.value;
    queueGenerate();
  });
  fieldsEl.addEventListener('keydown', e => {
    if(e.key === 'Enter') flushGenerate();
  });

  /* ================= seal mark ================= */
  $('#mark').addEventListener('input', e => {
    state.mark = e.target.value;
    queueGenerate();
  });

  /* ================= type selector ================= */
  $('#segType').addEventListener('click', e => {
    const b = e.target.closest('button');
    if(b) setType(b.dataset.v);
  });

  /* ================= re-press on click ================= */
  const card = $('#card');
  function repress(){
    if(!buildPayload()) return;
    pressAnim(); renderQR(true);
  }
  card.addEventListener('click', repress);
  card.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); repress(); }
  });

  /* ================= reset ================= */
  $('#reset').addEventListener('click', () => {
    try{ localStorage.removeItem(KEY); }catch(e){}
    state.type = 'link';
    state.f = Object.assign({}, DEFAULT_F);
    state.mark = ''; state.glyph = 'fluid'; state.eye = 'round';
    state.ink = INKS[0][1]; state.bg = PAPERS[0][1];
    $('#mark').value = '';
    [['#segGlyph','fluid'],['#segEye','round']].forEach(([id, val]) => {
      $(id).querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === val));
    });
    applyColors(); applyPaper();
    setType('link');
    toast('FRESH SHEET — ATELIER CLEARED');
  });

  /* ================= card tilt ================= */
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

  /* ================= toast ================= */
  let toastTimer;
  function toast(msg){
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ================= chrome ================= */
  function tick(){
    $('#clock').textContent = new Date().toLocaleTimeString('en-GB', {timeZone:'Asia/Tokyo', hour12:false});
  }
  $('#today').textContent = new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}).toUpperCase();

  const items = ['QUICK RESPONSE','DENSO WAVE · 1994','ERROR CORRECTION · LEVEL H','30% DAMAGE RECOVERY','DRAWN AS PURE VECTOR','PRESS · SCAN · SHARE','HANKO · @SALARIKDEV'];
  const half = items.map(t => `<span>${t}<i></i></span>`).join('');
  $('#track').innerHTML = half + half;

  /* ================= init ================= */
  if(typeof qrcode === 'undefined'){
    $('#emptyState').textContent = 'QR ENGINE OFFLINE';
    toast('QR ENGINE FAILED TO LOAD — CHECK YOUR CONNECTION');
    return;
  }
  try { qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']; } catch(e){}

  // restore saved session
  const saved = loadSaved();
  if(saved){
    if(TYPES.includes(saved.type)) state.type = saved.type;
    if(saved.f && typeof saved.f === 'object') Object.assign(state.f, DEFAULT_F, saved.f);
    if(['fluid','dot','square'].includes(saved.glyph)) state.glyph = saved.glyph;
    if(['sharp','round','circle'].includes(saved.eye)) state.eye = saved.eye;
    if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(saved.ink || '')) state.ink = saved.ink;
    if(saved.bg === 'none' || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(saved.bg || '')) state.bg = saved.bg;
    if(typeof saved.mark === 'string') state.mark = saved.mark;
    if(Number.isInteger(saved.pressCount) && saved.pressCount > 0) state.pressCount = saved.pressCount;
  }

  buildSwatches();
  buildPapers();
  applyColors();
  applyPaper();
  segInit('#segGlyph', 'glyph');
  segInit('#segEye', 'eye');
  $('#mark').value = state.mark;
  $('#pressNo').textContent = 'PRESS N°' + pad3(state.pressCount);
  [['#segGlyph', state.glyph], ['#segEye', state.eye]].forEach(([id, val]) => {
    $(id).querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === val));
  });

  setType(state.type);
  tick(); setInterval(tick, 1000);

  if(buildPayload()) toast('WELCOME BACK — YOUR STAMP WAS RESTORED');
})();