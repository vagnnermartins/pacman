(() => {
  const TILE = 20;
  const COLS = 14;
  const ROWS = 15;

  const EMPTY = 0, WALL = 1, PELLET = 2, POWER = 3;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlay-text');

  // --- Build maze ---
  function buildMaze() {
    const map = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const border = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
        row.push(border ? WALL : PELLET);
      }
      map.push(row);
    }
    // interior 2x2 wall blocks, spaced in a lattice
    const blockRows = [2, 6, 10];
    const blockCols = [2, 5, 8, 11];
    for (const br of blockRows) {
      for (const bc of blockCols) {
        for (let dr = 0; dr < 2; dr++) {
          for (let dc = 0; dc < 2; dc++) {
            const r = br + dr, c = bc + dc;
            if (r < ROWS - 1 && c < COLS - 1) map[r][c] = WALL;
          }
        }
      }
    }
    // ghost house in the center
    const houseR = 6, houseC = 5;
    for (let r = houseR; r <= houseR + 2; r++) {
      for (let c = houseC; c <= houseC + 3; c++) {
        map[r][c] = EMPTY;
      }
    }
    // power pellets near the four corners
    const corners = [[1, 1], [1, COLS - 2], [ROWS - 2, 1], [ROWS - 2, COLS - 2]];
    for (const [r, c] of corners) map[r][c] = POWER;
    return map;
  }

  let maze = buildMaze();
  let pelletsLeft = 0;
  function countPellets() {
    let n = 0;
    for (const row of maze) for (const cell of row) if (cell === PELLET || cell === POWER) n++;
    return n;
  }

  function isWall(c, r) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
    return maze[r][c] === WALL;
  }

  const DIRS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };

  const PAC_START = { c: 6, r: 11 };
  const GHOST_COLORS = ['#ff3b3b', '#ffb8ff', '#00ffff', '#ffb852'];
  const GHOST_STARTS = [
    { c: 6, r: 7 }, { c: 7, r: 7 }, { c: 6, r: 8 }, { c: 7, r: 8 },
  ];

  let pac, ghosts, score, lives, frightTimer, running, gameOverState;
  const SPEED = 6.0; // tiles per second
  const FRIGHT_TIME = 6;

  function resetEntities() {
    pac = {
      c: PAC_START.c, r: PAC_START.r, x: PAC_START.c, y: PAC_START.r,
      dir: null, nextDir: 'left', frac: 0,
    };
    ghosts = GHOST_STARTS.map((s, i) => ({
      c: s.c, r: s.r, x: s.c, y: s.r,
      dir: 'up', frac: 0, color: GHOST_COLORS[i], frightened: false,
    }));
    frightTimer = 0;
  }

  function resetGame() {
    maze = buildMaze();
    pelletsLeft = countPellets();
    score = 0;
    lives = 3;
    gameOverState = null;
    resetEntities();
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = `Pontos: ${score}`;
    livesEl.textContent = `Vidas: ${lives}`;
  }

  function canMove(c, r, dir) {
    const d = DIRS[dir];
    let nc = c + d.dx;
    const nr = r + d.dy;
    if (nc < 0) nc = COLS - 1;
    if (nc > COLS - 1) nc = 0;
    return !isWall(nc, nr);
  }

  function wrapCol(c) {
    if (c < 0) return COLS - 1;
    if (c > COLS - 1) return 0;
    return c;
  }

  // Moves an entity cell-by-cell. While frac is 0 the entity sits exactly on
  // a grid cell, so wall checks always happen on a clean integer position
  // instead of relying on float comparisons mid-tile.
  function advance(entity, speed, dt, onArrive) {
    if (entity.frac === 0) {
      let dir = entity.dir;
      if (entity.nextDir && canMove(entity.c, entity.r, entity.nextDir)) {
        dir = entity.nextDir;
      }
      if (!dir || !canMove(entity.c, entity.r, dir)) {
        entity.dir = dir;
        entity.x = entity.c;
        entity.y = entity.r;
        return;
      }
      entity.dir = dir;
    }
    entity.frac += speed * dt;
    if (entity.frac >= 1) {
      entity.frac = 0;
      const d = DIRS[entity.dir];
      entity.c = wrapCol(entity.c + d.dx);
      entity.r = entity.r + d.dy;
      entity.x = entity.c;
      entity.y = entity.r;
      if (onArrive) onArrive();
      return;
    }
    const d = DIRS[entity.dir];
    let x = entity.c + d.dx * entity.frac;
    if (d.dx !== 0) {
      // render smoothly across the wrap seam at the edges
      if (entity.c === COLS - 1 && d.dx > 0) x = entity.c + entity.frac;
      else if (entity.c === 0 && d.dx < 0) x = entity.c - entity.frac;
    }
    entity.x = x;
    entity.y = entity.r + d.dy * entity.frac;
  }

  function updatePac(dt) {
    advance(pac, SPEED, dt, () => {
      const cell = maze[pac.r][pac.c];
      if (cell === PELLET || cell === POWER) {
        maze[pac.r][pac.c] = EMPTY;
        pelletsLeft--;
        score += cell === POWER ? 50 : 10;
        if (cell === POWER) {
          frightTimer = FRIGHT_TIME;
          ghosts.forEach(g => g.frightened = true);
        }
        updateHud();
        if (pelletsLeft <= 0) {
          gameOverState = 'win';
        }
      }
    });
  }

  function chooseGhostDir(g) {
    const opts = ['up', 'down', 'left', 'right'].filter(dir => {
      if (DIRS[dir].dx === -DIRS[g.dir].dx && DIRS[dir].dy === -DIRS[g.dir].dy) return false;
      return canMove(g.c, g.r, dir);
    });
    if (opts.length === 0) return Object.keys(DIRS).find(dir => canMove(g.c, g.r, dir)) || g.dir;
    if (g.frightened) {
      return opts[Math.floor(Math.random() * opts.length)];
    }
    let best = opts[0], bestDist = Infinity;
    for (const dir of opts) {
      const d = DIRS[dir];
      const nc = g.c + d.dx, nr = g.r + d.dy;
      const dist = (nc - pac.c) ** 2 + (nr - pac.r) ** 2;
      if (dist < bestDist) { bestDist = dist; best = dir; }
    }
    return best;
  }

  function updateGhost(g, dt, speed) {
    if (g.frac === 0) {
      g.nextDir = chooseGhostDir(g);
    }
    advance(g, speed, dt);
  }

  function checkCollisions() {
    for (const g of ghosts) {
      const dist = Math.hypot(g.x - pac.x, g.y - pac.y);
      if (dist < 0.5) {
        if (g.frightened) {
          g.frightened = false;
          g.c = GHOST_STARTS[ghosts.indexOf(g)].c;
          g.r = GHOST_STARTS[ghosts.indexOf(g)].r;
          g.x = g.c; g.y = g.r;
          score += 200;
          updateHud();
        } else {
          lives--;
          updateHud();
          if (lives <= 0) {
            gameOverState = 'lose';
          } else {
            resetEntities();
          }
        }
      }
    }
  }

  function update(dt) {
    if (!running || gameOverState) return;
    if (frightTimer > 0) {
      frightTimer -= dt;
      if (frightTimer <= 0) {
        frightTimer = 0;
        ghosts.forEach(g => g.frightened = false);
      }
    }
    updatePac(dt);
    const ghostSpeed = SPEED * 0.78;
    for (const g of ghosts) updateGhost(g, dt, g.frightened ? ghostSpeed * 0.6 : ghostSpeed);
    checkCollisions();
    if (gameOverState) showOverlay();
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = maze[r][c];
        const x = c * TILE, y = r * TILE;
        if (cell === WALL) {
          ctx.fillStyle = '#1e1eff';
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        } else if (cell === PELLET) {
          ctx.fillStyle = '#ffd';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === POWER) {
          ctx.fillStyle = '#ffd';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // pac-man
    const px = pac.x * TILE + TILE / 2, py = pac.y * TILE + TILE / 2;
    const angles = { right: 0, down: 90, left: 180, up: 270 };
    const mouth = 0.25 * Math.PI * (0.5 + 0.5 * Math.sin(performance.now() / 80));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((angles[pac.dir] * Math.PI) / 180);
    ctx.fillStyle = '#ffd400';
    ctx.beginPath();
    ctx.arc(0, 0, TILE / 2 - 1, mouth, Math.PI * 2 - mouth);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    // ghosts
    for (const g of ghosts) {
      const gx = g.x * TILE + TILE / 2, gy = g.y * TILE + TILE / 2;
      ctx.fillStyle = g.frightened ? '#3b3bff' : g.color;
      ctx.beginPath();
      ctx.arc(gx, gy, TILE / 2 - 1, Math.PI, 0);
      ctx.lineTo(gx + TILE / 2 - 1, gy + TILE / 2 - 1);
      ctx.lineTo(gx - TILE / 2 + 1, gy + TILE / 2 - 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(gx - 4, gy - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(gx + 4, gy - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function showOverlay() {
    running = false;
    if (gameOverState === 'win') overlayText.textContent = 'Você venceu! Toque para jogar de novo';
    else if (gameOverState === 'lose') overlayText.textContent = `Fim de jogo. Pontos: ${score}. Toque para reiniciar`;
    else overlayText.textContent = 'Toque ou pressione uma tecla para começar';
    overlay.classList.remove('hidden');
  }

  function startGame() {
    if (gameOverState) resetGame();
    overlay.classList.add('hidden');
    running = true;
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // --- Input ---
  const KEY_MAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
  };

  window.addEventListener('keydown', (e) => {
    const dir = KEY_MAP[e.key];
    if (dir) {
      e.preventDefault();
      pac.nextDir = dir;
      if (!running) startGame();
    }
  });

  overlay.addEventListener('click', startGame);

  document.querySelectorAll('#touch-controls button').forEach(btn => {
    btn.addEventListener('click', () => {
      pac.nextDir = btn.dataset.dir;
      if (!running) startGame();
    });
  });

  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      pac.nextDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
    touchStart = null;
    if (!running) startGame();
  }, { passive: true });

  // --- Init ---
  resetGame();
  showOverlay();
  requestAnimationFrame(loop);
})();
