import React, { useState } from 'react';
import { CartridgeProject, GameBoyTile, PaletteTheme } from '../types';
import { encode2BppTile, decode2BppTile } from '../utils/gameboy';
import { Grid, Eye, Edit3, RotateCw, Sparkles, RefreshCw } from 'lucide-react';

interface TileGraphicsStudioProps {
  project: CartridgeProject;
  setProject: React.Dispatch<React.SetStateAction<CartridgeProject>>;
  paletteTheme: PaletteTheme;
}

export const TileGraphicsStudio: React.FC<TileGraphicsStudioProps> = ({
  project,
  setProject,
  paletteTheme,
}) => {
  const [selectedTileId, setSelectedTileId] = useState<number>(project.tiles[0]?.id ?? 0);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(3);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  const selectedTile = project.tiles.find((t) => t.id === selectedTileId) || project.tiles[0];

  // Paint a pixel in the active tile
  const handlePixelClick = (x: number, y: number) => {
    if (!selectedTile) return;
    const newPixels = selectedTile.pixels.map((row, rIdx) =>
      rIdx === y
        ? row.map((px, cIdx) => (cIdx === x ? selectedColorIndex : px))
        : [...row]
    );

    const newRaw = encode2BppTile(newPixels);

    setProject((prev) => ({
      ...prev,
      tiles: prev.tiles.map((t) =>
        t.id === selectedTile.id
          ? { ...t, pixels: newPixels, raw2bpp: newRaw }
          : t
      ),
    }));
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    if (!selectedTile) return;
    const newPixels: number[][] = [];
    for (let x = 0; x < 8; x++) {
      const row: number[] = [];
      for (let y = 7; y >= 0; y--) {
        row.push(selectedTile.pixels[y][x]);
      }
      newPixels.push(row);
    }
    const newRaw = encode2BppTile(newPixels);
    setProject((prev) => ({
      ...prev,
      tiles: prev.tiles.map((t) =>
        t.id === selectedTile.id
          ? { ...t, pixels: newPixels, raw2bpp: newRaw }
          : t
      ),
    }));
  };

  // Invert colors
  const handleInvert = () => {
    if (!selectedTile) return;
    const newPixels = selectedTile.pixels.map((row) =>
      row.map((px) => 3 - px)
    );
    const newRaw = encode2BppTile(newPixels);
    setProject((prev) => ({
      ...prev,
      tiles: prev.tiles.map((t) =>
        t.id === selectedTile.id
          ? { ...t, pixels: newPixels, raw2bpp: newRaw }
          : t
      ),
    }));
  };

  // Clear tile
  const handleClear = () => {
    if (!selectedTile) return;
    const newPixels = Array(8).fill(null).map(() => Array(8).fill(0));
    const newRaw = encode2BppTile(newPixels);
    setProject((prev) => ({
      ...prev,
      tiles: prev.tiles.map((t) =>
        t.id === selectedTile.id
          ? { ...t, pixels: newPixels, raw2bpp: newRaw }
          : t
      ),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xl text-amber-400">
              GAME BOY 2BPP TILE &amp; MODE 13h CHUNKY CONVERTER
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
              8x8 Matrix · 16 Bytes/Tile · Interleaved Bitplanes
            </span>
          </div>
          <p className="text-xs text-neutral-400 max-w-3xl">
            In Game Boy hardware, each 8x8 tile is stored as 16 consecutive bytes in VRAM (<code className="text-amber-300 font-mono">$8000–$97FF</code>). Each row uses two interleaved byte planes: Plane 0 provides bit 0, Plane 1 provides bit 1. The Mode 13h renderer expands these 2-bit values into linear 8-bit bytes (<code className="text-emerald-300 font-mono">0xA000:0000</code>).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tile Catalog (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono flex items-center gap-2">
                <Grid size={14} className="text-amber-400" />
                CARTRIDGE TILESET ({project.tiles.length} TILES)
              </span>
              <span className="text-[11px] font-mono text-neutral-400">VRAM $8000+</span>
            </div>

            {/* Tile grid */}
            <div className="grid grid-cols-4 gap-2 max-h-[460px] overflow-y-auto p-1">
              {project.tiles.map((tile) => {
                const isSelected = tile.id === selectedTileId;
                return (
                  <button
                    key={tile.id}
                    onClick={() => setSelectedTileId(tile.id)}
                    className={`p-2 rounded flex flex-col items-center gap-1.5 transition-all text-left ${
                      isSelected
                        ? 'bg-amber-400/20 border-2 border-amber-400 shadow-sm'
                        : 'bg-neutral-950 border border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* 8x8 Mini Canvas preview */}
                    <div className="grid grid-cols-8 gap-[1px] w-12 h-12 bg-neutral-900 p-[1px] rounded overflow-hidden">
                      {tile.pixels.map((row, r) =>
                        row.map((px, c) => (
                          <div
                            key={`${r}-${c}`}
                            className="w-full h-full"
                            style={{
                              backgroundColor: paletteTheme.colors[px]?.hex ?? '#000',
                            }}
                          />
                        ))
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-300 truncate w-full text-center">
                      #{tile.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column: 8x8 Interactive Pixel Grid & Bitplane Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div>
                <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono block">
                  ACTIVE TILE: #{selectedTile.id} ({selectedTile.name})
                </span>
                <span className="text-[11px] text-neutral-400">
                  Click or drag to paint pixels
                </span>
              </div>

              {/* Tools */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRotate}
                  title="Rotate 90 deg"
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs transition-colors"
                >
                  <RotateCw size={13} />
                </button>
                <button
                  onClick={handleInvert}
                  title="Invert shades"
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs transition-colors"
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  onClick={handleClear}
                  title="Clear tile"
                  className="px-2 py-1 bg-neutral-800 hover:bg-rose-900/40 hover:text-rose-300 text-neutral-300 rounded text-[11px] font-mono transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Color Palette Selector for painting */}
            <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded border border-neutral-800">
              <span className="text-xs font-mono text-neutral-400">Paint Shade:</span>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map((shadeIdx) => {
                  const color = paletteTheme.colors[shadeIdx];
                  const isCurrent = selectedColorIndex === shadeIdx;
                  return (
                    <button
                      key={shadeIdx}
                      onClick={() => setSelectedColorIndex(shadeIdx)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all ${
                        isCurrent
                          ? 'border-amber-400 ring-2 ring-amber-400/30'
                          : 'border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-xs border border-black/40"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-xs font-mono text-neutral-300 font-semibold">
                        {shadeIdx}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 8x8 Interactive Canvas Grid */}
            <div
              className="flex justify-center p-3 bg-neutral-950 rounded-lg border border-neutral-800 select-none"
              onMouseDown={() => setIsMouseDown(true)}
              onMouseUp={() => setIsMouseDown(false)}
              onMouseLeave={() => setIsMouseDown(false)}
            >
              <div className="grid grid-cols-8 gap-1.5 p-2 bg-neutral-900 rounded-md border border-neutral-800 shadow-inner">
                {selectedTile.pixels.map((row, y) =>
                  row.map((pixelColor, x) => (
                    <div
                      key={`${y}-${x}`}
                      onClick={() => handlePixelClick(x, y)}
                      onMouseEnter={() => {
                        if (isMouseDown) handlePixelClick(x, y);
                      }}
                      className="w-8 h-8 rounded cursor-pointer transition-transform hover:scale-105 border border-black/40 flex items-center justify-center font-mono text-[10px] text-white/40 hover:text-white"
                      style={{
                        backgroundColor: paletteTheme.colors[pixelColor]?.hex ?? '#000',
                      }}
                    >
                      {pixelColor}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Scale preview (1x, 2x, 4x) */}
            <div className="flex items-center justify-between p-3 bg-neutral-950 rounded border border-neutral-800 text-xs font-mono">
              <span className="text-neutral-400">Live CRT Preview:</span>
              <div className="flex items-center gap-4">
                {/* 1x scale (8x8) */}
                <div className="flex flex-col items-center gap-1">
                  <div className="grid grid-cols-8 gap-0 w-4 h-4 overflow-hidden border border-neutral-700">
                    {selectedTile.pixels.map((row, r) =>
                      row.map((px, c) => (
                        <div
                          key={`1x-${r}-${c}`}
                          style={{ backgroundColor: paletteTheme.colors[px]?.hex }}
                        />
                      ))
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500">1x (8px)</span>
                </div>

                {/* 2x scale (16x16) */}
                <div className="flex flex-col items-center gap-1">
                  <div className="grid grid-cols-8 gap-0 w-8 h-8 overflow-hidden border border-neutral-700">
                    {selectedTile.pixels.map((row, r) =>
                      row.map((px, c) => (
                        <div
                          key={`2x-${r}-${c}`}
                          style={{ backgroundColor: paletteTheme.colors[px]?.hex }}
                        />
                      ))
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500">2x (16px)</span>
                </div>

                {/* 4x scale (32x32) */}
                <div className="flex flex-col items-center gap-1">
                  <div className="grid grid-cols-8 gap-0 w-12 h-12 overflow-hidden border border-neutral-700">
                    {selectedTile.pixels.map((row, r) =>
                      row.map((px, c) => (
                        <div
                          key={`4x-${r}-${c}`}
                          style={{ backgroundColor: paletteTheme.colors[px]?.hex }}
                        />
                      ))
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500">4x (32px)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 2BPP Bitplane Byte Breakdown (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="font-semibold text-neutral-200 tracking-wide flex items-center gap-1.5">
                <Edit3 size={13} className="text-amber-400" />
                2BPP RAW BITPLANES
              </span>
              <span className="text-[10px] text-neutral-400">16 BYTES</span>
            </div>

            <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
              Row <code className="text-amber-300 font-mono">y</code> uses <code className="text-cyan-300 font-mono">Plane 0</code> (bit 0) and <code className="text-emerald-300 font-mono">Plane 1</code> (bit 1):
            </p>

            {/* Row by row bitplane breakdown */}
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {Array(8).fill(0).map((_, y) => {
                const lowByte = selectedTile.raw2bpp[y * 2] ?? 0;
                const highByte = selectedTile.raw2bpp[y * 2 + 1] ?? 0;
                const lowBits = lowByte.toString(2).padStart(8, '0');
                const highBits = highByte.toString(2).padStart(8, '0');

                return (
                  <div
                    key={y}
                    className="p-2 bg-neutral-950 rounded border border-neutral-800/80 space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between text-neutral-500 border-b border-neutral-800/40 pb-0.5">
                      <span className="font-semibold text-neutral-300">Row {y}</span>
                      <span className="text-[10px]">
                        0x{lowByte.toString(16).padStart(2, '0').toUpperCase()} : 0x{highByte.toString(16).padStart(2, '0').toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400">P0 (Low):</span>
                      <span className="text-neutral-300 tracking-widest">{lowBits}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400">P1 (High):</span>
                      <span className="text-neutral-300 tracking-widest">{highBits}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
