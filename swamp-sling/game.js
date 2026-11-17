(() => {
'use strict';
const { Engine, Bodies, Body, Events, Composite } = Matter;

// ---------- constants ----------
const W = 1280, H = 720, GY = 620, STEP = 1000 / 60;
const ANCHOR = { x: 215, y: 452 }, MAXPULL = 125, POWER = 0.16;
const GRAV = 0.001 * STEP * STEP;          // px per step^2 (Matter default gravity)
const MR = 22;                             // mascot radius
const ORANGE = '#FA4616', BLUE = '#0021A5';
const SAVE_KEY = 'swampSling.v1';

// Level order: easiest road trip first, biggest rival last.
const TEAMS = [
  { school: 'Vanderbilt',     nick: 'Commodores',  stadium: 'FirstBank Stadium',        c1: '#1a1a1a', c2: '#CFAE70', animal: 'commodore' },
  { school: 'Kentucky',       nick: 'Wildcats',    stadium: 'Kroger Field',             c1: '#0033A0', c2: '#FFFFFF', animal: 'cat' },
  { school: 'Miss. State',    nick: 'Bulldogs',    stadium: 'Davis Wade Stadium',       c1: '#660000', c2: '#FFFFFF', animal: 'bulldog', fur: '#c9a77c' },
  { school: 'South Carolina', nick: 'Gamecocks',   stadium: 'Williams-Brice Stadium',   c1: '#73000A', c2: '#111111', animal: 'rooster', tx: '#FFFFFF' },
  { school: 'Missouri',       nick: 'Tigers',      stadium: 'Faurot Field',             c1: '#F1B82D', c2: '#111111', animal: 'tiger' },
  { school: 'Arkansas',       nick: 'Razorbacks',  stadium: 'Razorback Stadium',        c1: '#9D2235', c2: '#FFFFFF', animal: 'hog' },
  { school: 'Ole Miss',       nick: 'Rebels',      stadium: 'Vaught-Hemingway Stadium', c1: '#CE1126', c2: '#14213D', animal: 'shark', tx: '#FFFFFF' },
  { school: 'Auburn',         nick: 'Tigers',      stadium: 'Jordan-Hare Stadium',      c1: '#0C2340', c2: '#E87722', animal: 'tiger' },
  { school: 'Oklahoma',       nick: 'Sooners',     stadium: 'Memorial Stadium',         c1: '#841617', c2: '#FDF9D8', animal: 'horse' },
  { school: 'Texas A&M',      nick: 'Aggies',      stadium: 'Kyle Field',               c1: '#500000', c2: '#FFFFFF', animal: 'collie' },
  { school: 'Tennessee',      nick: 'Volunteers',  stadium: 'Neyland Stadium',          c1: '#FF8200', c2: '#FFFFFF', animal: 'hound' },
  { school: 'LSU',            nick: 'Tigers',      stadium: 'Tiger Stadium',            c1: '#461D7C', c2: '#FDD023', animal: 'tiger' },
  { school: 'Texas',          nick: 'Longhorns',   stadium: 'DKR Memorial Stadium',     c1: '#BF5700', c2: '#FFFFFF', animal: 'longhorn' },
  { school: 'Alabama',        nick: 'Crimson Tide', stadium: 'Bryant-Denny Stadium',    c1: '#9E1B32', c2: '#FFFFFF', animal: 'elephant' },
  { school: 'Georgia',        nick: 'Bulldogs',    stadium: 'Sanford Stadium',          c1: '#BA0C2F', c2: '#111111', animal: 'bulldog', tx: '#FFFFFF' },
];

const GT = {
  chomp: { name: 'Chomp', r: 20, tip: 'tap in flight for a mega-bite through the next block' },
  blitz: { name: 'Blitz', r: 17, tip: 'tap in flight for a turbo dash' },
  thump: { name: 'Thump', r: 26, tip: 'tap any time for a tail-slam shockwave' },
};

const MAT = {
  wood:     { hp: 28,  dens: 0.0008, fill: '#b9834c', edge: '#70481f' },
  concrete: { hp: 65,  dens: 0.0014, fill: '#cfcfc9', edge: '#85857f' },
  steel:    { hp: 130, dens: 0.0022, fill: '#7f93a8', edge: '#44546a' },
};

// ---------- level layouts ----------
let L = null;
function blk(x, base, w, h, mat) { L.blocks.push({ x, y: GY - base - h / 2, w, h, mat }); return base + h; }
function mas(x, base) { L.mascots.push({ x, y: GY - base - MR }); }
function hut(x, base, mat, occ, w = 120, h = 96) {
  blk(x - w / 2 + 12, base, 24, h, mat);
  blk(x + w / 2 - 12, base, 24, h, mat);
  if (occ) mas(x, base);
  return blk(x, base + h, w + 24, 20, mat);
}
function tower(x, mats, occ, base = 0) { mats.forEach((m, i) => { base = hut(x, base, m, occ[i]); }); return base; }
function wall(x, n, mat, base = 0, s = 44) { for (let i = 0; i < n; i++) base = blk(x, base, s, s, mat); return base; }

const LEVELS = [
  /* Vanderbilt */ { g: ['chomp', 'chomp', 'chomp'], b() { hut(900, 0, 'wood', 1); } },
  /* Kentucky   */ { g: ['chomp', 'chomp', 'chomp'], b() { tower(880, ['wood', 'wood'], [1, 1]); } },
  /* Miss State */ { g: ['chomp', 'blitz', 'chomp'], b() { hut(800, 0, 'wood', 1); wall(930, 2, 'wood'); hut(1060, 0, 'wood', 1); } },
  /* S Carolina */ { g: ['chomp', 'blitz', 'chomp'], b() { tower(820, ['wood', 'wood'], [0, 1]); hut(1020, 0, 'concrete', 1); } },
  /* Missouri   */ { g: ['chomp', 'chomp', 'blitz', 'chomp'], b() { hut(800, 0, 'wood', 1); hut(950, 0, 'wood', 1); hut(875, 116, 'wood', 1); } },
  /* Arkansas   */ { g: ['chomp', 'thump', 'chomp'], b() { tower(900, ['concrete', 'wood', 'wood'], [1, 0, 1]); } },
  /* Ole Miss   */ { g: ['chomp', 'blitz', 'thump', 'chomp'], b() { tower(790, ['concrete', 'wood'], [1, 1]); const t = tower(1010, ['wood', 'concrete'], [1, 0]); mas(1010, t); } },
  /* Auburn     */ { g: ['chomp', 'blitz', 'thump', 'chomp'], b() { tower(740, ['wood'], [1]); tower(900, ['concrete', 'wood'], [0, 1]); tower(1060, ['concrete', 'concrete', 'wood'], [0, 0, 1]); } },
  /* Oklahoma   */ { g: ['blitz', 'thump', 'chomp', 'chomp'], b() {
      hut(780, 0, 'concrete', 1); hut(930, 0, 'concrete', 0); hut(1080, 0, 'concrete', 1);
      hut(855, 116, 'wood', 0); hut(1005, 116, 'wood', 0); hut(930, 232, 'wood', 1); } },
  /* Texas A&M  */ { g: ['blitz', 'thump', 'thump', 'chomp'], b() { wall(760, 3, 'steel'); tower(900, ['concrete', 'concrete'], [1, 1]); hut(1060, 0, 'steel', 1); } },
  /* Tennessee  */ { g: ['chomp', 'blitz', 'thump', 'chomp'], b() {
      const t = tower(800, ['concrete', 'wood', 'wood'], [1, 0, 0]); tower(1040, ['concrete', 'wood', 'wood'], [1, 0, 0]);
      blk(920, t, 200, 20, 'wood'); mas(920, t + 20); } },
  /* LSU        */ { g: ['chomp', 'thump', 'blitz', 'thump'], b() {
      hut(780, 0, 'steel', 1); tower(930, ['concrete', 'concrete', 'wood'], [0, 1, 1]); hut(1090, 0, 'steel', 1); wall(1090, 2, 'wood', 116); } },
  /* Texas      */ { g: ['blitz', 'thump', 'chomp', 'thump', 'chomp'], b() {
      hut(760, 0, 'concrete', 1); hut(910, 0, 'steel', 1); hut(1060, 0, 'concrete', 1);
      hut(835, 116, 'concrete', 1); hut(985, 116, 'concrete', 1); hut(910, 232, 'wood', 1); } },
  /* Alabama    */ { g: ['chomp', 'thump', 'blitz', 'thump', 'chomp'], b() {
      wall(720, 4, 'steel'); tower(860, ['steel', 'concrete', 'wood'], [1, 1, 1]); tower(1010, ['concrete', 'concrete'], [1, 0]);
      const t = wall(1140, 3, 'concrete'); mas(1140, t); } },
  /* Georgia    */ { g: ['chomp', 'blitz', 'thump', 'chomp', 'thump', 'blitz', 'thump'], b() {
      tower(760, ['steel', 'concrete', 'concrete'], [1, 0, 1]);
      hut(920, 0, 'steel', 1); hut(1070, 0, 'steel', 1); hut(995, 116, 'concrete', 1); hut(995, 232, 'wood', 1); } },
];

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const stage = $('stage'), cv = $('c'), ctx = cv.getContext('2d');
const bgc = document.createElement('canvas'); bgc.width = W * 2; bgc.height = H * 2;
let K = 1;
function resize() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `scale(${s})`;
  stage.style.left = (innerWidth - W * s) / 2 + 'px';
  stage.style.top = (innerHeight - H * s) / 2 + 'px';
  K = Math.min(2.5, Math.max(1, s * (window.devicePixelRatio || 1)));
  cv.width = Math.round(W * K); cv.height = Math.round(H * K);
}
addEventListener('resize', resize);

// ---------- save ----------
let progress = { stars: [] };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && Array.isArray(s.stars)) progress = s; } catch (e) {}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) {} }
const unlocked = i => i === 0 || (progress.stars[i - 1] || 0) > 0;

