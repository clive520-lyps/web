export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const PLAYER_SPEED = 300; // pixels per second
export const BULLET_SPEED = 500;
export const ENEMY_SPEED = 60;
export const ENEMY_DROP_DISTANCE = 20;
export const SHOOT_COOLDOWN = 0.25; // seconds

export const PLAYER_SIZE = { width: 40, height: 40 };
export const ENEMY_SIZE = { width: 30, height: 30 };
export const BULLET_SIZE = { width: 4, height: 12 };

export const COLORS = {
  PLAYER: '#3b82f6', // blue-500
  PLAYER_BULLET: '#60a5fa', // blue-400
  ENEMY_BULLET: '#f87171', // red-400
  BEE: '#fbbf24', // amber-400
  HORNET: '#f97316', // orange-500
  QUEEN: '#ef4444', // red-500
  PARTICLE: '#fef08a' // yellow-200
};

export const SPAWN_GRID = {
  rows: 4,
  cols: 8,
  spacingX: 60,
  spacingY: 50,
  startX: 100,
  startY: 80
};