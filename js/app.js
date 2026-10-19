// Outer menu, drawn on the game screen with Deltarune's own fonts, sprites and the snow zone background.
// The fight itself is Deltarune's code; this file only starts it with the chosen options.
'use strict';

(function () {
  const D = GM.draw;
  const $ = (id) => document.getElementById(id);
  const overlay = $('overlay'), status = $('status');

  const WHITE = 0xFFFFFF, YELLOW = 0x00FFFF, GRAY = 0x808080, LIGHT = 0xC0C0C0, BLACK = 0;

  const settings = { mantle: false, invincible: false, practiceInvincible: false, volume: 1 };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('roaringknight_settings') || '{}')); } catch (e) { /* no storage */ }
  function saveSettings() { try { localStorage.setItem('roaringknight_settings', JSON.stringify(settings)); } catch (e) { /* no storage */ } }

  let A = null; // asset indices, resolved after loading
  const menu = { screen: 'main', sel: 0, message: '', frame: 0 };

  // ------------------------------------------------------------ sound & music
  function sfx(i) { if (A) GM.audio.play(i, 0, false); }
  let musicIdx = null, musicVoice = null;
  function startMusic() {
    if (musicVoice && GM.audio.voices.has(musicVoice)) return;
    if (musicIdx == null) musicIdx = GM.audio.createStream('mus/knight_appears.ogg');
    musicVoice = GM.audio.play(musicIdx, 0, true, 0.8);
  }

  // ------------------------------------------------------------ drawing helpers
  function text(x, y, s, font, col, align, scale, alpha) {
    D.font = font; D.halign = align || 0; D.valign = 0;
    D.text(x, y, s, scale || 1, scale || 1, 0, [col, col, col, col], alpha == null ? 1 : alpha);
  }
  // text over the bright snow gets a drop shadow
  function stext(x, y, s, font, col, align, scale) {
    const o = scale > 1 ? 2 : 1;
    text(x + o, y + o, s, font, BLACK, align, scale, 0.8);
    text(x, y, s, font, col, align, scale);
  }
  function heart(x, y) {
    const s = GM.sprites[A.heart];
    D.sprite(A.heart, 0, x + s.ox, y + s.oy, 1, 1, 0, WHITE, 1);
  }
  // the dark-world textbox, drawn like scr_darkbox; the whole box goes through a surface so it can be see-through
  // (its edge sprites have an opaque black inner band)
  let panelSurf = -1;
  function darkbox(x1, y1, x2, y2) {
    if (!D.surfaceExists(panelSurf)) panelSurf = D.surfaceCreate(D.W, D.H);
    D.surfaceSetTarget(panelSurf);
    D.clear(0, 0);
    darkboxSprites(x1, y1, x2, y2);
    D.surfaceReset();
    D.surface(panelSurf, x1, y1, x2 - x1 + 2, y2 - y1 + 2, x1, y1, 1, 1, 0, [WHITE, WHITE, WHITE, WHITE], 0.82);
  }
  function darkboxSprites(x1, y1, x2, y2) {
    D.rect(x1 + 8, y1 + 8, x2 - 8, y2 - 8, false, BLACK, BLACK, BLACK, BLACK, 1);
    const tw = x2 - x1 - 63, th = y2 - y1 - 63, j = menu.frame / 10;
    if (tw > 0) {
      D.spriteStretched(A.boxTop, 0, x1 + 32, y1, tw, 32, WHITE, 1);
      D.sprite(A.boxTop, 0, x1 + 32, y2 + 1, tw, -2, 0, WHITE, 1);
    }
    if (th > 0) {
      D.sprite(A.boxLeft, 0, x2 + 1, y1 + 32, -2, th, 0, WHITE, 1);
      D.sprite(A.boxLeft, 0, x1, y1 + 32, 2, th, 0, WHITE, 1);
    }
    D.sprite(A.boxCorner, j, x1, y1, 2, 2, 0, WHITE, 1);
    D.sprite(A.boxCorner, j, x2 + 1, y1, -2, 2, 0, WHITE, 1);
    D.sprite(A.boxCorner, j, x1, y2 + 1, 2, -2, 0, WHITE, 1);
    D.sprite(A.boxCorner, j, x2 + 1, y2 + 1, -2, -2, 0, WHITE, 1);
  }
  function hint(lines, y) { lines.forEach((l, i) => text(320, y + i * 18, l, A.small, GRAY, 1)); }

  // ------------------------------------------------------------ background: room_dw_snow_zone
  // obj_dw_snow_zone_parallax draws the whole landscape; its Draw code runs here with a camera that drifts
  // along the snow field to the dark end where the Knight waits (x 1000 -> 2230 and back).
  const scene = { par: null, ghosts: [] };
  const CAM_A = 1000, CAM_B = 2230, PAN = 30 * 70; // frames for one way
  const KNIGHT_X = 2655, KNIGHT_Y = 112;
  function camX() { return Math.round(CAM_A + (CAM_B - CAM_A) * (0.5 - 0.5 * Math.cos(Math.PI * menu.frame / PAN))); }

  function updateScene() {
    // the Knight hovers like obj_knight_enemy (y = ystart + cos(siner / 8) * 8) and leaves afterimages
    for (const g of scene.ghosts) { g.x += 2; g.a -= 0.02; }
    scene.ghosts = scene.ghosts.filter(g => g.a > 0);
    if (menu.frame % 4 === 0) scene.ghosts.push({ x: KNIGHT_X, y: knightY(), a: 0.6 });
  }
  function knightY() { return KNIGHT_Y + Math.cos(menu.frame / 8) * 8; }

  function drawScene() {
    const cx = camX();
    const savedViews = GM.views, savedW = GM.R.room_width;
    GM.views = [{ visible: true, cam: { x: cx, y: 0, w: 640, h: 480, angle: 0, bx: 0, by: 0, sx: -1, sy: -1, target: -1 }, px: 0, py: 0, pw: 640, ph: 480 }];
    GM.R.room_width = 2960;
    D.setOffset(-cx, 0);
    try {
      GM.C.gml_Object_obj_dw_snow_zone_parallax_Draw_0(scene.par, scene.par);
      // the black cover obj_dw_snow_zone_parallax puts along the bottom of the room
      D.rect(cx, 440, cx + 640, 480, false, BLACK, BLACK, BLACK, BLACK, 1);
      for (const g of scene.ghosts) D.sprite(A.knight, 0, g.x, g.y, 2, 2, 0, WHITE, g.a);
      D.sprite(A.knight, 0, KNIGHT_X, knightY(), 2, 2, 0, WHITE, 1);
    } finally {
      D.setOffset(0, 0);
      GM.views = savedViews; GM.R.room_width = savedW;
      D.setBlend(0); D.color = WHITE; D.alpha = 1;
    }
  }

  // ------------------------------------------------------------ screens
  const MAIN = [
    { label: 'Fight', go: () => startGame({}) },
    { label: 'Practice', go: () => open('practice', 0) },
    { label: 'Settings', go: () => open('settings', 0) }
  ];
  const PARTY = [
    () => 'KRIS: Saber10, ' + (settings.mantle ? 'ShadowMantle' : 'RoyalPin') + ', Silver Watch',
    () => 'SUSIE: ToxicAxe, ChainMail, SpikeBand',
    () => 'RALSEI: FlexScarf, TwinRibbon, B.ShotBowtie',
    () => 'ITEMS: 2 ReviveMint, ExecBuffet, DeluxeDinner, 2 LightCandy,',
    () => '2 TVDinner, ButJuice, CD Bagel, DD-Burger, TensionBit'
  ];
  function onOff(v) { return v ? 'ON' : 'OFF'; }
  function settingItems() {
    return [
      { label: 'ShadowMantle: ' + onOff(settings.mantle), change: () => { settings.mantle = !settings.mantle; } },
      { label: 'God Mode (fight): ' + onOff(settings.invincible), change: () => { settings.invincible = !settings.invincible; } },
      { label: 'God Mode (practice): ' + onOff(settings.practiceInvincible), change: () => { settings.practiceInvincible = !settings.practiceInvincible; } },
      { label: 'Volume: ' + Math.round(settings.volume * 100) + '%', change: (d) => { const v = [0, 0.25, 0.5, 0.75, 1]; settings.volume = v[(v.indexOf(settings.volume) + v.length + d) % v.length]; GM.audio.setMaster(settings.volume); } },
      { label: 'Back', go: () => open('main', 2) }
    ];
  }

  function drawMain() {
    stext(170, 40, 'ROARING', A.big, WHITE, 1, 2);
    stext(170, 100, 'KNIGHT', A.big, WHITE, 1, 2);
    stext(170, 168, 'DELTARUNE  CHAPTER 3', A.small, LIGHT, 1);
    darkbox(40, 200, 300, 356);
    MAIN.forEach((it, i) => {
      const y = 224 + i * 40;
      text(102, y, it.label, A.big, i === menu.sel ? YELLOW : WHITE);
      if (i === menu.sel) heart(74, y + 9);
    });
    if (menu.message) stext(170, 372, menu.message, A.small, WHITE, 1);
    hint(['Z / ENTER - Confirm     X / SHIFT - Back     F4 - Fullscreen', 'Hold ESC during the fight to return here'], 442);
  }

  // practice list: two columns, the fight's own turn order
  const ROWS = 11;
  function practiceCell(i) { return { col: i < ROWS ? 0 : 1, row: i % ROWS }; }
  function drawPractice() {
    stext(320, 18, 'PRACTICE', A.big, WHITE, 1, 2);
    darkbox(14, 84, 626, 426);
    JF.ATTACKS.forEach((a, i) => {
      const { col, row } = practiceCell(i);
      const x = col ? 328 : 40, y = 100 + row * 27;
      const c = i === menu.sel ? YELLOW : WHITE;
      text(x + 46, y, String(i + 1), A.big, c, 2);
      text(x + 56, y, a[2], A.big, c);
      if (i === menu.sel) heart(x - 8, y + 9);
    });
    hint(['Heroes DEFEND on their own, HP refills every turn.   God Mode: ' + onOff(settings.practiceInvincible),
      'ShadowMantle: ' + onOff(settings.mantle) + '   (Settings)     Z - Start     X - Back'], 440);
  }

  function drawSettings() {
    stext(320, 18, 'SETTINGS', A.big, WHITE, 1, 2);
    const items = settingItems();
    darkbox(60, 80, 580, 282);
    items.forEach((it, i) => {
      const y = 100 + i * 34;
      text(122, y, it.label, A.big, i === menu.sel ? YELLOW : WHITE);
      if (i === menu.sel) heart(94, y + 9);
    });
    let lines;
    if (menu.sel === 0) lines = ['Kris wears the ShadowMantle: most of the Knight\'s', 'hits go to Kris, and Kris takes only 1/3 of the damage.'].concat(PARTY.map(f => f()));
    else if (menu.sel === 1 || menu.sel === 2) lines = ['The party takes no damage.'];
    else lines = PARTY.map(f => f());
    darkbox(14, 288, 626, lines.length < 3 ? 360 : 436);
    lines.forEach((l, i) => text(320, 306 + i * 16, l, A.small, i < 2 && menu.sel === 0 ? WHITE : LIGHT, 1));
    hint(['LEFT / RIGHT / Z - Change     X - Back'], 448);
  }

  const STEP = 1000 / 30;
  let lastT = 0, accT = STEP;
  JF.menuFrame = function (now) {
    if (!A) return;
    // the menu runs at the game's 30 fps whatever the monitor's refresh rate
    accT += Math.min(250, Math.max(0, now - (lastT || now)));
    lastT = now;
    if (accT < STEP) return;
    while (accT >= STEP) { accT -= STEP; menu.frame++; updateScene(); }
    D.setBlend(0); D.setFog(false); D.setBlendEnable(true);
    D.begin(0);
    drawScene();
    if (menu.screen === 'main') drawMain();
    else if (menu.screen === 'practice') drawPractice();
    else drawSettings();
    D.end();
  };

  // practice label on top of the fight (restores the game's draw state afterwards)
  D.hudDraw = function () {
    if (!A || JF.opts.practice == null) return;
    const saved = [D.font, D.halign, D.valign, D.color, D.alpha];
    D.font = A.small; D.halign = 1; D.valign = 0;
    const s = `PRACTICE ${JF.opts.practice + 1}: ${JF.ATTACKS[JF.opts.practice][2].toUpperCase()}   -   HOLD ESC TO QUIT`;
    D.text(320, 4, s, 1, 1, 0, [GRAY, GRAY, GRAY, GRAY], 0.8);
    [D.font, D.halign, D.valign, D.color, D.alpha] = saved;
  };

  // ------------------------------------------------------------ input
  function open(screen, sel) { menu.screen = screen; menu.sel = sel || 0; }
  function key(e) {
    const k = e.keyCode;
    if (e.repeat) return;
    const up = k === 38 || k === 87, down = k === 40 || k === 83;
    const left = k === 37 || k === 65, right = k === 39 || k === 68;
    const ok = k === 90 || k === 13, back = k === 88 || k === 16 || k === 27;
    if (menu.screen === 'main') {
      if (up || down) { menu.sel = (menu.sel + (down ? 1 : MAIN.length - 1)) % MAIN.length; sfx(A.move); }
      else if (ok) { sfx(A.select); MAIN[menu.sel].go(); }
    } else if (menu.screen === 'practice') {
      const n = JF.ATTACKS.length, { col, row } = practiceCell(menu.sel);
      const colLen = col ? n - ROWS : ROWS;
      if (up || down) { menu.sel = col * ROWS + (row + (down ? 1 : colLen - 1)) % colLen; sfx(A.move); }
      else if (left || right) { menu.sel = Math.min(n - 1, (1 - col) * ROWS + row); sfx(A.move); }
      else if (ok) { sfx(A.select); startGame({ practice: menu.sel }); }
      else if (back) open('main', 1);
    } else {
      const items = settingItems();
      if (up || down) { menu.sel = (menu.sel + (down ? 1 : items.length - 1)) % items.length; sfx(A.move); }
      else if ((ok || left || right) && items[menu.sel].change) { items[menu.sel].change(left ? -1 : 1); saveSettings(); sfx(A.select); }
      else if (ok && items[menu.sel].go) { sfx(A.select); items[menu.sel].go(); }
      else if (back) open('main', 2);
    }
  }
  JF.keyFilter = (e) => {
    if (JF.running) return false;
    if ([37, 38, 39, 40, 65, 68, 83, 87, 13, 16, 27, 88, 90].includes(e.keyCode)) e.preventDefault();
    GM.audio.resume();
    if (A) key(e);
    return true;
  };

  // ------------------------------------------------------------ game start / return
  function startGame(opts) {
    Object.assign(JF.opts, {
      practice: null, mantle: settings.mantle,
      invincible: opts.practice != null ? settings.practiceInvincible : settings.invincible
    }, opts);
    musicVoice = null;
    GM.audio.resume();
    GM.audio.setMaster(settings.volume);
    JF.start();
  }

  function backToMenu(message) {
    GM.audio.stopAll();
    musicVoice = null;
    menu.message = message || '';
    open('main', 0);
    startMusic();
  }

  JF.onError = (e) => backToMenu('Error: ' + (e && e.message ? e.message : e));
  JF.onFightOver = (result) => backToMenu(result === 'won' ? 'The Knight retreated. You survived!' : '');
  JF.onQuit = () => backToMenu('');

  document.addEventListener('visibilitychange', () => {
    if (!GM.audio.ctx) return;
    if (document.hidden) GM.audio.ctx.suspend(); else GM.audio.ctx.resume();
  });

  JF.init($('screen'), (t) => { status.textContent = 'Loading: ' + t; })
    .then(() => {
      const id = (n) => GM.assetIndex.get(n).i;
      A = {
        big: id('fnt_mainbig'), small: id('fnt_main'), heart: id('spr_heart'),
        boxTop: id('spr_textbox_top'), boxLeft: id('spr_textbox_left'), boxCorner: id('spr_textbox_topleft'),
        move: id('snd_menumove'), select: id('snd_select'), knight: id('spr_roaringknight_idle')
      };
      // stand-in for the parallax instance (its Create event values)
      scene.par = { y_offset: -10, bg_height: GM.sprites[id('spr_dw_snow_zone_bg_parallax_layer_1')].h * 2, fountain_speed: 0.2, depth: 1000100 };
      GM.audio.setMaster(settings.volume);
      overlay.hidden = true;
      startMusic();
    })
    .catch((e) => { status.textContent = 'Could not load: ' + e.message; console.error(e); });
})();