// ---------- sound ----------
let ac = null, muted = false, lastThud = 0;
function tone(f, d, type = 'square', v = 0.07, slide = 0) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}
const sfx = {
  launch: () => tone(260, 0.25, 'sawtooth', 0.05, 500),
  thud: () => { const n = performance.now(); if (n - lastThud > 70) { lastThud = n; tone(100, 0.12, 'triangle', 0.12, -50); } },
  brk: () => tone(200, 0.16, 'square', 0.05, -140),
  ko: () => tone(760, 0.22, 'square', 0.06, -500),
  ability: () => tone(420, 0.22, 'sawtooth', 0.06, 600),
  boom: () => tone(90, 0.4, 'sawtooth', 0.14, -55),
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'square', 0.06), i * 130)),
  lose: () => [330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.1), i * 200)),
};

// ---------- game state ----------
let G = null, gameToken = 0;

function startLevel(idx) {
  gameToken++;
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  const team = TEAMS[idx], def = LEVELS[idx];
  L = { blocks: [], mascots: [] }; def.b();
  G = {
    idx, team, engine, token: gameToken, time: 0, settleUntil: 1300,
    blocks: [], mascots: [], queue: def.g.slice(), total: def.g.length, cur: null,
    score: 0, phase: 'play', winAt: 0, idleSince: 0, dead: new Set(), restore: null,
    parts: [], floats: [], rings: [], trail: [], oldTrail: [],
  };
  Composite.add(engine.world, Bodies.rectangle(W / 2, GY + 60, 6000, 120, { isStatic: true, friction: 1 }));
  for (const b of L.blocks) {
    const m = MAT[b.mat];
    const body = Bodies.rectangle(b.x, b.y, b.w, b.h, { density: m.dens, friction: 0.8, frictionStatic: 1, restitution: 0.02 });
    body.g = { kind: 'block', mat: b.mat, hp: m.hp, max: m.hp, w: b.w, h: b.h };
    G.blocks.push(body); Composite.add(engine.world, body);
  }
  for (const m of L.mascots) {
    const body = Bodies.circle(m.x, m.y, MR, { density: 0.001, friction: 0.8, restitution: 0.1 });
    body.g = { kind: 'mascot', hp: 14, max: 14 };
    G.mascots.push(body); Composite.add(engine.world, body);
  }
  Events.on(engine, 'collisionStart', onCollide);
  paintBg(team);
  nextGator();
  show(null);
}

