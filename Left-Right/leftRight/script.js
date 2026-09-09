(() => {
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const PLAYER_Y = H - 60;
  const PLAYER_W = 28;
  const PLAYER_H = 32;
  const PLAYER_MARGIN = 16;
  const MOVE_ACCEL = 0.9;
  const MOVE_MAX_SPEED = 6.5;
  const FRICTION = 0.85;
  const VERTICAL_SCALE = 0.55; // slows the on-screen fall rate so reaction time stays fair
  const DISTANCE_PER_FRAME = 0.045; // meters gained per unit of scroll speed
  const PX_PER_METER = 1 / DISTANCE_PER_FRAME;
  const FINISH_FALL_SPEED = 4.5; // how fast the player skis off the bottom after crossing the line

  const DIFFICULTIES = {
    facil: {
      target: 600,
      baseSpeed: 1.8,
      maxSpeed: 4.0,
      speedRamp: 0.04,
      spawnBase: 950,
      spawnMin: 420,
      spawnRand: 300,
      emberChance: 0.35,
    },
    medio: {
      target: 1000,
      baseSpeed: 2.6,
      maxSpeed: 6.5,
      speedRamp: 0.10,
      spawnBase: 700,
      spawnMin: 260,
      spawnRand: 220,
      emberChance: 0.5,
    },
    dificil: {
      target: 1400,
      baseSpeed: 3.2,
      maxSpeed: 8.0,
      speedRamp: 0.14,
      spawnBase: 520,
      spawnMin: 170,
      spawnRand: 160,
      emberChance: 0.6,
    },
  };

  let TARGET_DISTANCE, BASE_SPEED, MAX_SPEED, SPEED_RAMP, SPAWN_BASE, SPAWN_MIN, SPAWN_RAND, EMBER_CHANCE;
  let difficulty = 'medio';

  const distanceEl = document.getElementById('distance');
  const bestEl = document.getElementById('best');
  const targetEl = document.getElementById('target');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayBtn = document.getElementById('overlay-btn');
  const overlayMenuBtn = document.getElementById('overlay-menu-btn');
  const menuOverlay = document.getElementById('menu-overlay');
  const menuStartBtn = document.getElementById('menu-start-btn');
  const diffButtons = document.querySelectorAll('.diff-btn');

  function applyDifficulty(level) {
    difficulty = level;
    const cfg = DIFFICULTIES[level];
    TARGET_DISTANCE = cfg.target;
    BASE_SPEED = cfg.baseSpeed;
    MAX_SPEED = cfg.maxSpeed;
    SPEED_RAMP = cfg.speedRamp;
    SPAWN_BASE = cfg.spawnBase;
    SPAWN_MIN = cfg.spawnMin;
    SPAWN_RAND = cfg.spawnRand;
    EMBER_CHANCE = cfg.emberChance;
    targetEl.textContent = TARGET_DISTANCE + 'm';

    diffButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.difficulty === level);
    });
  }

  applyDifficulty(difficulty);

  let best = Number(localStorage.getItem('fuga-do-vulcao-best') || 0);
  bestEl.textContent = best + 'm';

  let player, obstacles, speed, distance, state, rafId, spawnTimer, lastTime, finishLineY;
  let movingLeft = false;
  let movingRight = false;
  let dragX = null; // when set (touch/mouse drag), player follows this x directly
  // state: 'menu' | 'running' | 'finishing' | 'won' | 'lost'

  function resetState() {
    player = {
      x: W / 2 - PLAYER_W / 2,
      y: PLAYER_Y,
      w: PLAYER_W,
      h: PLAYER_H,
      vx: 0,
    };
    obstacles = [];
    speed = BASE_SPEED;
    distance = 0;
    spawnTimer = 0;
    finishLineY = PLAYER_Y - TARGET_DISTANCE * PX_PER_METER * VERTICAL_SCALE;
    distanceEl.textContent = '0m';
    dragX = null;
    state = 'menu';
  }

  function spawnObstacle() {
    const kind = Math.random() < 1 - EMBER_CHANCE ? 'rock' : 'ember';
    const minX = PLAYER_MARGIN;
    const maxX = W - PLAYER_MARGIN;
    if (kind === 'rock') {
      const w = 22 + Math.random() * 12;
      const h = 20 + Math.random() * 14;
      obstacles.push({
        type: 'rock',
        x: minX + Math.random() * (maxX - minX - w),
        y: -h - 10,
        w,
        h,
      });
    } else {
      const size = 20;
      obstacles.push({
        type: 'ember',
        x: minX + Math.random() * (maxX - minX - size),
        y: -size - 10,
        w: size,
        h: size,
        drift: (Math.random() - 0.5) * 1.4,
      });
    }
  }

  function drawBackground() {
    // solid flat backdrop for the whole play field, no gradient/horizon split
    ctx.fillStyle = '#0d0b18';
    ctx.fillRect(0, 0, W, H);
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowColor = '#05d9e8';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#f4efe1';
    roundRect(0, 0, player.w, player.h, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    // simple face dot, leaning toward the direction of movement
    ctx.fillStyle = '#1b1030';
    const lean = player.vx > 0.5 ? player.w - 7 : player.vx < -0.5 ? 7 : player.w / 2;
    ctx.beginPath();
    ctx.arc(lean, 9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFinishLine() {
    if (finishLineY < -20 || finishLineY > H + 20) return;

    // neon checkered bar marking the end of the run
    ctx.shadowColor = '#05d9e8';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#05d9e8';
    ctx.fillRect(0, finishLineY - 3, W, 6);
    ctx.shadowBlur = 0;

    const squares = 12;
    const sq = W / squares;
    for (let i = 0; i < squares; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ff2d95' : '#ffe45e';
      ctx.fillRect(i * sq, finishLineY + 3, sq, 12);
    }
  }

  function drawObstacles() {
    obstacles.forEach(ob => {
      if (ob.type === 'rock') {
        ctx.fillStyle = '#5a5270';
        roundRect(ob.x, ob.y, ob.w, ob.h, 4);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.arc(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb347';
        ctx.beginPath();
        ctx.arc(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function updatePlayerMovement() {
    if (dragX !== null) {
      const target = dragX - player.w / 2;
      player.x += (target - player.x) * 0.35;
      player.vx = 0;
    } else {
      if (movingLeft) player.vx -= MOVE_ACCEL;
      if (movingRight) player.vx += MOVE_ACCEL;
      if (!movingLeft && !movingRight) player.vx *= FRICTION;
      player.vx = Math.max(-MOVE_MAX_SPEED, Math.min(MOVE_MAX_SPEED, player.vx));
      player.x += player.vx;
    }
    const minX = PLAYER_MARGIN;
    const maxX = W - PLAYER_MARGIN - player.w;
    if (player.x < minX) {
      player.x = minX;
      player.vx = 0;
    } else if (player.x > maxX) {
      player.x = maxX;
      player.vx = 0;
    }
  }

  function update(dt) {
    if (state === 'finishing') {
      return updateFinishing();
    }

    updatePlayerMovement();

    // speed ramps up over time, capped
    speed = Math.min(MAX_SPEED, speed + SPEED_RAMP);
    const fallSpeed = speed * VERTICAL_SCALE;

    // move obstacles downward
    obstacles.forEach(ob => {
      ob.y += fallSpeed;
      if (ob.drift) ob.x += ob.drift;
    });
    obstacles = obstacles.filter(ob => ob.y < H + 20);

    // spawn logic: interval shrinks slightly as speed increases
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const base = SPAWN_BASE - speed * 45;
      spawnTimer = Math.max(SPAWN_MIN, base + Math.random() * SPAWN_RAND);
    }

    // distance/score
    distance += speed * DISTANCE_PER_FRAME;
    finishLineY += fallSpeed;

    // crossing the finish line: freeze the score at the target and let the
    // player ski off the bottom of the screen before the win overlay appears
    if (finishLineY >= player.y) {
      distance = TARGET_DISTANCE;
      distanceEl.textContent = TARGET_DISTANCE + 'm';
      state = 'finishing';
      return;
    }
    distanceEl.textContent = Math.floor(distance) + 'm';

    // collision check
    const hitbox = { x: player.x + 4, y: player.y + 4, w: player.w - 8, h: player.h - 8 };
    for (const ob of obstacles) {
      if (rectsOverlap(hitbox, ob)) {
        return endGame(false);
      }
    }
  }

  function updateFinishing() {
    updatePlayerMovement();
    player.y += FINISH_FALL_SPEED;

    const fallSpeed = speed * VERTICAL_SCALE;
    obstacles.forEach(ob => (ob.y += fallSpeed));
    obstacles = obstacles.filter(ob => ob.y < H + 20);

    if (player.y > H + 10) {
      return endGame(true);
    }
  }

  function render() {
    drawBackground();
    drawFinishLine();
    drawObstacles();
    drawPlayer();
  }

  function loop(timestamp) {
    if (state !== 'running' && state !== 'finishing') return;
    const dt = lastTime ? timestamp - lastTime : 16;
    lastTime = timestamp;
    update(dt);
    render();
    rafId = requestAnimationFrame(loop);
  }

  function startGame() {
    resetState();
    state = 'running';
    lastTime = 0;
    menuOverlay.classList.add('hidden');
    overlay.classList.add('hidden');
    render();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function showMenu() {
    cancelAnimationFrame(rafId);
    resetState();
    overlay.classList.add('hidden');
    menuOverlay.classList.remove('hidden');
    render();
  }

  function endGame(won) {
    state = won ? 'won' : 'lost';
    cancelAnimationFrame(rafId);

    const finalDistance = Math.floor(distance);
    if (finalDistance > best) {
      best = finalDistance;
      bestEl.textContent = best + 'm';
      localStorage.setItem('fuga-do-vulcao-best', String(best));
    }

    overlayTitle.textContent = won ? 'Você escapou do vulcão! 🌋' : 'A lava te alcançou...';
    overlayText.innerHTML = won
      ? `Você percorreu <strong>${finalDistance}m</strong> e chegou a lugar seguro. Quer fugir de novo, mais rápido?`
      : `Você correu <strong>${finalDistance}m</strong> antes de tropeçar. Toque em reiniciar para tentar de novo.`;
    overlayBtn.textContent = 'Tentar novamente';
    overlay.classList.remove('hidden');
  }

  function restartIfEnded() {
    if (state === 'won' || state === 'lost') {
      startGame();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      movingLeft = true;
      restartIfEnded();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      movingRight = true;
      restartIfEnded();
    } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      restartIfEnded();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      movingLeft = false;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      movingRight = false;
    }
  });

  function canvasX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * W;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (state === 'won' || state === 'lost') {
      startGame();
      return;
    }
    dragX = canvasX(e.clientX);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragX !== null) dragX = canvasX(e.clientX);
  });
  canvas.addEventListener('pointerup', () => {
    dragX = null;
  });
  canvas.addEventListener('pointerleave', () => {
    dragX = null;
  });

  overlayBtn.addEventListener('click', startGame);
  overlayMenuBtn.addEventListener('click', showMenu);
  menuStartBtn.addEventListener('click', startGame);

  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => applyDifficulty(btn.dataset.difficulty));
  });

  // initial paint before first start
  resetState();
  render();
})();
