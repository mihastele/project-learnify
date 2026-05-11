import { CanvasGameConfig, CanvasCharacter } from '../api/types';

export interface GameEntity {
  name: string;
  spriteKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  speed: number;
  active: boolean;
  type: 'hero' | 'enemy' | 'collectible' | 'obstacle';
  behavior?: string;
  vx: number;
  vy: number;
}

interface ButtonDef {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action: string;
}

type GamePhase = 'ready' | 'playing' | 'won' | 'lost';

const SPRITE_COLORS: Record<string, string> = {
  hero_knight: '#4488ff',
  enemy_slime: '#ff4444',
  coin: '#ffcc00',
  spike_trap: '#888888',
  block: '#666666',
  default: '#aaaaaa',
};

export class CanvasGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: CanvasGameConfig;
  private entities: GameEntity[] = [];
  private buttons: ButtonDef[] = [];
  private phase: GamePhase = 'ready';
  private score = 0;
  private lives = 3;
  private timeLeft = 0;
  private animFrameId = 0;
  private lastTime = 0;
  private elapsedTime = 0;
  private keyMap: Record<string, string> = {};

  private onWinCb: (() => void) | null = null;
  private onLoseCb: (() => void) | null = null;
  private onUpdateCb: ((dt: number) => void) | null = null;
  private buttonPressCbs: Record<string, (() => void)[]> = {};
  private buttonReleaseCbs: Record<string, (() => void)[]> = {};

  private touchActive: Record<string, boolean> = {};
  private keysDown: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement, config: CanvasGameConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.lives = config.max_lives ?? 3;
    this.timeLeft = config.time_limit ?? 60;
    this.score = 0;

    this.initButtons();
    this.initInput();
  }

  private initButtons() {
    const uiButtons = this.config.ui?.buttons ?? [];
    this.buttons = uiButtons.map((b) => {
      const [vPos, hPos] = (b.position || 'bottom-center').split('-');
      const size = this.parseButtonSize(b.size || 'medium');
      let x = 10;
      let y = this.canvas.height - size.h - 10;
      if (vPos === 'top') y = 10;
      if (vPos === 'bottom') y = this.canvas.height - size.h - 10;
      if (vPos === 'center') y = this.canvas.height / 2 - size.h / 2;
      if (hPos === 'center' || hPos === 'middle') x = this.canvas.width / 2 - size.w / 2;
      if (hPos === 'right') x = this.canvas.width - size.w - 10;
      return { id: b.id, label: b.label, x, y, width: size.w, height: size.h, action: b.action };
    });
  }

  private parseButtonSize(size: string): { w: number; h: number } {
    switch (size) {
      case 'small': return { w: 80, h: 36 };
      case 'large': return { w: 160, h: 56 };
      default: return { w: 120, h: 44 };
    }
  }

  private initInput() {
    const map = this.config.ui?.buttons?.reduce((acc, b) => {
      acc[b.id] = b.action;
      return acc;
    }, {} as Record<string, string>) ?? {};
    this.keyMap = map;

    const handleKeyDown = (e: KeyboardEvent) => {
      this.keysDown.add(e.key);
      const action = this.keyMap[e.key];
      if (action) this.fireButtonPress(action);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.key);
      const action = this.keyMap[e.key];
      if (action) this.fireButtonRelease(action);
    };

    const getTouchPos = (e: TouchEvent | MouseEvent): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      if ('touches' in e) {
        return {
          x: (e.touches[0]?.clientX ?? 0 - rect.left) * scaleX,
          y: (e.touches[0]?.clientY ?? 0 - rect.top) * scaleY,
        };
      }
      return {
        x: ((e as MouseEvent).clientX - rect.left) * scaleX,
        y: ((e as MouseEvent).clientY - rect.top) * scaleY,
      };
    };

    const handlePointerDown = (e: TouchEvent | MouseEvent) => {
      const pos = getTouchPos(e);
      for (const btn of this.buttons) {
        if (
          pos.x >= btn.x && pos.x <= btn.x + btn.width &&
          pos.y >= btn.y && pos.y <= btn.y + btn.height
        ) {
          this.touchActive[btn.action] = true;
          this.fireButtonPress(btn.action);
        }
      }
    };

    const handlePointerUp = (e: TouchEvent | MouseEvent) => {
      for (const action of Object.keys(this.touchActive)) {
        this.fireButtonRelease(action);
      }
      this.touchActive = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    this.canvas.addEventListener('mousedown', handlePointerDown);
    this.canvas.addEventListener('mouseup', handlePointerUp);
    this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    this.canvas.addEventListener('touchend', handlePointerUp);
  }

  addCharacter(
    type: 'hero' | 'enemy' | 'collectible' | 'obstacle',
    name: string,
    spriteKey: string,
    options: { x?: number; y?: number; size?: number; color?: string; speed?: number; behavior?: string } = {},
  ): GameEntity {
    const size = options.size ?? 30;
    const entity: GameEntity = {
      name,
      spriteKey,
      x: options.x ?? Math.random() * (this.canvas.width - size),
      y: options.y ?? Math.random() * (this.canvas.height / 2),
      width: size,
      height: size,
      color: options.color ?? SPRITE_COLORS[spriteKey] ?? SPRITE_COLORS.default,
      speed: options.speed ?? 2,
      active: true,
      type,
      behavior: options.behavior,
      vx: 0,
      vy: 0,
    };
    this.entities.push(entity);
    return entity;
  }

  spawn(name: string, position: { x: number; y: number }) {
    const entity = this.entities.find((e) => e.name === name);
    if (entity) {
      entity.x = position.x;
      entity.y = position.y;
      entity.active = true;
    }
  }

  setScore(value: number) {
    this.score = value;
  }

  incrementScore(delta: number) {
    this.score += delta;
  }

  setLives(value: number) {
    this.lives = value;
  }

  decrementLives() {
    this.lives = Math.max(0, this.lives - 1);
  }

  mapKeyToButton(key: string, action: string) {
    this.keyMap[key] = action;
  }

  onButtonPress(action: string, callback: () => void) {
    if (!this.buttonPressCbs[action]) this.buttonPressCbs[action] = [];
    this.buttonPressCbs[action].push(callback);
  }

  onButtonRelease(action: string, callback: () => void) {
    if (!this.buttonReleaseCbs[action]) this.buttonReleaseCbs[action] = [];
    this.buttonReleaseCbs[action].push(callback);
  }

  onUpdate(callback: (dt: number) => void) {
    this.onUpdateCb = callback;
  }

  onWin(callback: () => void) {
    this.onWinCb = callback;
  }

  onLose(callback: () => void) {
    this.onLoseCb = callback;
  }

  isKeyDown(key: string): boolean {
    return this.keysDown.has(key);
  }

  private fireButtonPress(action: string) {
    for (const cb of this.buttonPressCbs[action] ?? []) cb();
  }

  private fireButtonRelease(action: string) {
    for (const cb of this.buttonReleaseCbs[action] ?? []) cb();
  }

  start() {
    if (this.phase !== 'ready') return;
    this.phase = 'playing';
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (now: number) => {
    if (this.phase !== 'playing') return;
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.elapsedTime += dt;

    this.update(dt);
    this.checkConditions();
    this.render();

    if (this.phase === 'playing') {
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  };

  private update(dt: number) {
    for (const entity of this.entities) {
      if (!entity.active) continue;
      entity.x += entity.vx * entity.speed * dt * 60;
      entity.y += entity.vy * entity.speed * dt * 60;
      entity.x = Math.max(0, Math.min(this.canvas.width - entity.width, entity.x));
      entity.y = Math.max(0, Math.min(this.canvas.height - entity.height, entity.y));
    }
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.onUpdateCb) this.onUpdateCb(dt);
  }

  checkCollision(a: GameEntity, b: GameEntity): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  getCollisions(typeA: string, typeB: string): [GameEntity, GameEntity][] {
    const groupA = this.entities.filter((e) => e.type === typeA && e.active);
    const groupB = this.entities.filter((e) => e.type === typeB && e.active);
    const pairs: [GameEntity, GameEntity][] = [];
    for (const a of groupA) {
      for (const b of groupB) {
        if (this.checkCollision(a, b)) pairs.push([a, b]);
      }
    }
    return pairs;
  }

  private checkConditions() {
    if (this.lives <= 0) {
      this.end('lost');
      return;
    }
    if (this.config.failure_condition.type === 'time_expired' && this.timeLeft <= 0) {
      if (this.score < (this.config.success_condition.score ?? Infinity)) {
        this.end('lost');
        return;
      }
    }
    const sc = this.config.success_condition;
    if (sc.type === 'score_threshold' && sc.score !== undefined && this.score >= sc.score) {
      this.end('won');
      return;
    }
    if (sc.type === 'survive_for_seconds' && this.elapsedTime >= (sc.seconds ?? 30)) {
      this.end('won');
      return;
    }
  }

  private end(result: 'won' | 'lost') {
    this.phase = result;
    cancelAnimationFrame(this.animFrameId);
    this.renderEndScreen();
    if (result === 'won' && this.onWinCb) this.onWinCb();
    if (result === 'lost' && this.onLoseCb) this.onLoseCb();
  }

  private render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Entities
    for (const entity of this.entities) {
      if (!entity.active) continue;
      ctx.fillStyle = entity.color;
      if (entity.spriteKey === 'hero_knight' || entity.spriteKey === 'enemy_slime') {
        ctx.beginPath();
        const cx = entity.x + entity.width / 2;
        const cy = entity.y + entity.height / 2;
        const r = entity.width / 2;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `${entity.width * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(entity.spriteKey === 'hero_knight' ? '♞' : '🐍', cx, cy);
      } else if (entity.spriteKey === 'coin') {
        ctx.beginPath();
        const cx = entity.x + entity.width / 2;
        const cy = entity.y + entity.height / 2;
        ctx.arc(cx, cy, entity.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `${entity.width * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy);
      } else {
        ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
        if (entity.spriteKey === 'spike_trap') {
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.moveTo(entity.x, entity.y + entity.height);
          ctx.lineTo(entity.x + entity.width / 2, entity.y);
          ctx.lineTo(entity.x + entity.width, entity.y + entity.height);
          ctx.fill();
        }
      }
    }

    // HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 10, 24);
    ctx.fillText(`Lives: ${'♥'.repeat(this.lives)}${'♡'.repeat(Math.max(0, (this.config.max_lives ?? 3) - this.lives))}`, 10, 48);
    ctx.fillText(`Time: ${Math.ceil(this.timeLeft)}s`, 10, 72);

    // On-screen buttons
    for (const btn of this.buttons) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);
    }
  }

  private renderEndScreen() {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = this.phase === 'won' ? '#44ff44' : '#ff4444';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.phase === 'won' ? 'YOU WON!' : 'YOU LOST',
      canvas.width / 2,
      canvas.height / 2 - 20,
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.fillText(`Score: ${this.score}`, canvas.width / 2, canvas.height / 2 + 20);
  }

  getScore(): number {
    return this.score;
  }

  getLives(): number {
    return this.lives;
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  destroy() {
    cancelAnimationFrame(this.animFrameId);
  }
}