function nextGator() {
  G.cur = { type: G.queue.shift(), state: 'ready', x: ANCHOR.x, y: ANCHOR.y, body: null, used: false, hit: false, slow: 0, born: 0 };
}

function onCollide(e) {
  for (const p of e.pairs) {
    const a = p.bodyA, b = p.bodyB, n = p.collision.normal;
    const rv = Math.abs((a.velocity.x - b.velocity.x) * n.x + (a.velocity.y - b.velocity.y) * n.y);
    const c = G.cur;
    if (c && c.body && (a === c.body || b === c.body) && !c.hit) { c.hit = true; c.body.frictionAir = 0.012; }
    const gatorHit = (a.g && a.g.kind === 'gator') || (b.g && b.g.kind === 'gator');
    if (rv < 2 || (G.time < G.settleUntil && !gatorHit)) continue;
    if (rv > 4) sfx.thud();
    impact(a, b, rv); impact(b, a, rv);
  }
}

function impact(t, o, rv) {
  const g = t.g; if (!g || g.kind === 'gator') return;
  const m = o.isStatic ? 6 : Math.min(o.mass, 8);
  let d = rv * m * 0.55;
  const og = o.g && o.g.kind === 'gator' ? o.g : null;
  let bit = false;
  if (og && og.chomp && g.kind === 'block') { d *= 4; og.chomp = false; bit = true; burst(t.position.x, t.position.y, '#ffffff', 8); }
  g.hp -= d;
  if (g.hp <= 0) {
    G.dead.add(t);
    if (og && !G.restore) { const k = bit ? 0.85 : 0.55; G.restore = { b: o, vx: o.velocity.x * k, vy: o.velocity.y * k }; }
  }
}

function damage(body, amt) { body.g.hp -= amt; if (body.g.hp <= 0) G.dead.add(body); }

function removeBody(body, scored) {
  Composite.remove(G.engine.world, body);
  const g = body.g, x = body.position.x, y = body.position.y;
  if (g.kind === 'block') {
    G.blocks.splice(G.blocks.indexOf(body), 1);
    if (scored) { G.score += 500; burst(x, y, MAT[g.mat].fill, 7); sfx.brk(); }
  } else {
    G.mascots.splice(G.mascots.indexOf(body), 1);
    G.score += 5000; burst(x, y, G.team.c1, 10); burst(x, y, '#ffd23f', 8);
    G.floats.push({ x, y: y - 20, txt: '+5000', life: 70 }); sfx.ko();
  }
}

function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = 1.5 + Math.random() * 4;
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 30 + Math.random() * 20, col, size: 4 + Math.random() * 5 });
  }
}

function launch(vx, vy) {
  const c = G.cur, t = GT[c.type];
  const body = Bodies.circle(c.x, c.y, t.r, { density: 0.004, friction: 0.6, restitution: 0.25, frictionAir: 0 });
  body.g = { kind: 'gator', chomp: false };
  Body.setVelocity(body, { x: vx, y: vy });
  Composite.add(G.engine.world, body);
  c.body = body; c.state = 'fly'; c.born = G.time; c.slow = 0;
  G.oldTrail = G.trail; G.trail = [];
  sfx.launch();
}

function ability() {
  const c = G.cur, b = c.body; c.used = true; sfx.ability();
  if (c.type === 'chomp') { b.g.chomp = true; c.chompUntil = G.time + 1600; }
  else if (c.type === 'blitz') {
    const sp = Math.hypot(b.velocity.x, b.velocity.y) || 1, ns = Math.max(sp * 1.9, 24);
    Body.setVelocity(b, { x: b.velocity.x / sp * ns, y: b.velocity.y / sp * ns });
    burst(b.position.x, b.position.y, ORANGE, 10);
  } else {
    const R = 185, px = b.position.x, py = b.position.y;
    sfx.boom(); G.rings.push({ x: px, y: py, r: 20, max: R, life: 22 });
    for (const o of G.blocks.concat(G.mascots)) {
      const dx = o.position.x - px, dy = o.position.y - py, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      const f = 1 - d / R, k = 15 * f / (d || 1);
      Body.setVelocity(o, { x: o.velocity.x + dx * k, y: o.velocity.y + dy * k - 4 * f });
      damage(o, 75 * f);
    }
  }
}

function settled() {
  for (const b of G.blocks) if (b.speed > 0.35) return false;
  for (const b of G.mascots) if (b.speed > 0.35) return false;
  return true;
}

