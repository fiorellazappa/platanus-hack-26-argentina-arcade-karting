// Argent Kart — Platanus Hack 26 (Buenos Aires edition)
// Mode-7 pseudo-3D kart racer — single-player, 2 AI opponents.
// Faithful Phaser 3 port of minimaldemo/mariokart.js.

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Virtual render-target dimensions — match the reference (iWidth=80, iHeight=35, iScreenScale=4 -> 320×140 scaled to 800×600).
const VIEW_W = 80;
const VIEW_H = 35;
const VIEW_CANVAS_W = 256;
const VIEW_CANVAS_H = 90;
const VIEW_Y_OFFSET = 10;

const CAM_HEIGHT = 24;
const CAM_DIST = 32;
const CAM_VIEW_HEIGHT = -10;
const F_FOCAL = 1 / Math.tan((Math.PI * Math.PI) / 360);
const LINE_SCALE = 0.5; // quality 2 → every second line

const MAX_SPEED = 6;
const MAX_ROT_INC = 6;
const TICK_MS = 1000 / 15;
const DRIFT_KICK = 0.5;
const LATERAL_KEEP = 0.8;

const INITIAL_LAP_LIMIT_MS = 25000;
const LAP_DECREMENT_MS = 2000;
const LAP_ARM_DISTANCE = 200;
const LAP_FINISH_RADIUS = 30;
const CHECKPOINT_POS = { x: 38, y: 272 };
const CHECKPOINT_RADIUS = 60;

// DO NOT replace existing keys — they match the physical arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u'],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

const KEYBOARD_TO_ARCADE = {};
for (const [arcadeCode, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) {
    KEYBOARD_TO_ARCADE[normalizeIncomingKey(key)] = arcadeCode;
  }
}

function normalizeIncomingKey(key) {
  if (typeof key !== 'string' || key.length === 0) return '';
  return key.length === 1 ? key.toLowerCase() : key;
}

const MAP1 = {
  texture: 'map_1',
  width: 512,
  height: 512,
  collision: [
    [84, 80, 52, 216],
    [68, 276, 20, 56],
    [136, 188, 208, 60],
    [344, 208, 64, 40],
    [368, 248, 40, 160],
    [368, 4, 140, 76],
    [4, 436, 236, 72],
  ],
  startposition: { x: 476, y: 356 },
  aistartpositions: [
    { x: 476 - 18, y: 356 - 18 },
    { x: 476, y: 356 - 24 },
  ],
  startrotation: 180,
  aipoints: [
    [467, 273], [459, 208], [317, 128], [160, 50],
    [64, 53], [44, 111], [38, 272], [50, 351],
    [106, 349], [215, 300], [278, 305], [337, 417],
    [405, 451], [462, 414],
  ],
};

const CHARACTERS = ['mario', 'luigi', 'peach'];
const CHARACTER_LABEL = { mario: 'MARIO', luigi: 'LUIGI', peach: 'PEACH' };

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-root',
  backgroundColor: '#000000',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: { preload, create, update },
};

new Phaser.Game(config);

// ---------------------------------------------------------------------------
// Preload / assets
// ---------------------------------------------------------------------------

const ATLAS_FRAMES = {
  'bg_hills.png':            [1, 1, 720, 20],
  'bg_trees.png':            [1, 23, 720, 20],
  'countdown.png':           [723, 1, 192, 48],
  'map_1.png':               [1, 45, 512, 512],
  'select_luigi.png':        [515, 51, 48, 48],
  'select_map1.png':         [565, 51, 120, 48],
  'select_mario.png':        [687, 51, 48, 48],
  'select_peach.png':        [737, 51, 48, 48],
  'sprite_luigi_smooth.png': [1, 559, 960, 32],
  'sprite_mario_smooth.png': [1, 593, 960, 32],
  'sprite_peach_smooth.png': [1, 627, 960, 32],
  'title.png':               [515, 101, 234, 78],
};

