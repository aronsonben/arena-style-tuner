
import React, { useRef, useEffect, useState } from 'react';

type GameMode = 'SNAKE' | 'NOISE' | 'CONNECT' | 'SYMMETRY';

const WaitingGames: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode] = useState<GameMode>(() => {
    const modes: GameMode[] = ['SNAKE', 'NOISE', 'CONNECT', 'SYMMETRY'];
    return modes[Math.floor(Math.random() * modes.length)];
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        width = parent.clientWidth;
        height = parent.clientHeight;
        canvas.width = width;
        canvas.height = height;
        // Re-initialize mode-specific large states on resize
        if (mode === 'NOISE') initNoise();
      }
    };

    window.addEventListener('resize', resize);
    resize();

    // Interaction state
    const mouse = { x: 0, y: 0, down: false };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseDown = () => { mouse.down = true; };
    const handleMouseUp = () => { mouse.down = false; };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // --- Mode State ---
    const isDark = document.documentElement.classList.contains('dark');
    const color = isDark ? '#FFFFFF' : '#1A1A1A';
    const subColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(26,26,26,0.2)';

    // 1. SNAKE STATE
    let snake: {x: number, y: number}[] = Array.from({length: 12}, () => ({x: width/2, y: height/2}));
    let food = {x: Math.random() * width, y: Math.random() * height};

    // 2. NOISE STATE
    const maskCanvas = document.createElement('canvas');
    const mctx = maskCanvas.getContext('2d')!;
    const initNoise = () => {
        maskCanvas.width = width;
        maskCanvas.height = height;
        mctx.fillStyle = isDark ? '#0a0a0a' : '#f8f8f8';
        mctx.fillRect(0, 0, width, height);
        mctx.fillStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
        for(let i=0; i<width; i+=4) {
            for(let j=0; j<height; j+=4) {
                if(Math.random() > 0.92) mctx.fillRect(i, j, 2, 2);
            }
        }
    };
    if (mode === 'NOISE') initNoise();

    // 3. CONNECT STATE
    const nodes = Array.from({length: 16}, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2
    }));
    let lines: [number, number][] = [];
    let activeLineStart: number | null = null;

    // 4. SYMMETRY STATE
    let strokes: {x: number, y: number}[][] = [];
    let currentStroke: {x: number, y: number}[] = [];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      if (mode === 'SNAKE') {
        const head = snake[0];
        const dx = mouse.x - head.x;
        const dy = mouse.y - head.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 3) {
            const nextX = head.x + (dx/dist) * 4.5;
            const nextY = head.y + (dy/dist) * 4.5;
            snake.unshift({x: nextX, y: nextY});
            snake.pop();
        }

        // Draw food
        ctx.fillStyle = '#2D9F61';
        ctx.beginPath();
        ctx.roundRect(food.x - 5, food.y - 5, 10, 10, 2);
        ctx.fill();

        if (Math.sqrt((head.x - food.x)**2 + (head.y - food.y)**2) < 18) {
            food = { x: Math.random() * (width - 20) + 10, y: Math.random() * (height - 20) + 10 };
            for(let i=0; i<8; i++) snake.push({...snake[snake.length-1]});
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(snake[0].x, snake[0].y);
        for(let i=1; i<snake.length; i++) ctx.lineTo(snake[i].x, snake[i].y);
        ctx.stroke();

      } else if (mode === 'NOISE') {
          if (mouse.down) {
              mctx.globalCompositeOperation = 'destination-out';
              mctx.beginPath();
              mctx.arc(mouse.x, mouse.y, 55, 0, Math.PI * 2);
              mctx.fill();
          }
          ctx.drawImage(maskCanvas, 0, 0);

      } else if (mode === 'CONNECT') {
          nodes.forEach(n => {
              n.x += n.vx; n.y += n.vy;
              if (n.x < 0 || n.x > width) n.vx *= -1;
              if (n.y < 0 || n.y > height) n.vy *= -1;
              ctx.strokeStyle = color;
              ctx.lineWidth = 1;
              ctx.strokeRect(n.x - 7, n.y - 7, 14, 14);
          });

          ctx.strokeStyle = subColor;
          lines.forEach(([i, j]) => {
              ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          });

          if (mouse.down) {
              if (activeLineStart === null) {
                  const idx = nodes.findIndex(n => Math.sqrt((n.x-mouse.x)**2 + (n.y-mouse.y)**2) < 35);
                  if (idx !== -1) activeLineStart = idx;
              } else {
                  ctx.beginPath();
                  ctx.moveTo(nodes[activeLineStart].x, nodes[activeLineStart].y);
                  ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
              }
          } else if (activeLineStart !== null) {
              const idx = nodes.findIndex(n => Math.sqrt((n.x-mouse.x)**2 + (n.y-mouse.y)**2) < 35);
              if (idx !== -1 && idx !== activeLineStart) lines.push([activeLineStart, idx]);
              activeLineStart = null;
          }

      } else if (mode === 'SYMMETRY') {
          if (mouse.down) {
              currentStroke.push({x: mouse.x, y: mouse.y});
          } else if (currentStroke.length > 0) {
              strokes.push([...currentStroke]);
              currentStroke = [];
          }

          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          const drawSym = (pts: {x: number, y: number}[]) => {
              if (pts.length < 2) return;
              for (let i = 0; i < 4; i++) {
                  ctx.save();
                  ctx.translate(width/2, height/2);
                  ctx.rotate(i * Math.PI / 2);
                  ctx.translate(-width/2, -height/2);
                  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
                  for(let j=1; j<pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
                  ctx.stroke(); ctx.restore();
              }
          };
          strokes.forEach(drawSym);
          if (currentStroke.length > 0) drawSym(currentStroke);
          
          ctx.setLineDash([8, 12]);
          ctx.strokeStyle = subColor;
          ctx.beginPath(); ctx.moveTo(width/2, 0); ctx.lineTo(width/2, height);
          ctx.moveTo(0, height/2); ctx.lineTo(width, height/2); ctx.stroke();
          ctx.setLineDash([]);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-xl opacity-80 pointer-events-auto">
      <div className="absolute top-4 left-4 z-10 font-mono text-[9px] uppercase tracking-[0.4em] text-black/30 dark:text-white/30 pointer-events-none">
        {mode} MINI-GAME
      </div>
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
    </div>
  );
};

export default WaitingGames;