function step() {
  G.time += STEP;
  G.restore = null;
  Engine.update(G.engine, STEP);
  if (G.dead.size) {
    for (const b of G.dead) if (G.blocks.includes(b) || G.mascots.includes(b)) removeBody(b, true);
    G.dead.clear();
  }
  if (G.restore) Body.setVelocity(G.restore.b, { x: G.restore.vx, y: G.restore.vy });

  for (const m of G.mascots.slice()) {
    Body.setAngularVelocity(m, m.angularVelocity * 0.96);
    if (m.position.x > W + 40 || m.position.x < -40 || m.position.y > H + 80) removeBody(m, true);
  }
  for (const b of G.blocks.slice()) if (b.position.x > W + 150 || b.position.x < -150) removeBody(b, false);

  const c = G.cur;
  if (c && c.state === 'fly') {
    const b = c.body;
    if (!c.hit) Body.setAngle(b, Math.atan2(b.velocity.y, b.velocity.x));
    else Body.setAngularVelocity(b, b.angularVelocity * 0.97);
    if (c.chompUntil && G.time > c.chompUntil) b.g.chomp = false;
    if (!c.hit && Math.round(G.time / STEP) % 3 === 0) G.trail.push({ x: b.position.x, y: b.position.y });
    c.slow = b.speed < 0.6 ? c.slow + STEP : 0;
    const out = b.position.x > W + 120 || b.position.x < -120 || b.position.y > H + 100;
    if (out || c.slow > 1200 || G.time - c.born > 9000) {
      if (!out) burst(b.position.x, b.position.y, '#dff5d8', 12);
      Composite.remove(G.engine.world, b);
      G.cur = null; G.idleSince = G.time;
    }
  }

  if (G.phase === 'play') {
    if (!G.mascots.length) {
      if (!G.winAt) G.winAt = G.time + 1300;
      else if (G.time >= G.winAt) win();
    } else if (!G.cur && (settled() || G.time - G.idleSince > 4000) && G.time - G.idleSince > 500) {
      if (G.queue.length) nextGator(); else lose();
    }
  }

  for (const p of G.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life--; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const f of G.floats) { f.y -= 0.8; f.life--; }
  G.floats = G.floats.filter(f => f.life > 0);
  for (const r of G.rings) { r.r += (r.max - r.r) * 0.25; r.life--; }
  G.rings = G.rings.filter(r => r.life > 0);
}

function win() {
  G.phase = 'won';
  const left = G.queue.length + (G.cur && G.cur.state !== 'fly' ? 1 : 0);
  G.score += left * 3000;
  const stars = left >= 2 ? 3 : left >= 1 ? 2 : 1;
  progress.stars[G.idx] = Math.max(progress.stars[G.idx] || 0, stars); save();
  sfx.win();
  const tk = G.token; setTimeout(() => { if (G && G.token === tk) showResult(true, stars, left); }, 700);
}
function lose() {
  G.phase = 'lost'; sfx.lose();
  const tk = G.token; setTimeout(() => { if (G && G.token === tk) showResult(false, 0, 0); }, 500);
}

