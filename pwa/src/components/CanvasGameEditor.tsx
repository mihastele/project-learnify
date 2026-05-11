import { useState, useEffect, useRef, useCallback } from 'react';
import { CanvasGame, CanvasGameCreatePayload } from '../api/types';
import { createCanvasGame, updateCanvasGame, fetchCanvasGame } from '../api/client';
import { CanvasGameEngine } from '../game/CanvasGameEngine';
import styles from './CanvasGameEditor.module.css';

const DEFAULT_GAME_CODE = `// Canvas Game Builder API
// Use these functions to build your game:

// Add a character to the game
// engine.addCharacter(type, name, spriteKey, options)
// type: 'hero' | 'enemy' | 'collectible' | 'obstacle'
// spriteKey: 'hero_knight' | 'enemy_slime' | 'coin' | 'spike_trap' | 'block'
// options: { x, y, size, color, speed, behavior }

// Example:
const hero = engine.addCharacter('hero', 'player', 'hero_knight', {
  x: canvas.width / 2,
  y: canvas.height - 60,
  size: 30,
  speed: 5
});

// Add collectibles
for (let i = 0; i < 5; i++) {
  engine.addCharacter('collectible', \`coin_\${i}\`, 'coin', {
    x: 50 + Math.random() * (canvas.width - 100),
    y: 50 + Math.random() * (canvas.height - 200),
    size: 20
  });
}

// Add enemies
for (let i = 0; i < 3; i++) {
  const enemy = engine.addCharacter('enemy', \`enemy_\${i}\`, 'enemy_slime', {
    x: 50 + Math.random() * (canvas.width - 100),
    y: 50 + Math.random() * (canvas.height / 2),
    size: 28,
    speed: 2
  });
  enemy.vx = Math.random() > 0.5 ? 1 : -1;
  enemy.vy = Math.random() > 0.5 ? 1 : -1;
}

// Update loop - called every frame
engine.onUpdate((dt) => {
  // Check keyboard input
  if (engine.isKeyDown('ArrowLeft')) hero.vx = -1;
  else if (engine.isKeyDown('ArrowRight')) hero.vx = 1;
  else hero.vx = 0;
  
  if (engine.isKeyDown('ArrowUp')) hero.vy = -1;
  else if (engine.isKeyDown('ArrowDown')) hero.vy = 1;
  else hero.vy = 0;
  
  // Check collisions
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

// Win condition
engine.onWin(() => {
  console.log('You won!');
});

// Lose condition
engine.onLose(() => {
  console.log('You lost!');
});
`;

const API_DOCS = `
# Canvas Game Builder API

## Available Functions

### engine.addCharacter(type, name, spriteKey, options)
Add a character to the game.
- **type**: 'hero' | 'enemy' | 'collectible' | 'obstacle'
- **name**: Unique identifier for the character
- **spriteKey**: 'hero_knight' | 'enemy_slime' | 'coin' | 'spike_trap' | 'block'
- **options**: { x, y, size, color, speed, behavior }

### engine.onUpdate(callback)
Register a callback that runs every frame.
- **callback**: (dt: number) => void - dt is delta time in seconds

### engine.isKeyDown(key)
Check if a keyboard key is pressed.
- **key**: String (e.g., 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight')

### engine.getCollisions(typeA, typeB)
Get all collision pairs between two entity types.
- Returns: Array of [entityA, entityB]

### engine.incrementScore(delta)
Add to the score.
- **delta**: Number to add to score

### engine.decrementLives()
Remove one life.

### engine.setScore(value)
Set the score to a specific value.

### engine.setLives(value)
Set lives to a specific value.

### engine.onWin(callback)
Register a callback when the game is won.

### engine.onLose(callback)
Register a callback when the game is lost.

### engine.spawn(name, position)
Spawn an existing entity at a position.
- **name**: Entity name
- **position**: { x, y }

## Entity Properties
Each entity has:
- x, y: Position
- width, height: Size
- vx, vy: Velocity
- speed: Movement speed
- active: Whether entity is active
- color: Display color

## Win/Lose Conditions
The game automatically ends when:
- Win: Score reaches target (config.success_condition.score)
- Lose: Lives reach 0 or time expires
`;

