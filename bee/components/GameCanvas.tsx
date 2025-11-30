import React, { useRef, useEffect, useCallback } from 'react';
import { 
  GameState, 
  Player, 
  Enemy, 
  Bullet, 
  Particle,
  GameStatus 
} from '../types';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  PLAYER_SPEED, 
  BULLET_SPEED, 
  ENEMY_SPEED, 
  ENEMY_DROP_DISTANCE,
  SHOOT_COOLDOWN,
  COLORS,
  PLAYER_SIZE,
  ENEMY_SIZE,
  BULLET_SIZE,
  SPAWN_GRID
} from '../constants';

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Game State Ref (Mutable for performance in loop)
  const stateRef = useRef<GameState>({
    player: {
      id: 'player',
      position: { x: GAME_WIDTH / 2 - PLAYER_SIZE.width / 2, y: GAME_HEIGHT - 60 },
      width: PLAYER_SIZE.width,
      height: PLAYER_SIZE.height,
      velocity: { x: 0, y: 0 },
      color: COLORS.PLAYER,
      markedForDeletion: false,
      cooldown: 0
    },
    bullets: [],
    enemies: [],
    particles: [],
    score: 0,
    lastTime: 0,
    enemyDirection: 1,
    gameOver: false
  });

  // Initialize Enemies
  const initEnemies = () => {
    const enemies: Enemy[] = [];
    for (let row = 0; row < SPAWN_GRID.rows; row++) {
      for (let col = 0; col < SPAWN_GRID.cols; col++) {
        const type = row === 0 ? 'QUEEN' : row === 1 ? 'HORNET' : 'BEE';
        const color = type === 'QUEEN' ? COLORS.QUEEN : type === 'HORNET' ? COLORS.HORNET : COLORS.BEE;
        const scoreValue = type === 'QUEEN' ? 300 : type === 'HORNET' ? 200 : 100;
        
        enemies.push({
          id: `enemy-${row}-${col}`,
          position: {
            x: SPAWN_GRID.startX + col * SPAWN_GRID.spacingX,
            y: SPAWN_GRID.startY + row * SPAWN_GRID.spacingY
          },
          width: ENEMY_SIZE.width,
          height: ENEMY_SIZE.height,
          velocity: { x: ENEMY_SPEED, y: 0 },
          color,
          markedForDeletion: false,
          type,
          scoreValue,
          wobbleOffset: Math.random() * Math.PI * 2
        });
      }
    }
    return enemies;
  };

  // Helper: Create explosion particles
  const createExplosion = (x: number, y: number, color: string) => {
    const particles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const speed = Math.random() * 100 + 50;
      particles.push({
        id: `p-${Date.now()}-${i}`,
        position: { x, y },
        width: 3,
        height: 3,
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        color: color,
        markedForDeletion: false,
        life: 1.0,
        maxLife: 1.0
      });
    }
    return particles;
  };

  // Helper: AABB Collision
  const checkCollision = (rect1: {x: number, y: number, w: number, h: number}, rect2: {x: number, y: number, w: number, h: number}) => {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  };

  const update = (time: number) => {
    const state = stateRef.current;
    if (state.gameOver) return;

    const dt = (time - state.lastTime) / 1000;
    state.lastTime = time;

    // 1. Update Player
    if (keysPressed.current['ArrowLeft']) {
      state.player.position.x -= PLAYER_SPEED * dt;
    }
    if (keysPressed.current['ArrowRight']) {
      state.player.position.x += PLAYER_SPEED * dt;
    }
    // Clamp player
    state.player.position.x = Math.max(0, Math.min(GAME_WIDTH - state.player.width, state.player.position.x));

    // Player Shooting
    if (state.player.cooldown > 0) state.player.cooldown -= dt;
    if (keysPressed.current[' '] && state.player.cooldown <= 0) {
      state.bullets.push({
        id: `bullet-${Date.now()}`,
        position: { 
          x: state.player.position.x + state.player.width / 2 - BULLET_SIZE.width / 2, 
          y: state.player.position.y 
        },
        width: BULLET_SIZE.width,
        height: BULLET_SIZE.height,
        velocity: { x: 0, y: -BULLET_SPEED },
        color: COLORS.PLAYER_BULLET,
        markedForDeletion: false,
        owner: 'PLAYER'
      });
      state.player.cooldown = SHOOT_COOLDOWN;
    }

    // 2. Update Enemies
    let hitEdge = false;
    let lowestEnemyY = 0;

    state.enemies.forEach(enemy => {
      enemy.position.x += state.enemyDirection * ENEMY_SPEED * dt;
      // Simple wobble effect
      enemy.position.y += Math.sin(time / 200 + enemy.wobbleOffset) * 0.5;

      if (enemy.position.x <= 0 || enemy.position.x + enemy.width >= GAME_WIDTH) {
        hitEdge = true;
      }
      lowestEnemyY = Math.max(lowestEnemyY, enemy.position.y + enemy.height);

      // Randomly shoot
      if (Math.random() < 0.0005) { // Very simple random shooting logic
         state.bullets.push({
          id: `e-bullet-${enemy.id}-${Date.now()}`,
          position: { 
            x: enemy.position.x + enemy.width / 2, 
            y: enemy.position.y + enemy.height 
          },
          width: BULLET_SIZE.width,
          height: BULLET_SIZE.height,
          velocity: { x: 0, y: BULLET_SPEED * 0.6 },
          color: COLORS.ENEMY_BULLET,
          markedForDeletion: false,
          owner: 'ENEMY'
        });
      }
    });

    if (hitEdge) {
      state.enemyDirection *= -1;
      state.enemies.forEach(enemy => {
        enemy.position.y += ENEMY_DROP_DISTANCE;
      });
    }

    // Game Over Condition: Enemy reaches player level
    if (lowestEnemyY >= state.player.position.y) {
      state.gameOver = true;
      onGameOver(state.score);
      return;
    }

    // Win Condition: All enemies dead -> Respawn
    if (state.enemies.length === 0) {
        state.enemies = initEnemies();
        // Increase difficulty slightly?
    }

    // 3. Update Bullets
    state.bullets.forEach(bullet => {
      bullet.position.y += bullet.velocity.y * dt;
      
      // Cleanup off-screen
      if (bullet.position.y < 0 || bullet.position.y > GAME_HEIGHT) {
        bullet.markedForDeletion = true;
      }
    });

    // 4. Collision Detection
    state.bullets.forEach(bullet => {
      if (bullet.markedForDeletion) return;

      if (bullet.owner === 'PLAYER') {
        state.enemies.forEach(enemy => {
          if (enemy.markedForDeletion) return;
          if (checkCollision(
            {x: bullet.position.x, y: bullet.position.y, w: bullet.width, h: bullet.height},
            {x: enemy.position.x, y: enemy.position.y, w: enemy.width, h: enemy.height}
          )) {
            enemy.markedForDeletion = true;
            bullet.markedForDeletion = true;
            state.score += enemy.scoreValue;
            onScoreUpdate(state.score);
            state.particles.push(...createExplosion(enemy.position.x + enemy.width/2, enemy.position.y + enemy.height/2, enemy.color));
          }
        });
      } else {
        // Enemy bullet hits player
        if (checkCollision(
            {x: bullet.position.x, y: bullet.position.y, w: bullet.width, h: bullet.height},
            {x: state.player.position.x, y: state.player.position.y, w: state.player.width, h: state.player.height}
        )) {
            state.gameOver = true;
            bullet.markedForDeletion = true;
            state.particles.push(...createExplosion(state.player.position.x + state.player.width/2, state.player.position.y + state.player.height/2, COLORS.PLAYER));
            onGameOver(state.score);
        }
      }
    });

    // 5. Update Particles
    state.particles.forEach(p => {
        p.life -= dt * 2; // Fade out speed
        p.position.x += p.velocity.x * dt;
        p.position.y += p.velocity.y * dt;
        if (p.life <= 0) p.markedForDeletion = true;
    });

    // Cleanup
    state.bullets = state.bullets.filter(b => !b.markedForDeletion);
    state.enemies = state.enemies.filter(e => !e.markedForDeletion);
    state.particles = state.particles.filter(p => !p.markedForDeletion);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const state = stateRef.current;

    // Draw Player
    if (!state.gameOver) {
      ctx.fillStyle = state.player.color;
      // Simple ship shape
      ctx.beginPath();
      ctx.moveTo(state.player.position.x + state.player.width / 2, state.player.position.y);
      ctx.lineTo(state.player.position.x + state.player.width, state.player.position.y + state.player.height);
      ctx.lineTo(state.player.position.x + state.player.width / 2, state.player.position.y + state.player.height - 10);
      ctx.lineTo(state.player.position.x, state.player.position.y + state.player.height);
      ctx.closePath();
      ctx.fill();
    }

    // Draw Enemies
    state.enemies.forEach(enemy => {
      ctx.fillStyle = enemy.color;
      // Simple "Bee" shape: Rectangle with wings
      const x = enemy.position.x;
      const y = enemy.position.y;
      const w = enemy.width;
      const h = enemy.height;
      
      // Body
      ctx.fillRect(x + w * 0.25, y, w * 0.5, h);
      // Wings (animate slightly)
      const wingFlap = Math.sin(Date.now() / 100) * 5;
      ctx.fillStyle = '#ffffffaa';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y + h * 0.3);
      ctx.lineTo(x - 5, y + h * 0.1 + wingFlap);
      ctx.lineTo(x + w * 0.25, y + h * 0.6);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x + w * 0.75, y + h * 0.3);
      ctx.lineTo(x + w + 5, y + h * 0.1 + wingFlap);
      ctx.lineTo(x + w * 0.75, y + h * 0.6);
      ctx.fill();
    });

    // Draw Bullets
    state.bullets.forEach(bullet => {
      ctx.fillStyle = bullet.color;
      ctx.fillRect(bullet.position.x, bullet.position.y, bullet.width, bullet.height);
    });

    // Draw Particles
    state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.position.x, p.position.y, p.width, p.height);
        ctx.globalAlpha = 1.0;
    });
  };

  const loop = useCallback((time: number) => {
    update(time);
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, []); // Dependencies are empty because we use refs for state

  useEffect(() => {
    // Start Game
    stateRef.current.enemies = initEnemies();
    stateRef.current.score = 0;
    stateRef.current.gameOver = false;
    stateRef.current.lastTime = performance.now();
    stateRef.current.particles = [];
    stateRef.current.bullets = [];

    requestRef.current = requestAnimationFrame(loop);

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [loop]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      className="w-full h-full object-contain bg-black"
    />
  );
};

export default GameCanvas;