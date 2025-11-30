export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Entity {
  id: string;
  position: Point;
  width: number;
  height: number;
  velocity: Point;
  color: string;
  markedForDeletion: boolean;
}

export interface Player extends Entity {
  cooldown: number;
}

export interface Enemy extends Entity {
  type: 'BEE' | 'HORNET' | 'QUEEN';
  scoreValue: number;
  wobbleOffset: number;
}

export interface Bullet extends Entity {
  owner: 'PLAYER' | 'ENEMY';
}

export interface Particle extends Entity {
  life: number; // 0 to 1
  maxLife: number;
}

export interface GameState {
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  score: number;
  lastTime: number;
  enemyDirection: number; // 1 for right, -1 for left
  gameOver: boolean;
}