// ---------- input ----------
function pt(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
function dragTo(p) {
  const c = G.cur; let dx = p.x - ANCHOR.x, dy = p.y - ANCHOR.y; const d = Math.hypot(dx, dy);
  if (d > MAXPULL) { dx *= MAXPULL / d; dy *= MAXPULL / d; }
  c.x = ANCHOR.x + dx; c.y = Math.min(ANCHOR.y + dy, GY - GT[c.type].r);
}
cv.addEventListener('pointerdown', e => {
  if (!G || G.phase !== 'play' || !G.cur) return;
  const p = pt(e), c = G.cur;
  if (c.state === 'ready') {
    if (Math.hypot(p.x - c.x, p.y - c.y) < 95) { c.state = 'drag'; try { cv.setPointerCapture(e.pointerId); } catch (er) {} dragTo(p); }
  } else if (c.state === 'fly' && !c.used) ability();
  e.preventDefault();
});
cv.addEventListener('pointermove', e => { if (G && G.cur && G.cur.state === 'drag') dragTo(pt(e)); });
function release() {
  if (!G || !G.cur || G.cur.state !== 'drag') return;
  const c = G.cur, dx = ANCHOR.x - c.x, dy = ANCHOR.y - c.y;
  if (Math.hypot(dx, dy) < 18) { c.state = 'ready'; c.x = ANCHOR.x; c.y = ANCHOR.y; return; }
  launch(dx * POWER, dy * POWER);
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);

// ---------- drawing: gators ----------
function drawGator(c, type, r, open) {
  const g1 = type === 'thump' ? '#2f7d3a' : '#43a84a', dark = '#143a1c';
  c.lineWidth = 2; c.strokeStyle = dark; c.lineJoin = 'round';
  const P = col => { c.fillStyle = col; c.fill(); c.stroke(); };
  // tail
  c.beginPath(); c.moveTo(-r * 0.6, -r * 0.55); c.quadraticCurveTo(-r * 1.7, -r * 0.3, -r * 1.95, r * 0.5);
  c.quadraticCurveTo(-r * 1.2, r * 0.55, -r * 0.6, r * 0.65); c.closePath(); P(g1);
  if (type === 'thump') for (let i = 0; i < 3; i++) {
    const a = -2.5 + i * 0.5, x = Math.cos(a) * r, y = Math.sin(a) * r;
    c.beginPath(); c.moveTo(x * 0.9 - 5, y * 0.9 + 3); c.lineTo(x * 1.4, y * 1.4); c.lineTo(x * 0.9 + 6, y * 0.9 - 3); c.closePath(); P(ORANGE);
  }
  // lower jaw
  c.save(); if (open) c.rotate(0.38);
  c.beginPath(); c.roundRect(r * 0.2, r * 0.05, r * 1.3, r * 0.32, r * 0.15); P('#f9b04e');
  c.restore();
  // body + belly
  c.beginPath(); c.arc(0, 0, r, 0, 7); P(g1);
  c.save(); c.beginPath(); c.arc(0, 0, r - 1, 0, 7); c.clip();
  c.fillStyle = '#f9b04e'; c.beginPath(); c.ellipse(r * 0.1, r * 0.85, r * 0.85, r * 0.45, 0, 0, 7); c.fill();
  if (type === 'blitz') { c.fillStyle = BLUE; c.fillRect(-r * 0.55, -r, r * 0.42, r * 2); c.fillStyle = ORANGE; c.fillRect(-r * 0.4, -r, r * 0.12, r * 2); }
  c.restore();
  // upper jaw
  c.save(); if (open) c.rotate(-0.32);
  c.beginPath(); c.roundRect(r * 0.2, -r * 0.42, r * 1.45, r * 0.47, r * 0.2); P(g1);
  c.fillStyle = '#fff'; c.lineWidth = 1;
  for (let i = 0; i < 4; i++) { const x = r * (0.72 + i * 0.22); c.beginPath(); c.moveTo(x, r * 0.05); c.lineTo(x + r * 0.09, r * 0.25); c.lineTo(x + r * 0.18, r * 0.05); c.closePath(); c.fill(); c.stroke(); }
  c.fillStyle = dark; c.beginPath(); c.arc(r * 1.48, -r * 0.27, r * 0.06, 0, 7); c.fill();
  c.restore();
  // eye
  c.lineWidth = 2;
  c.beginPath(); c.arc(r * 0.22, -r * 0.72, r * 0.32, 0, 7); P(g1);
  c.beginPath(); c.arc(r * 0.28, -r * 0.75, r * 0.2, 0, 7); P('#fff');
  c.fillStyle = dark; c.beginPath(); c.arc(r * 0.36, -r * 0.74, r * 0.1, 0, 7); c.fill();
  c.beginPath(); c.moveTo(-r * 0.05, -r * 1.02); c.lineTo(r * 0.55, -r * 0.86); c.lineWidth = 3; c.stroke();
}

// ---------- drawing: mascots (all original cartoon art) ----------
const FUR = { elephant: '#a3abb5', hog: '#a8574c', tiger: '#f39a2b', bulldog: '#efe9dd', cat: '#8794a8', horse: '#f4efe2',
  shark: '#7f95aa', rooster: '#3a2a2a', hound: '#8fa3b8', longhorn: '#c9702a', collie: '#c98d55', commodore: '#f0c8a0' };

function drawMascot(c, t, r) {
  const a = t.animal, fur = t.fur || FUR[a], dark = '#2a2320';
  c.lineWidth = 2; c.strokeStyle = dark; c.lineJoin = 'round'; c.lineCap = 'round';
  const P = col => { c.fillStyle = col; c.fill(); c.stroke(); };
  const circ = (x, y, q) => { c.beginPath(); c.arc(x, y, q, 0, 7); };
  const ell = (x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); };
  const tri = (...p) => { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.lineTo(p[4], p[5]); c.closePath(); };

  // behind the head
  if (a === 'elephant') for (const s of [-1, 1]) { circ(s * r * 0.95, -r * 0.1, r * 0.62); P(fur); }
  if (['tiger', 'cat', 'collie', 'hog', 'horse'].includes(a)) for (const s of [-1, 1]) { tri(s * r * 0.25, -r * 0.8, s * r * 0.95, -r * 0.35, s * r * 0.8, -r * 1.35); P(fur); }
  if (a === 'bulldog' || a === 'hound') {
    const len = a === 'hound' ? 1.1 : 0.62;
    for (const s of [-1, 1]) { ell(s * r * 0.95, r * (len * 0.5 - 0.3), r * 0.3, r * len * 0.75, s * -0.25); P(a === 'hound' ? '#5a4636' : '#8a6a4a'); }
  }
  if (a === 'longhorn') {
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * r * 0.7, -r * 0.5); c.quadraticCurveTo(s * r * 1.5, -r * 0.5, s * r * 1.9, -r * 1.15);
      c.strokeStyle = dark; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#f3ead2'; c.lineWidth = 5; c.stroke();
    }
    c.lineWidth = 2; c.strokeStyle = dark;
  }
  if (a === 'shark') { tri(-r * 0.4, -r * 0.8, r * 0.4, -r * 0.8, r * 0.2, -r * 1.65); P(fur); }
  if (a === 'rooster') for (const x of [-0.35, 0.35, 0]) { circ(x * r, -r * (x === 0 ? 1.15 : 0.98), r * 0.28); P('#d8232a'); }

  // head
  circ(0, 0, r); P(fur);
  c.save(); circ(0, 0, r - 1); c.clip();
  if (a === 'shark') { c.fillStyle = '#f4f6f8'; c.fillRect(-r, r * 0.2, 2 * r, r); }
  if (a === 'tiger') { c.lineWidth = 3; for (const s of [-1, 1]) for (const y of [0.0, 0.3]) { c.beginPath(); c.moveTo(s * r, y * r); c.lineTo(s * r * 0.62, y * r + r * 0.08); c.stroke(); } c.lineWidth = 2; }
  if (a !== 'commodore') { c.fillStyle = t.c1; c.fillRect(-r, -r, 2 * r, r * 0.5); c.fillStyle = t.c2; c.fillRect(-r, -r * 0.58, 2 * r, r * 0.1); }
  c.restore();
  circ(0, 0, r); c.stroke();

  // eyes
  for (const s of [-1, 1]) {
    circ(s * r * 0.36, -r * 0.16, r * 0.2); P('#fff');
    c.fillStyle = dark; circ(s * r * 0.36 - r * 0.07, -r * 0.14, r * 0.09); c.fill();
    c.beginPath(); c.moveTo(s * r * 0.62, -r * 0.48); c.lineTo(s * r * 0.14, -r * 0.33); c.lineWidth = 3; c.stroke(); c.lineWidth = 2;
  }

  // snout and details
  const nostrils = (y, dx) => { c.fillStyle = dark; for (const s of [-1, 1]) { circ(s * r * dx, y * r, r * 0.06); c.fill(); } };
  if (a === 'elephant') {
    for (const s of [-1, 1]) { tri(s * r * 0.3, r * 0.3, s * r * 0.55, r * 0.35, s * r * 0.6, r * 0.8); P('#fff'); }
    c.beginPath(); c.moveTo(0, r * 0.1); c.quadraticCurveTo(-r * 0.1, r * 0.8, r * 0.35, r * 0.95);
    c.strokeStyle = dark; c.lineWidth = r * 0.42; c.stroke(); c.strokeStyle = fur; c.lineWidth = r * 0.42 - 4; c.stroke();
    c.strokeStyle = dark; c.lineWidth = 2;
  } else if (a === 'hog') {
    for (const s of [-1, 1]) { tri(s * r * 0.4, r * 0.55, s * r * 0.6, r * 0.5, s * r * 0.62, r * 0.15); P('#fff'); }
    ell(0, r * 0.42, r * 0.42, r * 0.3); P('#e79a92'); nostrils(0.42, 0.16);
  } else if (a === 'tiger' || a === 'cat' || a === 'collie') {
    ell(0, r * 0.45, r * 0.45, r * 0.32); P('#fff');
    tri(-r * 0.13, r * 0.28, r * 0.13, r * 0.28, 0, r * 0.46); P(a === 'collie' ? dark : '#e2767a');
    c.beginPath(); c.moveTo(0, r * 0.46); c.lineTo(0, r * 0.62); c.moveTo(-r * 0.18, r * 0.66); c.lineTo(r * 0.18, r * 0.66); c.stroke();
    if (a !== 'collie') { c.lineWidth = 1; for (const s of [-1, 1]) for (const dy of [-0.06, 0.08]) { c.beginPath(); c.moveTo(s * r * 0.4, r * 0.45); c.lineTo(s * r * 1.05, r * (0.45 + dy * 2)); c.stroke(); } c.lineWidth = 2; }
  } else if (a === 'bulldog' || a === 'hound') {
    for (const s of [-1, 1]) { circ(s * r * 0.24, r * 0.5, r * 0.3); P(a === 'hound' ? '#e8dcc8' : '#fff'); }
    ell(0, r * 0.28, r * 0.17, r * 0.12); P(dark);
    if (a === 'bulldog') for (const s of [-1, 1]) { tri(s * r * 0.2, r * 0.78, s * r * 0.38, r * 0.78, s * r * 0.29, r * 0.56); P('#fff'); }
  } else if (a === 'horse' || a === 'longhorn') {
    ell(0, r * 0.5, r * 0.4, r * 0.36); P(a === 'horse' ? '#d9cfc0' : '#f3dcc0'); nostrils(0.5, 0.17);
  } else if (a === 'shark') {
    c.beginPath(); c.moveTo(-r * 0.6, r * 0.45);
    for (let i = 0; i <= 6; i++) c.lineTo(-r * 0.6 + i * r * 0.2, r * (i % 2 ? 0.7 : 0.45));
    c.closePath(); P('#fff');
  } else if (a === 'rooster') {
    ell(r * 0.05, r * 0.7, r * 0.14, r * 0.24); P('#d8232a');
    tri(-r * 0.25, r * 0.22, r * 0.25, r * 0.22, 0, r * 0.62); P('#f5b921');
  } else if (a === 'commodore') {
    c.beginPath(); c.moveTo(-r * 1.3, -r * 0.4); c.quadraticCurveTo(0, -r * 2.0, r * 1.3, -r * 0.4); c.quadraticCurveTo(0, -r * 0.85, -r * 1.3, -r * 0.4); P('#151515');
    c.beginPath(); c.moveTo(-r * 1.2, -r * 0.43); c.quadraticCurveTo(0, -r * 0.88, r * 1.2, -r * 0.43); c.strokeStyle = t.c2; c.lineWidth = 3; c.stroke();
    c.strokeStyle = dark; c.lineWidth = 2;
    circ(0, -r * 1.0, r * 0.14); P(t.c2);
    circ(0, r * 0.22, r * 0.1); P('#e0a880');
    for (const s of [-1, 1]) { ell(s * r * 0.25, r * 0.48, r * 0.28, r * 0.11, s * 0.3); P('#4a3020'); }
  }
}