function preload() {
  this.load.image('atlas', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA8IAAAKUBAMAAAA9ZZzAAAAAMFBMVEUAAAD35YnS3+u2oW1pthOaiFoE3AFzdYFzdYAAqABeX17bJBcCfwIhN+wSKyocIiAYmBSoAAAAAXRSTlMAQObYZgAAWbJJREFUeNrs1zFqG0EUxvFNKoOKnRW+gKYICSp0BsMrdQp3uYVxmxOEXCK4SnjFNC51mEWFCUwx2Ywlvd0Zoaf3lkFS2D8Gsx/Y0s4PSXY19b/3oTmjuY0taLFdzbhgV/5Y9Gijm7$-$onHPdm4XstuI2X3xyjAOlxWmQ2eENcA5MQOsEC4QwP47R9zcgLA91D+5xVjgU8TjWei5lwEG2H1niJtCwvU44fzE8xfxeOBDjT79O+z4py+5DcPISPe6rgsKjw+SmtsK0vjbMIyMdK9Ce83CADdNDCAnNplMCGG/aXZE2mXC99D1IBBOf4pPdjZFfNJrObCQ2KQywbUfd5NmnyEi7RJhgE0XAPOXVpLICeCCxPfw3kN6LQDWEJuBTISpSEa+u4CuzXdeGNab2CtI/kUVOUnOpgQwkSbXAmA5sRnK1NhWJCPfZ1vrtyvaGeEUOCfmgKkCH2IFgCNpei0AlhOboYx3Fcko9tralbVt3AXCBJwRc8BUgQ+xAsCRNLvmA1ASm4FMjS3JKPfHx7iLhAmYiPlEToKzKQhMCYkBtMRmIONdRTK6/dPbG+2cMAEriEVOgrMpB6wnBlATm6FMSzKqfbbt9lUVd16YgF9hIyUWOQnOphywnhhAT2z6MjWSjG5HF9D5uPPCBHwQXp9NLHISnE05YD0xwAhiM5BxFcno9pijnReG9Z6WoHlikROcVWFgPTGIyoRPyOh2KxGOwBQJM8QiJzizosB6YhB2ShgTGc3uAu2McAJML2WWWOQEZ1cQWE8M4k4JtySj2jEK084KEzDFE4ucQFAxYD0xKDoifPctgvkoE7riKt5n2BX6OyNMwBJi0Q2CqELAemJQlQs/W+z65f+QTG$-$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$-$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$-$hkm4dvjtAwxTAZPt3FVnnYgQQkYYCgLmIug0mUk7LncRW3qlWEqVPX8Fo4/W8vv9vmYf8IDe/9lJadj0ZMHl4D5eMvyu2K8mFMedj8vamGIUxi6AH0eliFglqi/I/wVLULFMR79/UASTgOA9s8rGOzKjoacmhArLey+2QPr19QPv6m3N5RPryjPGzeSPgs7sfnEALsJyzf04Zwc3IPgEFChK3ysFbDnR15bUJMVj6Ni5+hhkM4xyiEqxoLJ8IUFWH06Ke5OtycDGcASR8CyzysJezSlG0ufo+niXuzh0vCGEWCxrvn0IF896ohUoOiHhPhECJcU/lb5eHRXg3HxprYaFxs6z5N7YjBSFgkEV1lBQ1gWj1U4VOLSLQ9QYc8pHCjt5JwNEJrPGze43CwrGdDo9c2Ohdbuk9TO0PysDaYG8LXAK9oNCGyC0WY6jjl9aIiEZ6U8829FgIMA7TMwzfa5x317J4a1rrYzn2a2kk1bAgRwerLWYD/2DtjFbmNMI67SBFIdcRdisDAwaAUS3IxmAsmL5DGkANjc1znNu8w1bCNMLgxdooojZgUKlJucQTcJXmEw88QHQGxzWSkv0bfzK1Wu8ruSaNdf8cqI81IzS+ff3wz2tkqQJZb1HH50Q1hJupZy8gyNP/Ef/5NcOvDbYTZI/R1me/fVhdP4R/qq7UeBqYvTmpKIMvjmjDXLYS1wDWY+Mt/zmYBEPZ/5yFaP9+BmeC/2uI9ediPqK0WxicUxJc3awlDp0SpAGAsQcQgbAXNpcCLHpxuPUEKB0D4IVm0jfDCnQl+9+7N6t9reLjTxVQL4xOKi598WE8YCUonIopBmkuAhXNLvnG9uCgyuhX/c4SRw12rw79d+zPBb1bjNTzc6WKqhfEJxcXI4e1iafFV/1Wp4YpGXHYqKc1x5XXakDzcXQ53zAT/RE9wYhouNh4++DfiycOd5XDHiuxreLglwq+LL2+OgDB5uI3wV79vXJF9Tx6eXF385MMRECYPn7eWwxtXZB0PT64uPoYchoe7y+H+HkaE7+Ij83BXOdzfwxSRXxPvvNfHRw$-$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$-$7R/0cnknvIdp7qB02fi+alO7/hR8n/RyeS+9hn3Np4nvR5onlXNquw4hztAnWd3d1Qkx3OI+2ScThRofBueEMrt/dVUm+C4dztU0iDjc6DM4NZ3D97q5qBndYz7A4THKYbjAkFoetnkubvhdNz4W5wy8KOZcmnEubvRdNT27u8G8rOZcmnEsbvhdNj7nDLwo5lyacSxu+F01PLOfSlnoeQDz6e9H4ntgc4h+lf3iongcQj/xeNL4nrifvclj6h4fqeQDxKO9Fmz4fhnQ5LP3D1h1OVe/oI0QEYnHYRu9hFCMOkya4iLZjlTxoR2zUe1j+YZLewyax9n9FHCYYnO/DDBevE3xHTO89vD2tlN7D08YZ7uew6QQv91eHf2zGdfS4dYqH6j0sZ1h6D5v/lu7ncGq4gpd72U1OkFUcy7m0XYfBOfoEwwrOyhRRZA6x9A/vwGHtHN3g5d6dfzoqWhZxLv3Ddh3WztENrvzzRdsilv5hhw7TDdZJ23bFsTi8+3NpxGGqwTrRlSnE0j882Lk06jDdYBiLpWpMLv3Duz+XRh2mGwzjaKWaI/3Duz+Xxh2mGwxphVjOpXfe8xDFIJ52mDLBKRhcSzTrhpjucHmfh/Q83HMYxAOHaQZn6V6zqUdtEA/qcHnbg/Q83HMYxAOHSQZnJ09aTF28Vs0Z0GE9w9LzgDhM+St6+/8oxABicXjXDuePt+KVn/lfEyYYIRXZEUvv4a4dzouteOW9HWuCwSctnuI7Yuk93LXDqphO76xhgsFtnuI7Yuk93K3DALHueVhTDTaHWM6lh3cYb5ykG2y2IxaHd+ywylf3ZUtfkww23BGLw7t2WBX3/Yt+pRhsuiMWh3ftsIqqJ8lpER0QDDaHWBzescMqj9Z39YuKS4LBSOYIxLT+4fI8WvqHZ6ox+8VUG1xEgxuM769zev9weVop/cPztme60frrHriAFUwwGBmqOfT+4XKGpX94rpoTbVYxCFxES4rBeNoglnPpXfY8QPaX0Xo7v3uXCcFgAsQ0h8tIzwM43LyKt/N7kCiSwfiYpsiOmORwGel5mKvW7MP6JRqMjxPVHLLDZaTnYa7aA9tVosF4pm0Qi8PDO0yPNpgOsfQe7tphCMFg4o5Yeg8tOKwoBlN3xNJ7aMFhksHkHbGcS1twmGYwHWK6w/pyGHHYgsHkHTHuMH6/tDg8vMH0HTHdYT3D4rALg/EdsThsx2G6wXSI8d5DOZemOUw3mL4jxnsP5Vya5jDdYPqOGO89lHNpgsMUg+k7YjmXHqbnwaXBOMTSPzxMz4NLg/EdsfQPD9LzkLo0GN8RS$-$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$-$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$-$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$-$o8L/TOH0v0rh4i9Q2vJvC1PDTiGHyuemj1O0aKFmZF5iV/zzx0swFyXr31Lanm1esVfsnqlFZ4o55zRbJypfbbqg+XGakDjrMCzSV8F5vQC+3s5GXKx+ErfWaZa3Zop1UOsZfd3CVghfvNQa2YLarVpTDoVup9TOAhlUq5klZV6sFRjL4dd3qwaKI5Z1g385RY0E5aTAkECNYpvbd/hnPTeW5z2v39tvJW9uobcfbA0AYqx/HGoArNCbqlXOL6gWPbU5fviGeYo5gFyJYG8B8HwHWpxe3Vcq6YaEb3OlhFKqYOYXmfTVzIsmKweFGYnQodyCwA2Utptir10Hw4yeKHUllGqB0pRTFnuMaEqN4Ktz5ADmy2mWqUciV0x8veZWUQ8dwIpm2BvY1gDYVBs2NQAuErDVx92m6GPec3vngzAr0OTobTPCVYZMyoHBEZn3NQv7lQe/nyC7kCkApQ1t2eAZmK7EMAGAc0ZhK5AHEVp1xfinlWZTcZvN1AAwmGO2BYVtezmG/nStBu4/sv9n7v1CAUjn4PHr/u/lrHcwezUldrNzLY91BkyBtsdURpvv+QdfK2XU9DURsr499PcM/haDcfsfmF0NAKnt2NYAeJrW5HETUSyPwMYK45j0aHqNsSghQ3k4jCIHaYXTowg4VWx9DYAicRL2jHk7YN6AR5wZdzJPt6Owa78zOc2GOX6jOZtvEBUda4WJr1+wokd0hKlCn78XMqRnwM6n6E3KlCrweDbxJKoeMk9hFbY1ABrJNuec/qDsagD8WStKVLkaADpNB257jkRIDdcAGBSOeDRNX7+mLZHuU4Jsfi1YSVb48yZDK/ZYcZXwopyBNLLixDUA2setEAuNOVfXnGb5JuLAA2Abq3Q/w06FyL9X0Iq8hMbFlbjbPMZXmhfQ/hNBTQb1UCvcosXVXT3e+pF8iBsKfcGziOKjC4Dj12QIakrloPAmnlJUpgYAlCKQUnA1AIgIT4EPza4GQFZJKZ3Cf85WGLgdcrhYy2x4b3/JCq9IVgwLzZCJ1J78WhzNIJ7vQPKcXwvRK5xzRBfzVPSKtyopJ1BtI9itcEo6QqTm1xr3wLk9/9D6sqKLRiglhGhylegZdpq0vEhrhRWvoqRwze6sTRrSW2XxDar04O4psA5xjClwCgCRjLpBYbana0mdVZjjicIqPD8UElLs/xurPLCiKF67HJb7R8wmh4MgwiqYmTfEg/1+NE0eFMXOSu5jBSjg2Zf9PpD+H7RSgJRfQvypP0rnACopo+9BWuETBbBboo8wCfQrIL5PruVyCwrnp5D9ptNcCd2+WuTcNwBtS3xW3sNrKQGc5l3Rf0u85gQK6Gr5UCte7Lf9t8TXh/v2DfGgAx0GRuE+Q4LgCxtxxeuUp0CxQld8aP6o8K9JYV05SHKPzDv/b9M09bhLs2caZ2jBChQPLlMeTZv0ESvSA33hXlcUy6Jg99N5qzRpXmHJCu/lxaRga/kLZ/gUX/S2OlVdv+/1jJO82sKbLX77J337KtlgK6jsz9aTggdzmq+D5zzCpebVj8Bfd4dnPpNW8aw/Or831ADIgcNApufnPN7JJp5plr7ChgMh+A+Yp8zafxgwlx+UXQ2Av2S9vfJrAIz5hkZ4NQBmw4QZjD1/7ME8H1FMxqAw+sZbvPsO/sBFm5RbEPjv27fjaPY0s5n+oLA0JaCx5ZSB5mFmaAqN2aWNDcdzXAPgRnaZnWfPbQ2AbLAVsPzA/MtSZvqzNQAmMGCGvBxh+QuqL/wbjRUY9af0CMDHGgAf7T/Q/gYUZNCHL0yCLAAAAABJRU5ErkJggg=='.split('$-$').join('//'));
}

function registerAtlasFrames(scene) {
  const tex = scene.textures.get('atlas');
  for (const name in ATLAS_FRAMES) {
    const f = ATLAS_FRAMES[name];
    tex.add(name, 0, f[0], f[1], f[2], f[3]);
  }
}

// ---------------------------------------------------------------------------
// Scene state + setup
// ---------------------------------------------------------------------------

function create() {
  const scene = this;
  registerAtlasFrames(scene);

  scene.controls = createControls(scene);

  scene.state = {
    phase: 'title',
    selectedCharIndex: 0,
    character: CHARACTERS[0],
    countdownStep: 0,
    countdownTimer: 0,
    tickAccumulator: 0,
    maxRotTimer: 0,
    karts: [],
    player: null,
    lapNumber: 1,
    lapLimitMs: INITIAL_LAP_LIMIT_MS,
    lapStartTime: 0,
    lapArmed: false,
    checkpointHit: false,
    bestLapMs: Infinity,
    lapsCompleted: 0,
  };

  // Backdrop
  scene.bgRect = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x051012).setDepth(-100);

  // --- Mode-7 canvases --------------------------------------------------------
  const screenW = Math.floor(VIEW_W / LINE_SCALE); // 160
  const screenH = Math.floor(VIEW_H / LINE_SCALE); // 70

  const viewTex = scene.textures.createCanvas('viewCanvas', VIEW_CANVAS_W, VIEW_CANVAS_H);
  const screenTex = scene.textures.createCanvas('screenCanvas', screenW, screenH);

  scene.viewTex = viewTex;
  scene.screenTex = screenTex;
  scene.viewCtx = viewTex.getContext();
  scene.screenCtx = screenTex.getContext();

  const mapFrame = scene.textures.getFrame('atlas', 'map_1.png');
  scene.atlasImg = mapFrame.source.image;
  scene.mapFrameRect = { x: mapFrame.cutX, y: mapFrame.cutY, w: mapFrame.cutWidth, h: mapFrame.cutHeight };

  // Stretch Mode-7 to ~80% of screen height (480px) so the track dominates the viewport.
  // Non-uniform stretch (X=5, Y≈6.86) — matches the reference's presentation ratio.
  const renderedW = GAME_WIDTH;   // 800
  const renderedH = 480;
  const renderX = 0;
  const renderY = GAME_HEIGHT - renderedH;    // 120 — leaves 120px sky on top

  scene.mode7Image = scene.add.image(renderX, renderY, 'screenCanvas')
    .setOrigin(0, 0)
    .setDisplaySize(renderedW, renderedH)
    .setDepth(10);
  scene.mode7Image.setVisible(false);

  // Sky strip above the Mode-7 view. Hills + trees bottom-anchored to a lower horizon line.
  const horizonY = renderY + 50;
  scene.add.rectangle(GAME_WIDTH / 2, horizonY / 2, GAME_WIDTH, horizonY, 0x7ac0e8)
    .setDepth(8);
  scene.hills = scene.add.tileSprite(GAME_WIDTH / 2, horizonY, GAME_WIDTH, 90, 'atlas', 'bg_hills.png')
    .setOrigin(0.5, 1)
    .setDepth(11);
  scene.hills.tileScaleY = 90 / 20;
  scene.hills.tileScaleX = 1;
  scene.trees = scene.add.tileSprite(GAME_WIDTH / 2, horizonY, GAME_WIDTH, 60, 'atlas', 'bg_trees.png')
    .setOrigin(0.5, 1)
    .setDepth(12);
  scene.trees.tileScaleY = 60 / 20;
  scene.trees.tileScaleX = 1;
  this.hills.setScale(2.56)
  this.hills.setY(230);
  this.trees.setScale(2.56)
  this.trees.setY(230);
  // hills scale = 2 // y = 230
  scene.hills.setVisible(false);
  scene.trees.setVisible(false);

  // Precompute scanlines (reference: loop over iViewY, compute iPointZ, stripwidth, mapzspan).
  scene.strips = buildStrips();
  scene.renderOrigin = { x: renderX, y: renderY };
  scene.renderSize = { w: renderedW, h: renderedH };

  // HUD layer elements (created once, toggled by phase).
  buildTitleLayer(scene);
  buildCharSelectLayer(scene);
  buildMapSelectLayer(scene);
  buildCountdownLayer(scene);
  buildHudLayer(scene);
  buildGameOverLayer(scene);

  showPhase(scene, 'title');
}

