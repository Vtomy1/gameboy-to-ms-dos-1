import React, { useState } from 'react';
import { MzExecutableData } from '../types';
import { Download, FileCode, CheckCircle, Info, Layers, Terminal } from 'lucide-react';

interface MzHeaderInspectorProps {
  mzData: MzExecutableData;
  onDownloadExe: () => void;
  onDownloadAsm: () => void;
}

export const MzHeaderInspector: React.FC<MzHeaderInspectorProps> = ({
  mzData,
  onDownloadExe,
  onDownloadAsm,
}) => {
  const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>('Signature (e_magic)');
  const [hexViewMode, setHexViewMode] = useState<'header' | 'full'>('header');

  // Prepare byte slice for hex viewer
  const bytesToShow = hexViewMode === 'header' ? mzData.header : mzData.fullBinary.slice(0, 256);

  // Group bytes into 16-byte rows
  const hexRows: { offset: number; hex: string[]; ascii: string[] }[] = [];
  for (let i = 0; i < bytesToShow.length; i += 16) {
    const chunk = bytesToShow.slice(i, i + 16);
    const hex: string[] = [];
    const ascii: string[] = [];
    for (let b = 0; b < chunk.length; b++) {
      const val = chunk[b];
      hex.push(val.toString(16).padStart(2, '0').toUpperCase());
      ascii.push(val >= 32 && val <= 126 ? String.fromCharCode(val) : '.');
    }
    hexRows.push({ offset: i, hex, ascii });
  }

  const activeFieldData = mzData.headerFields.find((f) => f.name === selectedField) || mzData.headerFields[0];

  return (
    <div className="space-y-6">
      {/* Title & Summary banner */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xl text-amber-400">
              MS-DOS MZ EXECUTABLE STRUCTURE (IMAGE_DOS_HEADER)
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
              16-Bit Real Mode · 64-Byte MZ Standard
            </span>
          </div>
          <p className="text-xs text-neutral-400 max-w-3xl">
            The MS-DOS MZ executable format begins with the 2-byte signature <code className="text-amber-300 font-mono">4Dh 5Ah</code> (Mark Zbikowski). DOS EXEC (<code className="text-neutral-300 font-mono">INT 21h, AH=4Bh</code>) evaluates this header to construct the Program Segment Prefix (PSP), initialize the stack segment (SS:SP), and transfer control to the Code Segment entry point (CS:IP).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadAsm}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors"
          >
            <FileCode size={14} className="text-amber-400" />
            <span>Export NASM .ASM</span>
          </button>
          <button
            onClick={onDownloadExe}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Download .EXE ({mzData.fileSizeBytes} B)</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
          <span className="text-neutral-500 block text-[11px]">TOTAL EXECUTABLE SIZE</span>
          <span className="text-base text-amber-300 font-bold tabular-nums">
            {mzData.fileSizeBytes.toLocaleString()} bytes
          </span>
          <span className="text-[10px] text-neutral-500 block">
            {Math.ceil(mzData.fileSizeBytes / 512)} disk sectors (512b)
          </span>
        </div>
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
          <span className="text-neutral-500 block text-[11px]">MZ HEADER SIZE</span>
          <span className="text-base text-emerald-400 font-bold tabular-nums">
            64 bytes (4 paragraphs)
          </span>
          <span className="text-[10px] text-neutral-500 block">
            Code offset: +0x0040
          </span>
        </div>
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
          <span className="text-neutral-500 block text-[11px]">INITIAL CS:IP ENTRY</span>
          <span className="text-base text-cyan-300 font-bold tabular-nums">
            {mzData.entryPointCsIp}
          </span>
          <span className="text-[10px] text-neutral-500 block">
            Relative to load segment (PSP+10h)
          </span>
        </div>
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
          <span className="text-neutral-500 block text-[11px]">INITIAL SS:SP STACK</span>
          <span className="text-base text-rose-300 font-bold tabular-nums">
            {mzData.initialStackSsSp}
          </span>
          <span className="text-[10px] text-neutral-500 block">
            1,024 bytes allocated
          </span>
        </div>
      </div>

      {/* Main Grid: Header Fields Breakdown on Left / Hex Viewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Header Fields Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono flex items-center gap-2">
                <Layers size={14} className="text-amber-400" />
                MZ HEADER FIELD DEFINITIONS
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                14 Standard Fields
              </span>
            </div>

            <div className="divide-y divide-neutral-800/60 max-h-[460px] overflow-y-auto font-mono text-xs">
              {mzData.headerFields.map((field) => {
                const isSelected = selectedField === field.name;
                const isHovered = hoveredOffset === field.offset;

                return (
                  <div
                    key={field.name}
                    onClick={() => setSelectedField(field.name)}
                    onMouseEnter={() => setHoveredOffset(field.offset)}
                    onMouseLeave={() => setHoveredOffset(null)}
                    className={`p-3 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-l-2 border-amber-400'
                        : isHovered
                        ? 'bg-neutral-800/50'
                        : 'hover:bg-neutral-800/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                          +{field.offset.toString(16).padStart(2, '0').toUpperCase()}h
                        </span>
                        <span className="text-neutral-200 font-semibold">{field.name}</span>
                        <span className="text-[10px] text-neutral-500">({field.symbol})</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                        {field.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-amber-300 font-bold block">{field.hex}</span>
                      <span className="text-[10px] text-neutral-500">{field.size} bytes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Field In-Depth Detail Card */}
          {activeFieldData && (
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
                <Info size={14} />
                <span className="font-semibold uppercase">{activeFieldData.name} Deep Dive</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Offset: <code className="text-amber-300 font-mono">0x{activeFieldData.offset.toString(16).padStart(2, '0').toUpperCase()}</code> ({activeFieldData.offset} decimal), Size: <code className="text-amber-300 font-mono">{activeFieldData.size} bytes</code>.
                Hex Value: <code className="text-amber-300 font-mono">{activeFieldData.hex}</code>.
              </p>
              <div className="text-xs text-neutral-400 space-y-1 pt-1 border-t border-neutral-800">
                <span className="text-[11px] text-neutral-500 block">DOS Loader Action:</span>
                <p>
                  When MS-DOS launches this program, it allocates memory from conventional RAM (below 640KB), builds a 256-byte PSP, then initializes the CPU registers based directly on these header words.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hex & ASCII Viewer Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono flex items-center gap-2">
                <Terminal size={14} className="text-emerald-400" />
                RAW BINARY HEX DUMP
              </span>
              <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[11px] font-mono">
                <button
                  onClick={() => setHexViewMode('header')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    hexViewMode === 'header'
                      ? 'bg-neutral-800 text-amber-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Header (64B)
                </button>
                <button
                  onClick={() => setHexViewMode('full')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    hexViewMode === 'full'
                      ? 'bg-neutral-800 text-amber-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Code+Data (256B)
                </button>
              </div>
            </div>

            {/* Hex viewer scroll area */}
            <div className="p-3 bg-neutral-950 overflow-x-auto font-mono text-[11px] leading-5 select-text">
              {/* Header column labels */}
              <div className="flex items-center text-neutral-500 pb-1 border-b border-neutral-800/80 mb-2">
                <span className="w-12 shrink-0">OFFSET</span>
                <div className="flex-1 grid grid-cols-16 gap-0.5 text-center px-2">
                  <span>00</span>
                  <span>01</span>
                  <span>02</span>
                  <span>03</span>
                  <span>04</span>
                  <span>05</span>
                  <span>06</span>
                  <span>07</span>
                  <span>08</span>
                  <span>09</span>
                  <span>0A</span>
                  <span>0B</span>
                  <span>0C</span>
                  <span>0D</span>
                  <span>0E</span>
                  <span>0F</span>
                </div>
                <span className="w-16 shrink-0 text-right">ASCII</span>
              </div>

              {/* Rows */}
              <div className="space-y-0.5">
                {hexRows.map((row) => (
                  <div key={row.offset} className="flex items-center hover:bg-neutral-900/60 rounded px-0.5">
                    {/* Offset */}
                    <span className="w-12 shrink-0 text-neutral-500">
                      {row.offset.toString(16).padStart(4, '0').toUpperCase()}
                    </span>

                    {/* 16 Hex bytes */}
                    <div className="flex-1 grid grid-cols-16 gap-0.5 text-center px-2">
                      {row.hex.map((h, bIdx) => {
                        const globalOffset = row.offset + bIdx;
                        const isMzSignature = globalOffset === 0 || globalOffset === 1;
                        const isHeader = globalOffset < 64;
                        const isHovered =
                          hoveredOffset !== null &&
                          globalOffset >= hoveredOffset &&
                          globalOffset < hoveredOffset + 2;

                        let colorClass = 'text-neutral-400';
                        if (isMzSignature) colorClass = 'text-amber-400 font-bold bg-amber-400/20 rounded';
                        else if (isHovered) colorClass = 'text-cyan-300 font-bold bg-cyan-500/30 rounded';
                        else if (isHeader) colorClass = 'text-amber-200/90';
                        else colorClass = 'text-emerald-400'; // Code / Data

                        return (
                          <span
                            key={bIdx}
                            title={`Byte offset 0x${globalOffset.toString(16).toUpperCase()}`}
                            className={`cursor-pointer ${colorClass}`}
                          >
                            {h}
                          </span>
                        );
                      })}
                    </div>

                    {/* ASCII preview */}
                    <span className="w-16 shrink-0 text-right text-neutral-400 tracking-wider">
                      {row.ascii.join('')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="p-3 bg-neutral-900/80 border-t border-neutral-800 text-[10px] font-mono flex items-center justify-between text-neutral-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
                  <span>'MZ' Magic</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-200"></span>
                  <span>MZ Header (64b)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-400"></span>
                  <span>x86 Machine Code</span>
                </span>
              </div>
              <span className="text-neutral-500">Little-Endian</span>
            </div>
          </div>

          {/* DOS EXEC Loading Sequence Guide */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2.5 text-xs">
            <span className="font-mono text-neutral-200 font-semibold block flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-400" />
              HOW MS-DOS LOADS THIS EXECUTABLE:
            </span>
            <ol className="list-decimal list-inside space-y-1.5 text-neutral-400 text-[11px] leading-relaxed">
              <li>
                <strong className="text-neutral-300">File Signature Check:</strong> DOS checks if first 2 bytes are <code className="text-amber-300 font-mono">0x4D 0x5A</code> ('MZ'). If not, it treats it as a flat COM file.
              </li>
              <li>
                <strong className="text-neutral-300">Memory Allocation:</strong> Calculates image size = <code className="text-amber-300 font-mono">(e_cp * 512) - e_cblp</code>, plus <code className="text-amber-300 font-mono">e_minalloc * 16</code> bytes.
              </li>
              <li>
                <strong className="text-neutral-300">Program Segment Prefix:</strong> DOS sets up a 256-byte PSP (containing FCB, DTA, environment pointer, command tail).
              </li>
              <li>
                <strong className="text-neutral-300">Header Relocation &amp; Transfer:</strong> Skips <code className="text-amber-300 font-mono">e_cparhdr * 16</code> bytes, applies relocations, sets <code className="text-emerald-300 font-mono">SS:SP</code> and jumps to <code className="text-emerald-300 font-mono">CS:IP</code>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