// ---------- drawing: background ----------
function paintBg(t) {
  const c = bgc.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0);
  const sky = c.createLinearGradient(0, 0, 0, 460); sky.addColorStop(0, '#58b4f0'); sky.addColorStop(1, '#dbf2ff');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,.85)';
  for (const [x, y, s] of [[160, 90, 1], [520, 60, 0.8], [900, 110, 1.2], [1150, 50, 0.7]]) {
    for (const [dx, dy, q] of [[0, 0, 34], [36, 8, 26], [-36, 10, 24], [10, -16, 24]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, q * s, 0, 7); c.fill(); }
  }
  let seed = 7 + t.school.length * 13;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // visitors' section (orange and blue), far left
  c.globalAlpha = 1; c.fillStyle = BLUE; c.beginPath(); c.moveTo(0, GY); c.lineTo(0, 350); c.lineTo(290, 395); c.lineTo(345, GY); c.closePath(); c.fill();
  c.globalAlpha = 0.38;
  for (let y = 372; y < GY - 6; y += 9) for (let x = 4; x < 290 + (y - 395) * 0.24; x += 9) {
    if (y < 350 + x * 0.155 + 14) continue;
    c.fillStyle = [ORANGE, '#fff', '#2748c9', '#e8b78f'][Math.floor(rnd() * 4)]; c.fillRect(x + rnd() * 3, y + rnd() * 3, 5, 5);
  }

  // home stands in the home team's colors
  const topY = x => 290 - (x - 440) * 40 / 840, leftX = y => 440 - (y - 290) * 80 / 330;
  c.globalAlpha = 1;
  c.fillStyle = t.c1; c.beginPath(); c.moveTo(360, GY); c.lineTo(440, 290); c.lineTo(W, 250); c.lineTo(W, GY); c.closePath(); c.fill();
  c.globalAlpha = 0.38;
  const crowd = [t.c2, '#ffffff', t.c1, '#e8b78f', t.c2];
  for (let y = 270; y < GY - 6; y += 9) for (let x = leftX(y) + 8; x < W; x += 9) {
    if (y < topY(x) + 26) continue;
    c.fillStyle = crowd[Math.floor(rnd() * crowd.length)]; c.fillRect(x + rnd() * 3, y + rnd() * 3, 5, 5);
  }
  c.globalAlpha = 1;
  c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 2;
  for (let y = 340; y < GY; y += 54) { c.beginPath(); c.moveTo(leftX(y), y); c.lineTo(W, y - 6); c.stroke(); }
  c.strokeStyle = t.c2; c.lineWidth = 8; c.beginPath(); c.moveTo(440, 294); c.lineTo(W, 254); c.stroke();
  // stadium sign
  c.font = 'bold 26px "Trebuchet MS", sans-serif';
  const sw = c.measureText(t.stadium.toUpperCase()).width + 40;
  c.fillStyle = '#111'; c.fillRect(860 - sw / 2 - 4, 196, sw + 8, 52);
  c.fillStyle = t.c1; c.fillRect(860 - sw / 2, 200, sw, 44);
  c.fillStyle = t.tx || t.c2; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t.stadium.toUpperCase(), 860, 223);
  c.fillStyle = '#444'; c.fillRect(860 - sw / 2 + 20, 248, 8, 30); c.fillRect(860 + sw / 2 - 28, 248, 8, 30);
  // light towers
  for (const x of [470, 1230]) {
    c.fillStyle = '#555'; c.fillRect(x - 4, 120, 8, 190);
    c.fillStyle = '#333'; c.fillRect(x - 34, 96, 68, 34);
    c.fillStyle = '#fff7c2'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { c.beginPath(); c.arc(x - 24 + i * 16, 105 + j * 15, 5, 0, 7); c.fill(); }
  }
  // wall along the field
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, GY - 14, W, 14);

  // field
  for (let x = 0; x < W; x += 80) { c.fillStyle = (x / 80) % 2 ? '#3f9e43' : '#379239'; c.fillRect(x, GY, 80, H - GY); }
  c.fillStyle = BLUE; c.fillRect(0, GY, 330, H - GY);
  c.fillStyle = t.c1; c.fillRect(700, GY, W - 700, H - GY);
  c.fillStyle = '#fff'; c.fillRect(328, GY, 5, H - GY); c.fillRect(698, GY, 5, H - GY);
  for (let x = 420; x < 690; x += 90) c.fillRect(x, GY, 3, H - GY);
  c.font = 'bold 62px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = ORANGE; c.fillText('GATORS', 165, GY + 54);
  c.fillStyle = t.tx || t.c2;
  const name = t.school.toUpperCase(); let fs = 62; c.font = `bold ${fs}px Impact, "Arial Black", sans-serif`;
  while (c.measureText(name).width > 520) { fs -= 4; c.font = `bold ${fs}px Impact, "Arial Black", sans-serif`; }
  c.fillText(name, 990, GY + 54);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, GY, W, 5);
}