function buildStrips() {
  const strips = [];
  let lastZ = 0;
  for (let viewY = 0; viewY < VIEW_H; viewY += LINE_SCALE) {
    const totalY = viewY + CAM_VIEW_HEIGHT;
    const deltaY = CAM_HEIGHT - totalY;
    const pointZ = totalY / (deltaY / CAM_DIST);
    const scaleRatio = F_FOCAL / (F_FOCAL + pointZ);
    const stripWidth = Math.floor(VIEW_W / scaleRatio);
    if (scaleRatio > 0 && stripWidth < VIEW_CANVAS_W) {
      if (viewY === 0) lastZ = pointZ - 1;
      strips.push({
        viewy: viewY,
        mapz: pointZ,
        scale: scaleRatio,
        stripwidth: stripWidth,
        mapzspan: pointZ - lastZ,
      });
      lastZ = pointZ;
    }
  }
  return strips;
}

// ---------------------------------------------------------------------------
// HUD builders — create once, toggle per phase
// ---------------------------------------------------------------------------

function buildTitleLayer(scene) {
  const layer = scene.add.container(0, 0).setDepth(50);
  const title = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'atlas', 'title.png').setOrigin(0.5);
  title.setScale(4);
  const tip = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 140, 'PRESS START', {
    fontFamily: 'monospace',
    fontSize: '28px',
    color: '#ffe66b',
  }).setOrigin(0.5);
  scene.tweens.add({ targets: tip, alpha: { from: 1, to: 0.3 }, duration: 700, yoyo: true, repeat: -1 });
  const hint = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'ENTER / U to confirm — A/D to steer', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#88aa66',
  }).setOrigin(0.5);
  layer.add([title, tip, hint]);
  scene.titleLayer = layer;
}

