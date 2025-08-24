import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface SnakeGameProps {
  className?: string;
}

const GRID_SIZE = 20;
const CANVAS_SIZE = 320;
const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
const INITIAL_FOOD: Position = { x: 15, y: 15 };
const GAME_SPEED = 150; // milliseconds between moves

export default function SnakeGame({ className = "" }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastMoveTimeRef = useRef<number>(0);
  
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>(INITIAL_FOOD);
  const [direction, setDirection] = useState<Position>({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Generate random food position
  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Check collision with walls or self
  const checkCollision = useCallback((head: Position, body: Position[]): boolean => {
    // Wall collision
    if (head.x < 0 || head.x >= CANVAS_SIZE / GRID_SIZE || head.y < 0 || head.y >= CANVAS_SIZE / GRID_SIZE) {
      return true;
    }
    // Self collision
    return body.some(segment => segment.x === head.x && segment.y === head.y);
  }, []);

  // Move snake
  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted) return;

    setSnake(currentSnake => {
      const newSnake = [...currentSnake];
      const head = { ...newSnake[0] };
      
      head.x += direction.x;
      head.y += direction.y;

      // Check collision
      if (checkCollision(head, newSnake)) {
        setGameOver(true);
        return currentSnake;
      }

      newSnake.unshift(head);

      // Check if food eaten
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop(); // Remove tail if no food eaten
      }

      return newSnake;
    });
  }, [direction, food, gameOver, gameStarted, checkCollision, generateFood]);

  // Handle keyboard input
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!gameStarted && !gameOver) {
      setGameStarted(true);
    }

    if (gameOver) {
      if (e.key === ' ' || e.key === 'Enter') {
        // Restart game
        setSnake(INITIAL_SNAKE);
        setFood(INITIAL_FOOD);
        setDirection({ x: 1, y: 0 });
        setScore(0);
        setGameOver(false);
        setGameStarted(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setDirection(prev => prev.y !== 1 ? { x: 0, y: -1 } : prev);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setDirection(prev => prev.y !== -1 ? { x: 0, y: 1 } : prev);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setDirection(prev => prev.x !== 1 ? { x: -1, y: 0 } : prev);
        break;
      case 'ArrowRight':
        e.preventDefault();
        setDirection(prev => prev.x !== -1 ? { x: 1, y: 0 } : prev);
        break;
    }
  }, [gameStarted, gameOver]);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (timestamp - lastMoveTimeRef.current >= GAME_SPEED) {
      moveSnake();
      lastMoveTimeRef.current = timestamp;
    }
    
    if (!gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [moveSnake, gameOver]);

  // Draw game
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    // Draw snake
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#10b981' : '#059669'; // Head is brighter
      ctx.fillRect(
        segment.x * GRID_SIZE + 1,
        segment.y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2
      );
    });

    // Draw food
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(
      food.x * GRID_SIZE + 2,
      food.y * GRID_SIZE + 2,
      GRID_SIZE - 4,
      GRID_SIZE - 4
    );
  }, [snake, food]);

  // Setup game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Focus canvas for keyboard events
    canvas.focus();
    canvas.setAttribute('tabindex', '0');

    // Add keyboard listeners
    const handleKeyDown = (e: KeyboardEvent) => handleKeyPress(e);
    canvas.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('keydown', handleKeyDown);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [handleKeyPress]);

  // Start game loop when game starts
  useEffect(() => {
    if (gameStarted && !gameOver) {
      lastMoveTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, gameLoop]);

  // Draw game state
  useEffect(() => {
    draw();
  }, [draw]);

  const startGame = () => {
    setGameStarted(true);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.focus();
    }
  };

  const restartGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(generateFood(INITIAL_SNAKE));
    setDirection({ x: 1, y: 0 });
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.focus();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="border border-white/20 rounded-lg bg-black/50 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Game overlay */}
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="text-center">
              <div className="text-white/90 text-lg font-medium mb-2">Snake Game</div>
              <button
                onClick={startGame}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
              >
                Start Game
              </button>
              <div className="text-white/60 text-xs mt-2">Use arrow keys to play</div>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="text-center">
              <div className="text-red-400 text-lg font-medium mb-2">Game Over!</div>
              <div className="text-white/90 mb-3">Final Score: {score}</div>
              <button
                onClick={restartGame}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
              >
                Play Again
              </button>
              <div className="text-white/60 text-xs mt-2">Press Space or Enter to restart</div>
            </div>
          </div>
        )}
      </div>

      {/* Score display */}
      <div className="flex items-center gap-4 text-white/80">
        <div className="text-lg font-medium">Score: {score}</div>
        {gameStarted && !gameOver && (
          <div className="text-sm text-white/60">
            Use arrow keys to move
          </div>
        )}
      </div>
    </div>
  );
}