// ---------- drawing: frame ----------
function drawBlock(b) {
  const g = b.g, m = MAT[g.mat], w = g.w, h = g.h;
  ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
  ctx.fillStyle = m.fill; ctx.strokeStyle = m.edge; ctx.lineWidth = 3;
  ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3);
  ctx.lineWidth = 1.5;
  if (g.mat === 'wood') {
    ctx.strokeStyle = 'rgba(80,45,10,.4)'; ctx.beginPath();
    if (w > h) { ctx.moveTo(-w / 2 + 6, -3); ctx.lineTo(w / 2 - 6, -3); ctx.moveTo(-w / 2 + 14, 4); ctx.lineTo(w / 2 - 18, 4); }
    else { ctx.moveTo(-3, -h / 2 + 6); ctx.lineTo(-3, h / 2 - 6); ctx.moveTo(4, -h / 2 + 14); ctx.lineTo(4, h / 2 - 18); }
    ctx.stroke();
  } else if (g.mat === 'steel') {
    ctx.fillStyle = '#d6e0ea';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * (w / 2 - 7), sy * (h / 2 - 7), 2.2, 0, 7); ctx.fill(); }
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(-w / 2 + 5, -h / 2 + 5, 4, 4); ctx.fillRect(w / 2 - 12, h / 2 - 11, 5, 4);
  }
  const hr = g.hp / g.max;
  if (hr < 0.67) {
    ctx.strokeStyle = 'rgba(20,20,20,.75)'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(-w * 0.3, -h / 2); ctx.lineTo(-w * 0.1, -h * 0.1); ctx.lineTo(-w * 0.22, h * 0.2); ctx.lineTo(-w * 0.05, h / 2);
    if (hr < 0.34) { ctx.moveTo(w * 0.35, -h / 2); ctx.lineTo(w * 0.15, 0); ctx.lineTo(w * 0.3, h / 2); ctx.moveTo(-w * 0.1, -h * 0.1); ctx.lineTo(w * 0.15, 0); }
    ctx.stroke();
  }
  ctx.restore();
}

