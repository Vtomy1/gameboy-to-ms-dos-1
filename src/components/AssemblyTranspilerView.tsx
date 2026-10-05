import React, { useState } from 'react';
import { TRANSPILATION_MAPPINGS, generateFullAssemblySource } from '../utils/x86Assembler';
import { PaletteTheme } from '../types';
import { Code2, ArrowRight, Copy, Check, FileDown, Cpu, Sparkles } from 'lucide-react';

interface AssemblyTranspilerViewProps {
  paletteTheme: PaletteTheme;
  onDownloadAsm: () => void;
}

export const AssemblyTranspilerView: React.FC<AssemblyTranspilerViewProps> = ({
  paletteTheme,
  onDownloadAsm,
}) => {
  const [selectedInstructionIdx, setSelectedInstructionIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'transpiler_table' | 'full_nasm_source'>('transpiler_table');

  const fullSourceCode = generateFullAssemblySource(paletteTheme);
  const activeMapping = TRANSPILATION_MAPPINGS[selectedInstructionIdx];

  const handleCopy = () => {
    navigator.clipboard.writeText(fullSourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xl text-amber-400">
              SM83 (GAME BOY Z80) → x86 16-BIT REAL MODE TRANSPILER
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Intel 8086/80286/80386 · NASM / TASM Syntax
            </span>
          </div>
          <p className="text-xs text-neutral-400 max-w-3xl">
            Transpiles Game Boy SM83 instructions (8-bit registers A, B, C, D, E, H, L, and memory-mapped PPU ports) into 16-bit x86 Real Mode assembly (AX, BX, CX, DX, SI, DI, ES:DI video addressing, and hardware port I/O via <code className="text-amber-300 font-mono">IN/OUT</code>).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copied ASM' : 'Copy Source'}</span>
          </button>

          <button
            onClick={onDownloadAsm}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors shadow-sm"
          >
            <FileDown size={14} />
            <span>Download .ASM</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveCodeTab('transpiler_table')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors font-mono ${
            activeCodeTab === 'transpiler_table'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Instruction Translation Table
        </button>
        <button
          onClick={() => setActiveCodeTab('full_nasm_source')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors font-mono ${
            activeCodeTab === 'full_nasm_source'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Complete NASM 16-Bit Source Code
        </button>
      </div>

      {activeCodeTab === 'transpiler_table' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Instruction Table (7 cols) */}
          <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono flex items-center gap-2">
                <Code2 size={14} className="text-amber-400" />
                SIDE-BY-SIDE INSTRUCTION MAPPING
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                {TRANSPILATION_MAPPINGS.length} Core Routines
              </span>
            </div>

            <div className="divide-y divide-neutral-800/60 max-h-[520px] overflow-y-auto font-mono text-xs">
              {TRANSPILATION_MAPPINGS.map((item, idx) => {
                const isSelected = selectedInstructionIdx === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedInstructionIdx(idx)}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-l-2 border-amber-400'
                        : 'hover:bg-neutral-800/40'
                    }`}
                  >
                    {/* Game Boy Source */}
                    <div className="w-5/12 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                        <span>GB {item.gbAddress}</span>
                        <span>·</span>
                        <span className="text-neutral-400 font-bold">{item.gbBytes}</span>
                      </div>
                      <span className="text-amber-300 font-semibold block truncate">
                        {item.gbMnemonic}
                      </span>
                    </div>

                    <ArrowRight size={14} className="text-neutral-600 shrink-0" />

                    {/* x86 Destination */}
                    <div className="w-6/12 space-y-0.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-[10px] text-neutral-500">
                        <span>x86 {item.x86Address}</span>
                        <span>·</span>
                        <span className="text-emerald-400 font-bold">{item.x86Opcode}</span>
                      </div>
                      <span className="text-emerald-300 font-semibold block truncate">
                        {item.x86Mnemonic}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instruction Explanation & Architectural Comparison (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {activeMapping && (
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="font-semibold text-amber-300 uppercase flex items-center gap-1.5">
                    <Cpu size={14} />
                    TRANSLATION ANALYSIS
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Step {selectedInstructionIdx + 1} of {TRANSPILATION_MAPPINGS.length}
                  </span>
                </div>

                {/* Opcode & Cycle comparison */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 space-y-1">
                    <span className="text-neutral-500 block text-[10px]">GAME BOY SM83 (Z80)</span>
                    <span className="text-amber-300 font-bold block">{activeMapping.gbMnemonic}</span>
                    <span className="text-[10px] text-neutral-400 block">
                      Opcode: {activeMapping.gbBytes}
                    </span>
                    <span className="text-[10px] text-neutral-400 block">
                      Cycles: {activeMapping.cyclesGameBoy} T-states
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 space-y-1">
                    <span className="text-neutral-500 block text-[10px]">INTEL 8086 REAL MODE</span>
                    <span className="text-emerald-300 font-bold block truncate">
                      {activeMapping.x86Mnemonic.split(';')[0]}
                    </span>
                    <span className="text-[10px] text-neutral-400 block">
                      Opcode: {activeMapping.x86Opcode}
                    </span>
                    <span className="text-[10px] text-neutral-400 block">
                      Cycles: {activeMapping.cycles8086} clocks
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[11px] text-neutral-400 block font-sans">
                    Architectural Bridge:
                  </span>
                  <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                    {activeMapping.explanation}
                  </p>
                </div>
              </div>
            )}

            {/* Architecture Register Mapping Reference Card */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2.5 font-mono text-xs">
              <span className="font-semibold text-neutral-200 block border-b border-neutral-800 pb-2">
                SM83 → INTEL 8086 REGISTER ALLOCATION
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between p-1.5 bg-neutral-950 rounded border border-neutral-800/80">
                  <span className="text-amber-300">Accumulator (A)</span>
                  <span className="text-neutral-500">→</span>
                  <span className="text-emerald-300 font-bold">AL (Lower 8-bit of AX)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-neutral-950 rounded border border-neutral-800/80">
                  <span className="text-amber-300">Register Pair (BC)</span>
                  <span className="text-neutral-500">→</span>
                  <span className="text-emerald-300 font-bold">CX (Loop &amp; String Counter)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-neutral-950 rounded border border-neutral-800/80">
                  <span className="text-amber-300">Register Pair (DE)</span>
                  <span className="text-neutral-500">→</span>
                  <span className="text-emerald-300 font-bold">DX (I/O Port Address)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-neutral-950 rounded border border-neutral-800/80">
                  <span className="text-amber-300">Pointer Pair (HL)</span>
                  <span className="text-neutral-500">→</span>
                  <span className="text-emerald-300 font-bold">BX / SI / DI (Index / Pointer)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-neutral-950 rounded border border-neutral-800/80">
                  <span className="text-amber-300">VRAM Segment</span>
                  <span className="text-neutral-500">→</span>
                  <span className="text-emerald-300 font-bold">ES:DI (0xA000:0000 Mode 13h)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Full NASM Source Code View */
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono flex items-center gap-2">
              <Code2 size={14} className="text-amber-400" />
              FULL NASM 16-BIT REAL-MODE SOURCE (GAMEBOY.ASM)
            </span>
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <pre className="p-4 bg-neutral-950 overflow-x-auto text-xs font-mono leading-relaxed text-neutral-300 max-h-[600px] select-text">
            <code>{fullSourceCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
