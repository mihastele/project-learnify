import { useRef, useEffect, useCallback } from 'react';
import { Item, CanvasGameConfig } from '../api/types';
import { CanvasGameEngine, GameEntity } from '../game/CanvasGameEngine';
import styles from './ItemRenderer.module.css';

const PRESET_GAMES: Record<string, (engine: CanvasGameEngine, cfg: CanvasGameConfig, canvasW: number, canvasH: number) => void> = {
  collect_coins: (engine, cfg, cw, ch) => {
    const hero = engine.addCharacter('hero', 'hero_knight', 'hero_knight', {
      x: cw / 2, y: ch - 60, size: 30, speed: 5,
    });
    const coinCount = cfg.target_score ?? 10;
    for (let i = 0; i < coinCount; i++) {
      engine.addCharacter('collectible', `coin_${i}`, 'coin', {
        x: 40 + Math.random() * (cw - 80),
        y: 40 + Math.random() * (ch - 200),
        size: 20,
      });
    }
    const eCount = cfg.enemy_count ?? 3;
    for (let i = 0; i < eCount; i++) {
      const enemy = engine.addCharacter('enemy', `enemy_${i}`, 'enemy_slime', {
        x: 40 + Math.random() * (cw - 80),
        y: 40 + Math.random() * (ch / 2),
        size: 28,
        speed: 1.5 + Math.random(),
      });
      enemy.vx = Math.random() > 0.5 ? 1 : -1;
      enemy.vy = Math.random() > 0.5 ? 1 : -1;
    }
    engine.onUpdate(() => {
      const heroEntity = hero;
      if (engine.isKeyDown('ArrowUp') || engine.isKeyDown('ArrowLeft') || engine.isKeyDown('ArrowRight') || engine.isKeyDown('ArrowDown')) {
        heroEntity.vy = 0; heroEntity.vx = 0;
        if (engine.isKeyDown('ArrowUp')) heroEntity.vy = -1;
        if (engine.isKeyDown('ArrowDown')) heroEntity.vy = 1;
        if (engine.isKeyDown('ArrowLeft')) heroEntity.vx = -1;
        if (engine.isKeyDown('ArrowRight')) heroEntity.vx = 1;
      } else {
        heroEntity.vy = 0; heroEntity.vx = 0;
      }
      const coinCollisions = engine.getCollisions('hero', 'collectible');
      for (const [, coin] of coinCollisions) {
        coin.active = false;
        engine.incrementScore(1);
      }
      const enemyCollisions = engine.getCollisions('hero', 'enemy');
      for (const [, enemy] of enemyCollisions) {
        enemy.active = false;
        engine.decrementLives();
      }
    });
  },

  dodge_enemies: (engine, cfg, cw, ch) => {
    const hero = engine.addCharacter('hero', 'hero_knight', 'hero_knight', {
      x: cw / 2, y: ch - 60, size: 28, speed: 6,
    });
    const eCount = cfg.enemy_count ?? 8;
    for (let i = 0; i < eCount; i++) {
      const enemy = engine.addCharacter('enemy', `enemy_${i}`, 'enemy_slime', {
        x: 40 + Math.random() * (cw - 80),
        y: 40 + Math.random() * (ch / 3),
        size: 26,
        speed: 2 + Math.random() * 2,
      });
      enemy.vx = Math.random() > 0.5 ? 1 : -1;
      enemy.vy = Math.random() * 1.5 + 0.3;
    }
    engine.onUpdate(() => {
      const heroEntity = hero;
      if (engine.isKeyDown('ArrowUp')) heroEntity.vy = -1;
      else if (engine.isKeyDown('ArrowDown')) heroEntity.vy = 1;
      else heroEntity.vy = 0;
      if (engine.isKeyDown('ArrowLeft')) heroEntity.vx = -1;
      else if (engine.isKeyDown('ArrowRight')) heroEntity.vx = 1;
      else heroEntity.vx = 0;
      const collisions = engine.getCollisions('hero', 'enemy');
      for (const [, enemy] of collisions) {
        enemy.active = false;
        engine.decrementLives();
      }
    });
  },

  defend_castle: (engine, _cfg, cw, ch) => {
    engine.addCharacter('obstacle', 'castle', 'block', {
      x: cw / 2 - 40, y: 10, size: 80, color: '#aa8844',
    });
    const hero = engine.addCharacter('hero', 'hero_knight', 'hero_knight', {
      x: cw / 2, y: ch - 60, size: 32, speed: 5,
    });
    const eCount = 6;
    for (let i = 0; i < eCount; i++) {
      const enemy = engine.addCharacter('enemy', `invader_${i}`, 'enemy_slime', {
        x: 30 + Math.random() * (cw - 60),
        y: 20 + Math.random() * (ch / 4),
        size: 24,
        speed: 1 + Math.random(),
        behavior: 'seek_castle',
      });
      enemy.vy = 0.5;
    }
    engine.onUpdate(() => {
      const heroEntity = hero;
      if (engine.isKeyDown('ArrowUp')) heroEntity.vy = -1;
      else if (engine.isKeyDown('ArrowDown')) heroEntity.vy = 1;
      else heroEntity.vy = 0;
      if (engine.isKeyDown('ArrowLeft')) heroEntity.vx = -1;
      else if (engine.isKeyDown('ArrowRight')) heroEntity.vx = 1;
      else heroEntity.vx = 0;
      const hits = engine.getCollisions('hero', 'enemy');
      for (const [, enemy] of hits) {
        enemy.active = false;
        engine.incrementScore(1);
      }
    });
  },
};

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function AdvancedCanvasGameItemView({ item, onAnswer }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasGameEngine | null>(null);
  const answeredRef = useRef(false);

  const config: CanvasGameConfig = (item.metadata?.game_config as CanvasGameConfig) || {
    success_condition: { type: 'score_threshold', score: 5 },
    failure_condition: { type: 'lives_reached_zero' },
  };

  const slug = (item.metadata?.game_slug as string) || 'collect_coins';

  const handleResult = useCallback(
    (won: boolean) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      const engine = engineRef.current;
      onAnswer(won, {
        result: won ? 'success' : 'failure',
        score: engine?.getScore() ?? 0,
        time_elapsed: engine?.getElapsedTime() ?? 0,
        lives_remaining: engine?.getLives() ?? 0,
      });
    },
    [onAnswer],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const engine = new CanvasGameEngine(canvas, config);
    engineRef.current = engine;

    const preset = PRESET_GAMES[slug];
    if (preset) {
      preset(engine, config, canvas.width, canvas.height);
    } else {
      // Default simple game: dodge falling blocks
      const hero = engine.addCharacter('hero', 'hero_knight', 'hero_knight', {
        x: canvas.width / 2, y: canvas.height - 60, size: 30, speed: 6,
      });
      const bs = engine.addCharacter('enemy', 'block_1', 'spike_trap', {
        x: 60, y: 40, size: 25, speed: 3,
      });
      bs.vy = 1;
      engine.onUpdate(() => {
        const h = hero;
        if (engine.isKeyDown('ArrowLeft')) h.vx = -1;
        else if (engine.isKeyDown('ArrowRight')) h.vx = 1;
        else h.vx = 0;
        if (engine.isKeyDown('ArrowUp')) h.vy = -1;
        else if (engine.isKeyDown('ArrowDown')) h.vy = 1;
        else h.vy = 0;
        const hits = engine.getCollisions('hero', 'enemy');
        for (const [, e] of hits) {
          e.active = false;
          engine.decrementLives();
        }
      });
    }

    engine.onWin(() => handleResult(true));
    engine.onLose(() => handleResult(false));
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <div className={styles.canvasGameContainer} ref={containerRef}>
      <div className={styles.gameInstructions}>
        {slug === 'collect_coins' && 'Collect all coins while avoiding enemies! Arrow keys to move.'}
        {slug === 'dodge_enemies' && 'Survive as long as you can! Arrow keys to move.'}
        {slug === 'defend_castle' && 'Destroy all invaders before they reach the castle! Arrow keys to move.'}
        {!PRESET_GAMES[slug] && 'Use arrow keys to avoid falling blocks!'}
      </div>
      <canvas
        ref={canvasRef}
        className={styles.gameCanvas}
      />
    </div>
  );
}