function drawPost(front) {
  const bx = ANCHOR.x;
  if (!front) {
    ctx.fillStyle = '#d6a800'; ctx.fillRect(bx + 24, 436, 8, 74);                 // far upright
  } else {
    ctx.fillStyle = '#f2c200'; ctx.fillRect(bx - 5, 508, 10, GY - 508);           // post
    ctx.fillRect(bx - 32, 502, 64, 10);                                           // crossbar
    ctx.fillRect(bx - 32, 436, 8, 74);                                            // near upright
    ctx.fillStyle = BLUE; ctx.fillRect(bx - 13, GY - 56, 26, 56);
    ctx.fillStyle = ORANGE; ctx.fillRect(bx - 13, GY - 40, 26, 8);
  }
}
function band(x, y, tx) {
  ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(tx, 446); ctx.lineTo(x, y); ctx.stroke();
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.drawImage(bgc, 0, 0, W, H);
  if (!G) return;
  const c = G.cur, t = G.team;

  // waiting gators
  G.queue.forEach((ty, i) => {
    const r = GT[ty].r; ctx.save(); ctx.translate(132 - i * 52, GY - r); drawGator(ctx, ty, r, false); ctx.restore();
  });

  // aim trail
  ctx.fillStyle = 'rgba(255,255,255,.35)'; for (const p of G.oldTrail) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.8)'; for (const p of G.trail) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill(); }

  for (const b of G.blocks) drawBlock(b);
  for (const m of G.mascots) { ctx.save(); ctx.translate(m.position.x, m.position.y); ctx.rotate(m.angle); drawMascot(ctx, t, MR); ctx.restore(); }

  drawPost(false);
  if (c && c.state !== 'fly') {
    const pulled = c.state === 'drag';
    const ang = pulled ? Math.atan2(ANCHOR.y - c.y, ANCHOR.x - c.x) : 0;
    const r = GT[c.type].r;
    band(c.x - Math.cos(ang) * r * 0.8, c.y - Math.sin(ang) * r * 0.8, ANCHOR.x + 28);
    if (pulled) {
      let x = c.x, y = c.y, vx = (ANCHOR.x - c.x) * POWER, vy = (ANCHOR.y - c.y) * POWER;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 2;
      for (let i = 0; i < 56; i++) {
        vy += GRAV; x += vx; y += vy; if (y > GY) break;
        if (i % 4 === 3) { ctx.beginPath(); ctx.arc(x, y, 5.5 - i * 0.05, 0, 7); ctx.fill(); ctx.stroke(); }
      }
    }
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ang); drawGator(ctx, c.type, r, pulled); ctx.restore();
    band(c.x - Math.cos(ang) * r * 0.8, c.y - Math.sin(ang) * r * 0.8, ANCHOR.x - 28);
  }
  drawPost(true);
  if (c && c.state === 'fly') {
    const b = c.body; ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
    drawGator(ctx, c.type, GT[c.type].r, b.g.chomp || !c.hit); ctx.restore();
  }

  for (const r of G.rings) { ctx.strokeStyle = `rgba(250,70,22,${r.life / 22})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke(); }
  for (const p of G.parts) { ctx.globalAlpha = Math.min(1, p.life / 20); ctx.fillStyle = p.col; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of G.floats) { ctx.globalAlpha = Math.min(1, f.life / 25); ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(f.txt, f.x, f.y); ctx.fillStyle = '#ffd23f'; ctx.fillText(f.txt, f.x, f.y); }
  ctx.globalAlpha = 1;

  // HUD text
  const label = (txt, x, y, size, align, col = '#fff') => {
    ctx.font = `bold ${size}px "Trebuchet MS", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y);
  };
  label(`GAME ${G.idx + 1} of ${TEAMS.length}  ·  at ${t.school} ${t.nick}`, 18, 14, 24, 'left');
  label(`Mascots left: ${G.mascots.length}`, 18, 46, 19, 'left', '#ffd23f');
  label(`SCORE ${G.score.toLocaleString()}`, W - 18, 14, 26, 'right');
  if (c && G.phase === 'play') {
    const tip = c.state === 'fly' ? (c.used ? '' : 'TAP NOW!') : `${GT[c.type].name}: drag back and release, then ${GT[c.type].tip}`;
    if (tip) label(tip, 18, 76, 17, 'left', '#ffe9d6');
  }
}

// ---------- screens ----------
function show(id) {
  for (const s of ['title', 'levels', 'result']) $(s).classList.toggle('hidden', s !== id);
  $('hud').classList.toggle('hidden', id !== null && id !== 'result');
}
function starStr(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }
function showLevels() {
  const grid = $('grid'); grid.innerHTML = '';
  TEAMS.forEach((t, i) => {
    const d = document.createElement('div'), open = unlocked(i);
    d.className = 'tile' + (open ? '' : ' locked');
    d.style.background = t.c1; d.style.color = t.tx || t.c2;
    d.innerHTML = `<span class="n">${i + 1}</span><span class="s">${t.school}</span><span class="m">${t.nick}</span><span class="st">${open ? starStr(progress.stars[i] || 0) : '🔒'}</span>`;
    if (open) d.onclick = () => startLevel(i);
    grid.appendChild(d);
  });
  show('levels');
}
function showResult(won, stars, left) {
  const t = G.team, last = G.idx === TEAMS.length - 1;
  $('rTitle').textContent = won ? (last ? 'CONFERENCE CHAMPS!' : 'GATORS WIN!') : 'SACKED!';
  $('rStars').innerHTML = won ? '★'.repeat(stars) + `<span class="off">${'★'.repeat(3 - stars)}</span>` : '';
  $('rText').textContent = won
    ? `${t.stadium} is rubble.` + (left ? ` ${left} spare gator${left > 1 ? 's' : ''}: +${(left * 3000).toLocaleString()}` : '')
    : `The ${t.nick} held ${t.stadium}. Run it back!`;
  $('rScore').textContent = `Score: ${G.score.toLocaleString()}`;
  $('bNext').classList.toggle('hidden', !won || last);
  show('result');
}

$('bPlay').onclick = showLevels;
$('bRestart').onclick = () => G && startLevel(G.idx);
$('bMenu').onclick = showLevels;
$('bLevels').onclick = showLevels;
$('bRetry').onclick = () => startLevel(G.idx);
$('bNext').onclick = () => startLevel(G.idx + 1);
$('bSound').onclick = () => { muted = !muted; $('bSound').innerHTML = muted ? '&#128263;' : '&#128266;'; };

// ---------- main loop ----------
let last = 0, acc = 0;
function frame(ts) {
  const dt = Math.min(50, ts - last || 16); last = ts;
  if (G) { acc += dt; let n = 0; while (acc >= STEP && n < 3) { step(); acc -= STEP; n++; } if (n === 3) acc = 0; }
  render();
  requestAnimationFrame(frame);
}
resize(); paintBg(TEAMS[0]); requestAnimationFrame(frame);

// small hook for testing from the console
window.SS = {
  get G() { return G; }, startLevel, LEVELS, TEAMS,
  tick(n) { for (let i = 0; i < n; i++) step(); render(); },
  fire(vx, vy) { if (G && G.cur && G.cur.state === 'ready') launch(vx, vy); },
  ability() { if (G && G.cur && G.cur.state === 'fly' && !G.cur.used) ability(); },
};
})();