function buildCharSelectLayer(scene) {
  const layer = scene.add.container(0, 0).setDepth(50);
  const header = scene.add.text(GAME_WIDTH / 2, 90, 'SELECT DRIVER', {
    fontFamily: 'monospace',
    fontSize: '34px',
    color: '#ffe66b',
  }).setOrigin(0.5);
  const spacing = 210;
  const baseX = GAME_WIDTH / 2 - spacing;
  const baseY = GAME_HEIGHT / 2;
  const portraits = [];
  const labels = [];
  CHARACTERS.forEach((name, i) => {
    const p = scene.add.image(baseX + spacing * i, baseY, 'atlas', `select_${name}.png`).setOrigin(0.5);
    p.setScale(6);
    portraits.push(p);
    const l = scene.add.text(baseX + spacing * i, baseY + 120, CHARACTER_LABEL[name], {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#cfe3a0',
    }).setOrigin(0.5);
    labels.push(l);
  });
  const cursor = scene.add.rectangle(baseX, baseY, 170, 170).setStrokeStyle(4, 0xe1ff00).setFillStyle(0, 0);
  const hint = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70, 'A/D choose — U to confirm', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#88aa66',
  }).setOrigin(0.5);
  layer.add([header, ...portraits, ...labels, cursor, hint]);
  scene.charSelectLayer = layer;
  scene.charSelect = { cursor, labels, baseX, spacing, baseY };
}

function buildMapSelectLayer(scene) {
  const layer = scene.add.container(0, 0).setDepth(50);
  const header = scene.add.text(GAME_WIDTH / 2, 90, 'SELECT TRACK', {
    fontFamily: 'monospace',
    fontSize: '34px',
    color: '#ffe66b',
  }).setOrigin(0.5);
  const thumb = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'atlas', 'select_map1.png').setOrigin(0.5);
  thumb.setScale(4);
  const name = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 150, 'MAP 1 — CIRCUIT', {
    fontFamily: 'monospace',
    fontSize: '24px',
    color: '#cfe3a0',
  }).setOrigin(0.5);
  const hint = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70, 'U to race', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#88aa66',
  }).setOrigin(0.5);
  layer.add([header, thumb, name, hint]);
  scene.mapSelectLayer = layer;
}