interface Props {
  gameId?: string;
  onSave?: (game: CanvasGame) => void;
  onCancel?: () => void;
}

export default function CanvasGameEditor({ gameId, onSave, onCancel }: Props) {
  const [gameName, setGameName] = useState('');
  const [description, setDescription] = useState('');
  const [gameCode, setGameCode] = useState(DEFAULT_GAME_CODE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDocs, setShowDocs] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasGameEngine | null>(null);

  useEffect(() => {
    if (gameId) {
      loadGame();
    }
  }, [gameId]);

  const loadGame = async () => {
    if (!gameId) return;
    try {
      const game = await fetchCanvasGame(gameId);
      setGameName(game.name);
      setDescription(game.description || '');
      setGameCode(game.game_code || DEFAULT_GAME_CODE);
    } catch (e: any) {
      setError(e.message || 'Failed to load game');
    }
  };

  const handleSave = async () => {
    if (!gameName.trim()) {
      setError('Game name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: CanvasGameCreatePayload = {
        name: gameName,
        description: description || undefined,
        game_code: gameCode,
        tools_config: {},
      };
      
      let savedGame: CanvasGame;
      if (gameId) {
        savedGame = await updateCanvasGame(gameId, payload);
      } else {
        savedGame = await createCanvasGame(payload);
      }
      
      if (onSave) onSave(savedGame);
      if (!gameId) {
        // Reset for new game after save
        setGameName('');
        setDescription('');
        setGameCode(DEFAULT_GAME_CODE);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save game');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setGameName('');
    setDescription('');
    setGameCode(DEFAULT_GAME_CODE);
    setError('');
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setIsRunning(false);
  };

  const runGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clean up previous engine
    if (engineRef.current) {
      engineRef.current.destroy();
    }

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const config = {
      time_limit: 60,
      target_score: 5,
      max_lives: 3,
      success_condition: { type: 'score_threshold' as const, score: 5 },
      failure_condition: { type: 'lives_reached_zero' as const },
    };

    const engine = new CanvasGameEngine(canvas, config);
    engineRef.current = engine;

    try {
      // Create a function from the user's code
      const gameFunction = new Function('engine', 'canvas', gameCode);
      gameFunction(engine, canvas);
      
      engine.start();
      setIsRunning(true);
    } catch (e: any) {
      setError(`Game code error: ${e.message}`);
      engine.destroy();
      engineRef.current = null;
      setIsRunning(false);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, [gameCode]);

  const stopGame = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setIsRunning(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Canvas Game Editor</h2>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={handleReset}>
            New Game
          </button>
          <button className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Game'}
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.metaSection}>
        <input
          className={styles.input}
          placeholder="Game Name (will be saved as yourusername/gamename)"
          value={gameName}
          onChange={e => setGameName(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div className={styles.editorLayout}>
        <div className={styles.codePanel}>
          <div className={styles.panelHeader}>
            <h3>Game Code</h3>
            <div className={styles.panelActions}>
              <button
                className={styles.btnSmall}
                onClick={() => setShowDocs(!showDocs)}
              >
                {showDocs ? 'Hide Docs' : 'Show Docs'}
              </button>
              {!isRunning ? (
                <button className={styles.btnSmall} onClick={runGame}>
                  ▶ Run
                </button>
              ) : (
                <button className={styles.btnSmall} onClick={stopGame}>
                  ■ Stop
                </button>
              )}
            </div>
          </div>
          {showDocs && (
            <div className={styles.docsPanel}>
              <pre className={styles.docsContent}>{API_DOCS}</pre>
            </div>
          )}
          <textarea
            className={styles.codeEditor}
            value={gameCode}
            onChange={e => setGameCode(e.target.value)}
            spellCheck={false}
            placeholder="Write your game code here..."
          />
        </div>

        <div className={styles.previewPanel}>
          <div className={styles.panelHeader}>
            <h3>Canvas Preview</h3>
          </div>
          <div className={styles.canvasContainer}>
            <canvas ref={canvasRef} className={styles.gameCanvas} />
          </div>
        </div>
      </div>
    </div>
  );
}
