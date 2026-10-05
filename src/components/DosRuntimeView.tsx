import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CartridgeProject,
  PaletteTheme,
  PaletteThemeId,
  RenderScalingMode,
  X86RegisterState,
} from '../types';
import { VgaMode13hEngine } from '../utils/vgaEngine';
import { PALETTE_THEMES } from '../utils/palettes';
import { pcSpeaker } from '../utils/sound';
import {
  Monitor,
  Maximize2,
  Tv,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

interface DosRuntimeViewProps {
  project: CartridgeProject;
  setProject: React.Dispatch<React.SetStateAction<CartridgeProject>>;
  allProjects: CartridgeProject[];
  paletteTheme: PaletteTheme;
  setPaletteThemeId: (id: PaletteThemeId) => void;
  scalingMode: RenderScalingMode;
  setScalingMode: (mode: RenderScalingMode) => void;
}

export const DosRuntimeView: React.FC<DosRuntimeViewProps> = ({
  project,
  setProject,
  allProjects,
  paletteTheme,
  setPaletteThemeId,
  scalingMode,
  setScalingMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vgaEngineRef = useRef<VgaMode13hEngine | null>(null);

  // CRT Visual effect states
  const [crtScanlines, setCrtScanlines] = useState<boolean>(true);
  const [crtCurvature, setCrtCurvature] = useState<boolean>(true);
  const [crtBloom, setCrtBloom] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Player position in the Game Boy world
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number; dir: 'up' | 'down' | 'left' | 'right' }>({
    x: 80,
    y: 72,
    dir: 'down',
  });

  // World viewport scroll offsets
  const [scrollX, setScrollX] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(0);

  // 2x integer mode pan
  const [integerPanY, setIntegerPanY] = useState<number>(44);

  // Animated frame counter
  const [frameCount, setFrameCount] = useState<number>(0);

  // Real Mode 16-bit register states
  const [registers, setRegisters] = useState<X86RegisterState>({
    ax: 0x0013,
    bx: 0x2350,
    cx: 0x0400,
    dx: 0x03da,
    si: 0x0040,
    di: 0x2350,
    bp: 0x03f0,
    sp: 0x0400,
    cs: 0x0000,
    ip: 0x0028,
    ds: 0x0000,
    es: 0xa000,
    ss: 0x0010,
    flags: {
      cf: false,
      zf: true,
      sf: false,
      of: false,
      if: true,
    },
  });

  // Initialize VGA engine
  useEffect(() => {
    vgaEngineRef.current = new VgaMode13hEngine();
  }, []);

  // Update DAC whenever palette changes
  useEffect(() => {
    if (vgaEngineRef.current) {
      vgaEngineRef.current.updateDacFromTheme(paletteTheme);
    }
  }, [paletteTheme]);

  // Movement handler with boundary clamping and PC speaker step sound
  const handleMove = useCallback(
    (dx: number, dy: number, dir: 'up' | 'down' | 'left' | 'right') => {
      setPlayerPos((prev) => {
        const nextX = Math.max(8, Math.min(240, prev.x + dx));
        const nextY = Math.max(8, Math.min(240, prev.y + dy));

        // Update scrolling camera to follow player smoothly
        setScrollX((prevSx) => {
          if (nextX - prevSx > 110) return Math.min(96, prevSx + 4);
          if (nextX - prevSx < 50) return Math.max(0, prevSx - 4);
          return prevSx;
        });

        setScrollY((prevSy) => {
          if (nextY - prevSy > 100) return Math.min(112, prevSy + 4);
          if (nextY - prevSy < 40) return Math.max(0, prevSy - 4);
          return prevSy;
        });

        // Update real mode registers simulating game loop execution
        setRegisters((reg) => ({
          ...reg,
          ax: (nextX & 0xff) | ((nextY & 0xff) << 8),
          bx: nextX * 2,
          ip: (reg.ip + 4) % 0x0200,
          flags: {
            ...reg.flags,
            zf: nextX === 120,
            cf: nextX > 200,
          },
        }));

        pcSpeaker.playStep();
        return { x: nextX, y: nextY, dir };
      });
    },
    []
  );

  const handleActionA = useCallback(() => {
    pcSpeaker.playJump();
    setRegisters((reg) => ({
      ...reg,
      cx: (reg.cx + 1) & 0xffff,
      flags: { ...reg.flags, zf: false },
    }));
  }, []);

  const handleActionB = useCallback(() => {
    pcSpeaker.playCoin();
    setRegisters((reg) => ({
      ...reg,
      ax: (reg.ax + 0x0100) & 0xffff,
      flags: { ...reg.flags, cf: true },
    }));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleMove(0, -4, 'up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          handleMove(0, 4, 'down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleMove(-4, 0, 'left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleMove(4, 0, 'right');
          break;
        case ' ':
        case 'z':
        case 'Z':
          handleActionA();
          break;
        case 'x':
        case 'X':
        case 'Enter':
          handleActionB();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleMove, handleActionA, handleActionB]);

  // Main render loop simulating VGA Mode 13h 70Hz vertical refresh
  useEffect(() => {
    if (!isRunning) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      // Limit to ~60-70 fps
      if (currentTime - lastTime >= 14) {
        lastTime = currentTime;
        setFrameCount((f) => f + 1);

        const canvas = canvasRef.current;
        const engine = vgaEngineRef.current;

        if (canvas && engine) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Update player sprite position
            const updatedSprites = project.sprites.map((s, idx) => {
              if (idx === 0) {
                return {
                  ...s,
                  x: playerPos.x,
                  y: playerPos.y,
                  flipX: playerPos.dir === 'left',
                };
              }
              // Enemies subtle ambient patrol
              if (project.id === 'space_raider') {
                return {
                  ...s,
                  y: ((s.y + 1) % 140),
                };
              }
              return s;
            });

            // 1. Render Game Boy 160x144 internal framebuffer
            engine.renderGameBoyFrame(
              project.tiles,
              project.tilemap,
              updatedSprites,
              scrollX,
              scrollY
            );

            // 2. Blit to Mode 13h (320x200 8-bit chunky VRAM)
            engine.blitToMode13h(scalingMode, integerPanY);

            // 3. Draw onto HTML5 Canvas
            const imgData = ctx.createImageData(320, 200);
            engine.renderToCanvas(ctx, imgData);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, project, playerPos, scrollX, scrollY, scalingMode, integerPanY]);

  // Estimated clock cycles on legacy Intel x86 CPUs for 1 frame of Game Boy -> Mode 13h blitting
  // (160x144 = 23,040 pixels decoded from 2BPP bitplanes into chunky 8-bit bytes)
  const estCycles8086 = 345600; // ~72ms on 4.77MHz 8086 (14 FPS)
  const estCycles286 = 184320;  // ~15ms on 12MHz 286 (60 FPS)
  const estCycles386 = 92160;   // ~2.7ms on 33MHz 386DX (350+ FPS)
  const estCycles486 = 46080;   // ~0.7ms on 66MHz 486DX2

  return (
    <div className="space-y-6">
      {/* Control bar / Selector strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
        {/* Project cartridge selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-medium">Cartridge:</span>
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded border border-neutral-800">
            {allProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProject(p);
                  pcSpeaker.biosBeep();
                  setPlayerPos({ x: 80, y: 72, dir: 'down' });
                  setScrollX(0);
                  setScrollY(0);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  project.id === p.id
                    ? 'bg-amber-400 text-neutral-950 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* Scaling Mode selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-medium">Mode 13h Raster:</span>
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded border border-neutral-800">
            <button
              onClick={() => setScalingMode('centered_1x')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                scalingMode === 'centered_1x'
                  ? 'bg-neutral-800 text-amber-300'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="160x144 centered with bezel inside 320x200"
            >
              Centered 1:1
            </button>
            <button
              onClick={() => setScalingMode('integer_2x')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                scalingMode === 'integer_2x'
                  ? 'bg-neutral-800 text-amber-300'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="320x200 exact 2x integer width"
            >
              Integer 2x
            </button>
            <button
              onClick={() => setScalingMode('fit_aspect')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                scalingMode === 'fit_aspect'
                  ? 'bg-neutral-800 text-amber-300'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Aspect fit 320x200 stretch"
            >
              Aspect Fit
            </button>
            <button
              onClick={() => setScalingMode('fullscreen_tilemap')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                scalingMode === 'fullscreen_tilemap'
                  ? 'bg-neutral-800 text-amber-300'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Unchained full 320x200 tilemap"
            >
              Tile Canvas
            </button>
          </div>
        </div>

        {/* Palette Theme Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-medium">DAC Palette:</span>
          <select
            value={paletteTheme.id}
            onChange={(e) => setPaletteThemeId(e.target.value as PaletteThemeId)}
            className="bg-neutral-950 text-neutral-200 text-xs border border-neutral-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
          >
            {Object.values(PALETTE_THEMES).map((thm) => (
              <option key={thm.id} value={thm.id}>
                {thm.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Sandbox Grid: CRT Display on Left / Registers & Specs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CRT Screen Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 p-3 shadow-2xl flex flex-col items-center">
            {/* Monitor Header with vintage branding */}
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80 px-2 text-neutral-400">
              <div className="flex items-center gap-2">
                <Monitor size={15} className="text-amber-400" />
                <span className="font-mono text-xs uppercase tracking-wider text-neutral-300">
                  IBM 8513 VGA MONITOR · MODE 13h (320×200 8-BIT)
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>70.08 Hz VSYNC</span>
              </div>
            </div>

            {/* CRT Display Container */}
            <div
              className={`relative rounded-lg overflow-hidden border-4 border-neutral-900 max-w-full ${
                crtCurvature ? 'crt-vignette' : ''
              } ${crtBloom ? 'crt-bloom' : ''}`}
              style={{
                backgroundColor: paletteTheme.bezelBg,
                width: '640px',
                height: '400px',
              }}
            >
              {/* Native 320x200 Canvas stretched 2x to 640x400 */}
              <canvas
                ref={canvasRef}
                width={320}
                height={200}
                className="w-full h-full object-contain image-rendering-pixelated"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* CRT Scanline Overlay */}
              {crtScanlines && <div className="absolute inset-0 crt-overlay" />}

              {/* Pause Overlay */}
              {!isRunning && (
                <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex flex-col items-center justify-center font-mono">
                  <span className="text-amber-400 font-pixel text-4xl tracking-widest mb-1">
                    EXECUTION PAUSED
                  </span>
                  <span className="text-xs text-neutral-400">
                    Press RUN to resume Mode 13h execution loop
                  </span>
                </div>
              )}
            </div>

            {/* Screen controls & CRT toggles */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-neutral-800/80 px-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono text-xs transition-colors ${
                    isRunning
                      ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {isRunning ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isRunning ? 'Pause CPU' : 'Resume CPU'}</span>
                </button>

                <button
                  onClick={() => {
                    pcSpeaker.biosBeep();
                    setPlayerPos({ x: 80, y: 72, dir: 'down' });
                    setScrollX(0);
                    setScrollY(0);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded font-mono text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Reset State</span>
                </button>
              </div>

              {/* CRT Post-processing toggles */}
              <div className="flex items-center gap-2 font-mono text-neutral-400">
                <button
                  onClick={() => setCrtScanlines(!crtScanlines)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    crtScanlines
                      ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                      : 'border-neutral-800 text-neutral-500'
                  }`}
                >
                  <Tv size={12} />
                  <span>Scanlines</span>
                </button>

                <button
                  onClick={() => setCrtCurvature(!crtCurvature)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    crtCurvature
                      ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                      : 'border-neutral-800 text-neutral-500'
                  }`}
                >
                  <Maximize2 size={12} />
                  <span>Curvature</span>
                </button>

                <button
                  onClick={() => setCrtBloom(!crtBloom)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    crtBloom
                      ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                      : 'border-neutral-800 text-neutral-500'
                  }`}
                >
                  <Sparkles size={12} />
                  <span>Phosphor</span>
                </button>
              </div>
            </div>

            {/* If 2x integer mode, show vertical panning slider */}
            {scalingMode === 'integer_2x' && (
              <div className="w-full flex items-center justify-between gap-3 px-3 py-2 mt-2 bg-neutral-900/60 rounded border border-neutral-800 text-xs font-mono">
                <span className="text-neutral-400">
                  Mode 13h Vertical Window Pan (288px → 200px):
                </span>
                <input
                  type="range"
                  min={0}
                  max={88}
                  value={integerPanY}
                  onChange={(e) => setIntegerPanY(Number(e.target.value))}
                  className="w-48 accent-amber-400 cursor-pointer"
                />
                <span className="text-amber-300 tabular-nums">Line +{integerPanY}</span>
              </div>
            )}
          </div>

          {/* Interactive D-Pad and Action Buttons for quick testing without physical keyboard */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
                Hardware Controller Input
              </span>
              <p className="text-xs text-neutral-400">
                Use keyboard <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300 font-mono text-[11px]">Arrow Keys</kbd> or <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300 font-mono text-[11px]">WASD</kbd>, and <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300 font-mono text-[11px]">Z / Space</kbd> for Jump, <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300 font-mono text-[11px]">X / Enter</kbd> for Action.
              </p>
            </div>

            {/* Virtual Buttons */}
            <div className="flex items-center gap-6">
              {/* D-Pad */}
              <div className="grid grid-cols-3 gap-1 w-24 h-24">
                <div></div>
                <button
                  onClick={() => handleMove(0, -6, 'up')}
                  className="bg-neutral-800 hover:bg-neutral-700 active:bg-amber-400 active:text-neutral-950 rounded flex items-center justify-center transition-colors text-neutral-300"
                >
                  <ArrowUp size={16} />
                </button>
                <div></div>

                <button
                  onClick={() => handleMove(-6, 0, 'left')}
                  className="bg-neutral-800 hover:bg-neutral-700 active:bg-amber-400 active:text-neutral-950 rounded flex items-center justify-center transition-colors text-neutral-300"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="bg-neutral-950 rounded flex items-center justify-center text-[10px] text-neutral-500 font-mono">
                  +
                </div>
                <button
                  onClick={() => handleMove(6, 0, 'right')}
                  className="bg-neutral-800 hover:bg-neutral-700 active:bg-amber-400 active:text-neutral-950 rounded flex items-center justify-center transition-colors text-neutral-300"
                >
                  <ArrowRight size={16} />
                </button>

                <div></div>
                <button
                  onClick={() => handleMove(0, 6, 'down')}
                  className="bg-neutral-800 hover:bg-neutral-700 active:bg-amber-400 active:text-neutral-950 rounded flex items-center justify-center transition-colors text-neutral-300"
                >
                  <ArrowDown size={16} />
                </button>
                <div></div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleActionA}
                    className="w-11 h-11 rounded-full bg-rose-600/90 hover:bg-rose-500 active:scale-95 shadow-md flex items-center justify-center font-bold text-white text-xs font-mono transition-transform"
                  >
                    A
                  </button>
                  <span className="text-[10px] font-mono text-neutral-400">JUMP [Z]</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleActionB}
                    className="w-11 h-11 rounded-full bg-rose-700/90 hover:bg-rose-600 active:scale-95 shadow-md flex items-center justify-center font-bold text-white text-xs font-mono transition-transform"
                  >
                    B
                  </button>
                  <span className="text-[10px] font-mono text-neutral-400">ITEM [X]</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hardware Registers & Video Subsystem Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Real-Mode 16-Bit Registers Box */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono">
                INTEL 8086/286 REAL MODE REGISTERS
              </span>
              <span className="text-[11px] font-mono text-amber-400">16-BIT ARCH</span>
            </div>

            {/* General Purpose Registers */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">AX (Accum):</span>
                <span className="text-amber-300 tabular-nums">
                  0x{registers.ax.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">BX (Base):</span>
                <span className="text-amber-300 tabular-nums">
                  0x{registers.bx.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">CX (Count):</span>
                <span className="text-amber-300 tabular-nums">
                  0x{registers.cx.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">DX (Data/Port):</span>
                <span className="text-amber-300 tabular-nums">
                  0x{registers.dx.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>

              <div className="p-2 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">SI (Source):</span>
                <span className="text-neutral-200 tabular-nums">
                  0x{registers.si.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">DI (Dest):</span>
                <span className="text-neutral-200 tabular-nums">
                  0x{registers.di.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>

              <div className="p-2 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">BP (Base Ptr):</span>
                <span className="text-neutral-200 tabular-nums">
                  0x{registers.bp.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">SP (Stack Ptr):</span>
                <span className="text-neutral-200 tabular-nums">
                  0x{registers.sp.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Segment Registers */}
            <div className="grid grid-cols-4 gap-1.5 text-xs font-mono pt-1">
              <div className="p-1.5 bg-neutral-950 rounded border border-neutral-800 text-center">
                <span className="text-neutral-500 block text-[10px]">CS</span>
                <span className="text-emerald-400 tabular-nums">
                  0x{registers.cs.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
              <div className="p-1.5 bg-neutral-950 rounded border border-neutral-800 text-center">
                <span className="text-neutral-500 block text-[10px]">DS</span>
                <span className="text-emerald-400 tabular-nums">
                  0x{registers.ds.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
              <div className="p-1.5 bg-neutral-950 rounded border border-neutral-800 text-center">
                <span className="text-neutral-500 block text-[10px]">ES (VRAM)</span>
                <span className="text-emerald-400 font-bold tabular-nums">
                  0x{registers.es.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
              <div className="p-1.5 bg-neutral-950 rounded border border-neutral-800 text-center">
                <span className="text-neutral-500 block text-[10px]">SS</span>
                <span className="text-emerald-400 tabular-nums">
                  0x{registers.ss.toString(16).padStart(4, '0').toUpperCase()}
                </span>
              </div>
            </div>

            {/* CPU Flags */}
            <div className="flex items-center justify-between p-2 bg-neutral-950 rounded border border-neutral-800 text-xs font-mono">
              <span className="text-neutral-400">FLAGS:</span>
              <div className="flex items-center gap-2">
                <span className={registers.flags.cf ? 'text-amber-400 font-bold' : 'text-neutral-600'}>
                  CF:{registers.flags.cf ? '1' : '0'}
                </span>
                <span className={registers.flags.zf ? 'text-amber-400 font-bold' : 'text-neutral-600'}>
                  ZF:{registers.flags.zf ? '1' : '0'}
                </span>
                <span className={registers.flags.sf ? 'text-amber-400 font-bold' : 'text-neutral-600'}>
                  SF:{registers.flags.sf ? '1' : '0'}
                </span>
                <span className={registers.flags.of ? 'text-amber-400 font-bold' : 'text-neutral-600'}>
                  OF:{registers.flags.of ? '1' : '0'}
                </span>
                <span className={registers.flags.if ? 'text-amber-400 font-bold' : 'text-neutral-600'}>
                  IF:{registers.flags.if ? '1' : '0'}
                </span>
              </div>
            </div>
          </div>

          {/* VGA Subsystem Architecture Card */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono">
                VGA MODE 13h MEMORY &amp; I/O MAPPING
              </span>
              <span className="text-[11px] font-mono text-neutral-400">64,000 BYTES</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-800/40 pb-1 font-mono">
                <span>Linear Framebuffer:</span>
                <span className="text-neutral-200">0xA000:0000 – 0xA000:FA00</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-800/40 pb-1 font-mono">
                <span>DAC Palette Registers:</span>
                <span className="text-neutral-200">Port 0x3C8 (Index) / 0x3C9 (Data)</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-800/40 pb-1 font-mono">
                <span>Vertical Retrace Status:</span>
                <span className="text-neutral-200">Port 0x3DA (Bit 3 = VSync)</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-800/40 pb-1 font-mono">
                <span>Game Boy Tile Source:</span>
                <span className="text-neutral-200">2BPP Bitplanes (16 Bytes / Tile)</span>
              </div>
            </div>

            {/* Active DAC Palette Colors */}
            <div className="pt-2">
              <span className="text-[11px] text-neutral-400 font-medium block mb-1.5">
                Active 4-Color Game Boy Hardware Palette (6-Bit DAC RGB):
              </span>
              <div className="grid grid-cols-4 gap-2">
                {paletteTheme.colors.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded border border-neutral-800 flex flex-col items-center gap-1 bg-neutral-950"
                  >
                    <div
                      className="w-full h-5 rounded border border-neutral-700/50"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="font-mono text-[10px] text-neutral-400">Idx {idx}</span>
                    <span className="font-mono text-[9px] text-amber-300">
                      [{c.r},{c.g},{c.b}]
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Benchmark / Clock Cycles Card */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
            <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono block">
              ESTIMATED FRAME EXECUTION ON LEGACY x86
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Intel 8086 @ 4.77MHz</span>
                <span className="text-neutral-200 tabular-nums">
                  ~{(estCycles8086 / 4770).toFixed(1)} ms
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  ~{(4770 / (estCycles8086 / 1000)).toFixed(0)} FPS (Heavy)
                </span>
              </div>
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Intel 80286 @ 12MHz</span>
                <span className="text-neutral-200 tabular-nums">
                  ~{(estCycles286 / 12000).toFixed(1)} ms
                </span>
                <span className="text-[10px] text-emerald-400 block">
                  ~60 FPS (Smooth)
                </span>
              </div>
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Intel 386DX @ 33MHz</span>
                <span className="text-neutral-200 tabular-nums">
                  ~{(estCycles386 / 33000).toFixed(2)} ms
                </span>
                <span className="text-[10px] text-emerald-400 block">
                  ~350+ FPS
                </span>
              </div>
              <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">Intel 486DX2 @ 66MHz</span>
                <span className="text-neutral-200 tabular-nums">
                  ~{(estCycles486 / 66000).toFixed(2)} ms
                </span>
                <span className="text-[10px] text-emerald-400 block">
                  ~1400+ FPS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