function buildCountdownLayer(scene) {
  const layer = scene.add.container(0, 0).setDepth(60);
  // countdown.png is 192×48 — four 48×48 frames (3, 2, 1, GO).
  const cd = scene.add.image(GAME_WIDTH / 2, 150, 'atlas', 'countdown.png');
  cd.setOrigin(0.5);
  cd.setScale(3);
  cd.setCrop(0, 0, 48, 48);
  cd.setDisplayOrigin(24, 24);
  layer.add(cd);
  layer.setVisible(false);
  scene.countdownLayer = layer;
  scene.countdownImg = cd;
}

function buildHudLayer(scene) {
  const layer = scene.add.container(0, 0).setDepth(55);
  const speed = scene.add.text(20, 18, 'SPEED 0', {
    fontFamily: 'monospace',
    fontSize: '20px',
    color: '#ffe66b',
    stroke: '#000',
    strokeThickness: 3,
  });
  const timer = scene.add.text(GAME_WIDTH - 20, 18, '00:00.00', {
    fontFamily: 'monospace',
    fontSize: '20px',
    color: '#ffe66b',
    stroke: '#000',
    strokeThickness: 3,
  }).setOrigin(1, 0);
  layer.add([speed, timer]);
  layer.setVisible(false);
  scene.hudLayer = layer;
  scene.hudSpeedText = speed;
  scene.hudTimerText = timer;

  // Opponent kart sprites (2 AIs). We use Phaser images referencing the sprite strips.
  // We'll crop to a single 32×32 frame per render tick. Player is drawn from their strip centered.
  scene.kartSprites = [];
  for (let i = 0; i < 3; i++) {
    const s = scene.add.image(0, 0, 'atlas', 'sprite_mario_smooth.png').setOrigin(0.5, 1).setVisible(false);
    s.setDepth(20 + i);
    scene.kartSprites.push(s);
  }
}

function buildGameOverLayer(scene) {
  const layer = scene.add.container(0, 0).setDepth(65);
  const shade = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
  const title = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'GAME OVER', {
    fontFamily: 'monospace',
    fontSize: '72px',
    color: '#ff3b3b',
    stroke: '#000',
    strokeThickness: 6,
  }).setOrigin(0.5);
  const laps = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'LAPS  0', {
    fontFamily: 'monospace',
    fontSize: '32px',
    color: '#ffe66b',
  }).setOrigin(0.5);
  const best = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'BEST LAP  --', {
    fontFamily: 'monospace',
    fontSize: '28px',
    color: '#cfe3a0',
  }).setOrigin(0.5);
  const hint = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, 'PRESS START', {
    fontFamily: 'monospace',
    fontSize: '28px',
    color: '#ffe66b',
  }).setOrigin(0.5);
  scene.tweens.add({ targets: hint, alpha: { from: 1, to: 0.3 }, duration: 700, yoyo: true, repeat: -1 });
  layer.add([shade, title, laps, best, hint]);
  layer.setVisible(false);
  scene.gameOverLayer = layer;
  scene.gameOverLapsText = laps;
  scene.gameOverBestText = best;
}

// ---------------------------------------------------------------------------
// Phase machine
// ---------------------------------------------------------------------------

function showPhase(scene, phase) {
  scene.state.phase = phase;
  scene.titleLayer.setVisible(phase === 'title');
  scene.charSelectLayer.setVisible(phase === 'charSelect');
  scene.mapSelectLayer.setVisible(phase === 'mapSelect');
  scene.countdownLayer.setVisible(phase === 'countdown');
  scene.hudLayer.setVisible(phase === 'racing' || phase === 'countdown');
  scene.gameOverLayer.setVisible(phase === 'gameOver');

  const showTrack = phase === 'countdown' || phase === 'racing';
  scene.mode7Image.setVisible(showTrack);
  scene.hills.setVisible(showTrack);
  scene.trees.setVisible(showTrack);
  for (const s of scene.kartSprites) s.setVisible(false);
}

// ---------------------------------------------------------------------------
// Main update loop
// ---------------------------------------------------------------------------

function update(time, delta) {
  const scene = this;
  const controls = scene.controls;
  const st = scene.state;

  switch (st.phase) {
    case 'title':
      if (controls.consumeAny(['START1', 'START2', 'P1_1'])) {
        showPhase(scene, 'charSelect');
      }
      break;

    case 'charSelect': {
      const axis = controls.menuAxis();
      if (axis !== 0) {
        st.selectedCharIndex = (st.selectedCharIndex + axis + CHARACTERS.length) % CHARACTERS.length;
        updateCharCursor(scene);
      }
      if (controls.consumeAny(['START1', 'START2', 'P1_1'])) {
        st.character = CHARACTERS[st.selectedCharIndex];
        showPhase(scene, 'mapSelect');
      }
      break;
    }

    case 'mapSelect':
      if (controls.consumeAny(['START1', 'START2', 'P1_1'])) {
        startRace(scene);
      }
      break;

    case 'countdown':
      st.countdownTimer += delta;
      if (st.countdownTimer >= 1000) {
        st.countdownTimer = 0;
        st.countdownStep += 1;
        if (st.countdownStep >= 4) {
          st.phase = 'racing';
          st.lapStartTime = time;
          scene.countdownLayer.setVisible(false);
        } else {
          scene.countdownImg.setCrop(st.countdownStep * 48, 0, 48, 48);
          scene.countdownImg.setDisplayOrigin(st.countdownStep * 48 + 24, 24);
        }
      }
      // Drive the scanline render each frame so the track animates while waiting.
      stepSimulation(scene, delta, false);
      renderTrack(scene);
      break;

    case 'racing': {
      stepSimulation(scene, delta, true);
      renderTrack(scene);
      const p = st.player;
      if (p) {
        const dx = p.x - MAP1.startposition.x;
        const dy = p.y - MAP1.startposition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cdx = p.x - CHECKPOINT_POS.x;
        const cdy = p.y - CHECKPOINT_POS.y;
        const cpDist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cpDist < CHECKPOINT_RADIUS) st.checkpointHit = true;
        if (dist > LAP_ARM_DISTANCE) st.lapArmed = true;
        if (st.lapArmed && st.checkpointHit && dist < LAP_FINISH_RADIUS) {
          const lapTime = time - st.lapStartTime;
          if (lapTime < st.bestLapMs) st.bestLapMs = lapTime;
          st.lapsCompleted += 1;
          st.lapNumber += 1;
          st.lapLimitMs -= LAP_DECREMENT_MS;
          st.lapStartTime = time;
          st.lapArmed = false;
          st.checkpointHit = false;
          if (st.lapLimitMs <= 0) {
            enterGameOver(scene);
            break;
          }
        }
        const remaining = st.lapLimitMs - (time - st.lapStartTime);
        if (remaining <= 0) {
          enterGameOver(scene);
          break;
        }
        updateHud(scene, remaining);
      }
      if (controls.consumeAny(['START2'])) {
        // Esc-style — return to title (START2 = '2' key; convenient for testing).
        showPhase(scene, 'title');
      }
      break;
    }

    case 'gameOver':
      if (controls.consumeAny(['START1', 'START2', 'P1_1'])) {
        showPhase(scene, 'title');
      }
      break;
  }
}

function updateCharCursor(scene) {
  const cs = scene.charSelect;
  const i = scene.state.selectedCharIndex;
  cs.cursor.x = cs.baseX + cs.spacing * i;
  cs.cursor.y = cs.baseY;
  cs.labels.forEach((lbl, idx) => {
    lbl.setColor(idx === i ? '#e1ff00' : '#cfe3a0');
  });
}

function updateHud(scene, remainingMs) {
  const p = scene.state.player;
  if (!p) return;
  const cp = scene.state.checkpointHit ? 'CP:OK' : 'CP:--';
  scene.hudSpeedText.setText(`LAP ${scene.state.lapNumber}  ${cp}  SPEED ${Math.max(0, Math.round(Math.abs(p.speed) * 20))}`);
  const ms = Math.max(0, remainingMs);
  const s = Math.floor(ms / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  scene.hudTimerText.setText(`${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`);
  let color = '#ffe66b';
  if (ms <= 5000) color = '#ff3b3b';
  else if (ms <= 10000) color = '#ff9a3c';
  scene.hudTimerText.setColor(color);
}

function formatLapTime(ms) {
  if (!isFinite(ms)) return '--';
  const s = Math.floor(ms / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function enterGameOver(scene) {
  const st = scene.state;
  scene.gameOverLapsText.setText(`LAPS  ${st.lapsCompleted}`);
  scene.gameOverBestText.setText(`BEST LAP  ${formatLapTime(st.bestLapMs)}`);
  showPhase(scene, 'gameOver');
}

// ---------------------------------------------------------------------------
// Race init
// ---------------------------------------------------------------------------

function startRace(scene) {
  const st = scene.state;
  st.countdownStep = 0;
  st.countdownTimer = 0;
  st.maxRotTimer = 0;
  st.tickAccumulator = 0;
  st.lapNumber = 1;
  st.lapLimitMs = INITIAL_LAP_LIMIT_MS;
  st.lapStartTime = 0;
  st.lapArmed = false;
  st.checkpointHit = false;
  st.bestLapMs = Infinity;
  st.lapsCompleted = 0;
  scene.countdownImg.setCrop(0, 0, 48, 48);
  scene.countdownImg.setDisplayOrigin(24, 24);

  const player = {
    x: MAP1.startposition.x,
    y: MAP1.startposition.y,
    speed: 0,
    speedinc: 0,
    vx: 0,
    vy: 0,
    rotation: MAP1.startrotation,
    rotincdir: 0,
    rotinc: 0,
    character: st.character,
    cpu: false,
    frame: 0,
  };
  st.player = player;

  const karts = [player];
  let aiIdx = 0;
  for (const name of CHARACTERS) {
    if (name === st.character) continue;
    const spawn = MAP1.aistartpositions[aiIdx];
    karts.push({
      x: spawn.x,
      y: spawn.y,
      speed: 0,
      speedinc: 0,
      vx: 0,
      vy: 0,
      rotation: MAP1.startrotation,
      rotincdir: 0,
      rotinc: 0,
      character: name,
      cpu: true,
      aipoint: 0,
      aipointx: 0,
      aipointy: 0,
      frame: 0,
    });
    aiIdx++;
  }
  st.karts = karts;

  // Assign sprite textures to the three fixed sprite objects: index 0 = player, 1,2 = AI.
  for (let i = 0; i < scene.kartSprites.length; i++) {
    const k = karts[i];
    if (k) scene.kartSprites[i].setTexture('atlas', `sprite_${k.character}_smooth.png`);
  }

  scene.countdownImg.setCrop(0, 0, 12, 12);
  showPhase(scene, 'countdown');
}

// ---------------------------------------------------------------------------
// Fixed-timestep physics: 15 FPS
// ---------------------------------------------------------------------------

function stepSimulation(scene, delta, allowInput) {
  const st = scene.state;
  st.tickAccumulator += delta;
  while (st.tickAccumulator >= TICK_MS) {
    st.tickAccumulator -= TICK_MS;
    runOneTick(scene, allowInput);
  }
}

function runOneTick(scene, allowInput) {
  const st = scene.state;
  const c = scene.controls;

  if (allowInput && st.player) {
    const p = st.player;
    // Reference: keydown up -> speedinc=1, down -> speedinc-=0.2, keyup -> speedinc=0.
    // We mirror that with hold-state each tick.
    const gas = c.isHeld('P1_1') || c.isHeld('P1_U');
    const reverse = c.isHeld('P1_2') || c.isHeld('P1_D');
    if (gas) {
      p.speedinc = 1;
    } else if (reverse) {
      p.speedinc = -0.2;
    } else {
      p.speedinc = 0;
    }
    const left = c.isHeld('P1_L');
    const right = c.isHeld('P1_R');
    p.rotincdir = left ? 1 : right ? -1 : 0;
  } else if (st.player) {
    st.player.speedinc = 0;
    st.player.rotincdir = 0;
  }

  for (const kart of st.karts) {
    if (kart.cpu) {
      if (allowInput) aiUpdate(kart);
      else { kart.speedinc = 0; kart.rotincdir = 0; }
    }
    moveKart(scene, kart);
  }
}

function moveKart(scene, kart) {
  const st = scene.state;

  if (kart.rotincdir) {
    kart.rotinc += 2 * kart.rotincdir;
  } else {
    if (kart.rotinc < 0) kart.rotinc = Math.min(0, kart.rotinc + 1);
    if (kart.rotinc > 0) kart.rotinc = Math.max(0, kart.rotinc - 1);
  }
  kart.rotinc = Math.min(kart.rotinc, MAX_ROT_INC);
  kart.rotinc = Math.max(kart.rotinc, -MAX_ROT_INC);

  if (kart.speed) {
    const reverse = kart.speedinc < 0 || (kart.speedinc === 0 && kart.speed < 0);
    kart.rotation += reverse ? -kart.rotinc : kart.rotinc;
  }
  if (kart.rotation < 0) kart.rotation += 360;
  if (kart.rotation > 360) kart.rotation -= 360;

  if (!kart.cpu) {
    if (kart.rotincdir === 0) {
      kart.frame = 0;
    } else {
      const driftActive = st.maxRotTimer > 0 && (Date.now() - st.maxRotTimer) > 800;
      if (kart.rotincdir < 0) {
        kart.frame = (kart.rotinc === -MAX_ROT_INC && driftActive) ? 26 : 24;
      } else {
        kart.frame = (kart.rotinc === MAX_ROT_INC && driftActive) ? 27 : 25;
      }
    }
    if (Math.abs(kart.rotinc) !== MAX_ROT_INC) {
      st.maxRotTimer = 0;
    } else if (st.maxRotTimer === 0) {
      st.maxRotTimer = Date.now();
    }
  }

  kart.speed += kart.speedinc;
  let maxKartSpeed = MAX_SPEED;
  if (kart.cpu) maxKartSpeed *= 0.95;
  if (kart.speed > maxKartSpeed) kart.speed = maxKartSpeed;
  if (kart.speed < -maxKartSpeed / 4) kart.speed = -maxKartSpeed / 4;

  const rad = (kart.rotation * Math.PI) / 180;
  const fx = Math.sin(rad), fy = Math.cos(rad);
  const lx = Math.cos(rad), ly = -Math.sin(rad);

  const vlCur = kart.vx * lx + kart.vy * ly;
  const kick = (kart.rotinc / MAX_ROT_INC) * (Math.abs(kart.speed) / MAX_SPEED) * DRIFT_KICK;
  const vlNew = vlCur * LATERAL_KEEP - kick;

  kart.vx = kart.speed * fx + vlNew * lx;
  kart.vy = kart.speed * fy + vlNew * ly;

  const newX = kart.x + kart.vx;
  const newY = kart.y + kart.vy;

  if (canMoveTo(Math.round(newX), Math.round(newY))) {
    kart.x = newX;
    kart.y = newY;
  } else {
    kart.speed *= -1;
    kart.vx *= -1;
    kart.vy *= -1;
  }
  kart.speed *= 0.9;
}

function canMoveTo(x, y) {
  if (x > MAP1.width - 5 || y > MAP1.height - 5) return false;
  if (x < 4 || y < 4) return false;
  for (const box of MAP1.collision) {
    if (x > box[0] && x < box[0] + box[2] &&
        y > box[1] && y < box[1] + box[3]) {
      return false;
    }
  }
  return true;
}

function aiUpdate(kart) {
  const pts = MAP1.aipoints;
  if (!kart.aipointx) kart.aipointx = pts[kart.aipoint][0];
  if (!kart.aipointy) kart.aipointy = pts[kart.aipoint][1];

  const localX = kart.aipointx - kart.x;
  const localY = kart.aipointy - kart.y;
  const rad = (kart.rotation * Math.PI) / 180;
  const rx = localX * Math.cos(rad) - localY * Math.sin(rad);
  const ry = localX * Math.sin(rad) + localY * Math.cos(rad);
  const angle = (Math.atan2(rx, ry) / Math.PI) * 180;

  if (Math.abs(angle) > 10) {
    if (kart.speed === MAX_SPEED) kart.speedinc = -0.5;
    kart.rotincdir = angle > 0 ? 1 : -1;
  } else {
    kart.rotincdir = 0;
  }
  kart.speedinc = 1;

  const dist = Math.sqrt(localX * localX + localY * localY);
  if (dist < 40) {
    kart.aipoint = (kart.aipoint + 1) % pts.length;
    const np = pts[kart.aipoint];
    kart.aipointx = np[0] + (Math.random() - 0.5) * 10;
    kart.aipointy = np[1] + (Math.random() - 0.5) * 10;
  }
}

// ---------------------------------------------------------------------------
// Render: Mode-7 scanlines + billboarded sprites
// ---------------------------------------------------------------------------

function renderTrack(scene) {
  const st = scene.state;
  const player = st.player;
  if (!player) return;

  const viewCtx = scene.viewCtx;
  const screenCtx = scene.screenCtx;
  const mapRect = scene.mapFrameRect;

  // 1) View canvas: draw rotated/translated map from player POV.
  viewCtx.save();
  viewCtx.fillStyle = '#3f6b1f';
  viewCtx.fillRect(0, 0, VIEW_CANVAS_W, VIEW_CANVAS_H);
  viewCtx.translate(VIEW_CANVAS_W / 2, VIEW_CANVAS_H - VIEW_Y_OFFSET);
  viewCtx.rotate(((180 + player.rotation) * Math.PI) / 180);
  viewCtx.drawImage(scene.atlasImg, mapRect.x, mapRect.y, mapRect.w, mapRect.h, -player.x, -player.y, mapRect.w, mapRect.h);
  viewCtx.restore();

  // 2) Screen canvas: compose scanlines with horizontal perspective scale.
  const screenH = scene.screenTex.getSourceImage().height;
  screenCtx.fillStyle = '#f8e890';
  screenCtx.fillRect(0, 0, scene.screenTex.getSourceImage().width, screenH);

  for (const strip of scene.strips) {
    try {
      screenCtx.drawImage(
        scene.viewTex.getSourceImage(),
        VIEW_CANVAS_W / 2 - strip.stripwidth / 2,
        (VIEW_CANVAS_H - VIEW_Y_OFFSET - strip.mapz) - 1,
        strip.stripwidth,
        strip.mapzspan,
        0,
        (VIEW_H - strip.viewy) / LINE_SCALE,
        VIEW_W / LINE_SCALE,
        1
      );
    } catch (_) { /* out-of-bounds source slices throw silently — reference does the same */ }
  }

  scene.viewTex.refresh();
  scene.screenTex.refresh();

  // 3) Parallax backgrounds — their tilePositionX scrolls with player rotation.
  // Reference: iScroll = rot * (iLayerWidth/2 * iScreenScale) / 360. Since our TileSprite has its own
  // natural width, we can just map rotation-degrees to texture pixels proportionally.
  const rotNorm = ((Math.round(-player.rotation) % 360) + 360) % 360;
  scene.hills.tilePositionX = (rotNorm / 360) * 360;
  scene.trees.tilePositionX = (rotNorm / 360) * 720;

  // 4) Billboarded opponent sprites.
  // Reference: fSpriteScale = iScreenScale/4 with iScreenScale=4 → 1. Here the equivalent
  // scale factor between the 80-virtual-pixel-wide world and our 800-wide display is 10,
  // so fSpriteScale = 10/4 = 2.5. Sprites use center-of-image origin (reference sets
  // top = iY - fSpriteSize/2), matching Phaser origin (0.5, 0.5).
  const baseSpriteScale = (GAME_WIDTH / VIEW_W) / 4; // 2.5
  const originX = scene.renderOrigin.x;
  const originY = scene.renderOrigin.y;
  const renderW = scene.renderSize.w;
  const renderH = scene.renderSize.h;

  for (let i = 0; i < scene.kartSprites.length; i++) {
    scene.kartSprites[i].setVisible(false);
  }

  const opponents = st.karts.filter((k) => k.cpu);
  let spriteIdx = 1; // 0 reserved for player (drawn below)
  for (const kart of opponents) {
    const camX = -(player.x - kart.x);
    const camY = -(player.y - kart.y);
    const rad = (player.rotation * Math.PI) / 180;
    const tx = camX * Math.cos(rad) - camY * Math.sin(rad);
    const ty = camX * Math.sin(rad) + camY * Math.cos(rad);

    if (ty + CAM_DIST <= 1) continue; // behind or degenerate

    const deltaY = -CAM_HEIGHT;
    const deltaX = CAM_DIST + ty;
    const viewY = (deltaY / deltaX) * CAM_DIST + CAM_HEIGHT - CAM_VIEW_HEIGHT;
    const viewX = -(tx / (ty + CAM_DIST)) * CAM_DIST;

    let angleDelta = player.rotation - kart.rotation;
    while (angleDelta < 0) angleDelta += 360;
    while (angleDelta > 360) angleDelta -= 360;
    let frame = Math.round(angleDelta / (360 / 22));
    if (frame === 22) frame = 0;

    const depthScale = F_FOCAL / (F_FOCAL + ty);

    // Off-screen cull (reference: hide when iY > iHeight*iScreenScale or iY < 6*iScreenScale)
    if (viewY < 6 || viewY > VIEW_H) continue;

    const screenX = VIEW_W / 2 + viewX;
    const screenY = VIEW_H - viewY;
    const pxX = originX + (screenX / VIEW_W) * renderW;
    const pxY = originY + (screenY / VIEW_H) * renderH;

    const sprite = scene.kartSprites[spriteIdx++];
    if (!sprite) continue;
    sprite.setTexture('atlas', `sprite_${kart.character}_smooth.png`);
    sprite.setCrop(frame * 32, 0, 32, 32);
    sprite.setOrigin(0.5, 0.5);
    sprite.setDisplayOrigin(frame * 32 + 16, 16);
    sprite.setScale(baseSpriteScale * depthScale);
    sprite.setPosition(pxX, pxY);
    sprite.setDepth(20 + Math.round(10000 - ty));
    sprite.setVisible(true);
  }

  // Player sprite — centered, offset like reference's iViewYOffset from the bottom of the view.
  const playerSprite = scene.kartSprites[0];
  if (playerSprite) {
    playerSprite.setTexture('atlas', `sprite_${player.character}_smooth.png`);
    playerSprite.setCrop(player.frame * 32, 0, 32, 32);
    playerSprite.setOrigin(0.5, 0.5);
    playerSprite.setDisplayOrigin(player.frame * 32 + 16, 16);
    playerSprite.setScale(baseSpriteScale);
    const px = originX + renderW / 2;
    const py = originY + ((VIEW_H - VIEW_Y_OFFSET) / VIEW_H) * renderH;
    playerSprite.setPosition(px, py);
    playerSprite.setDepth(9000);
    playerSprite.setVisible(true);
  }
}

// ---------------------------------------------------------------------------
// Controls — arcade-key abstraction. Supports held/edge queries.
// ---------------------------------------------------------------------------

function createControls(scene) {
  const held = {};
  const pressedQueue = [];

  const keydown = (e) => {
    const key = normalizeIncomingKey(e.key);
    const arcade = KEYBOARD_TO_ARCADE[key];
    if (!arcade) return;
    if (!held[arcade]) pressedQueue.push(arcade);
    held[arcade] = true;
  };
  const keyup = (e) => {
    const key = normalizeIncomingKey(e.key);
    const arcade = KEYBOARD_TO_ARCADE[key];
    if (!arcade) return;
    held[arcade] = false;
  };

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  scene.events.once('shutdown', () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
  });
  scene.events.once('destroy', () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
  });

  return {
    isHeld(code) {
      return !!held[code];
    },
    consumeAny(codes) {
      for (let i = 0; i < pressedQueue.length; i++) {
        if (codes.indexOf(pressedQueue[i]) !== -1) {
          pressedQueue.splice(i, 1);
          return true;
        }
      }
      return false;
    },
    menuAxis() {
      // Read+consume single-press horizontal axis.
      for (let i = 0; i < pressedQueue.length; i++) {
        const k = pressedQueue[i];
        if (k === 'P1_L' || k === 'P2_L') { pressedQueue.splice(i, 1); return -1; }
        if (k === 'P1_R' || k === 'P2_R') { pressedQueue.splice(i, 1); return 1; }
      }
      return 0;
    },
  };
}
