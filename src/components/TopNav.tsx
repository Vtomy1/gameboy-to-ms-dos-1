import React from 'react';
import { Volume2, VolumeX, Download, FileCode } from 'lucide-react';

export type TabType = 'runtime' | 'mz_header' | 'tile_studio' | 'transpiler' | 'hardware';

interface TopNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  onDownloadExe: () => void;
  onDownloadAsm: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  audioEnabled,
  setAudioEnabled,
  onDownloadExe,
  onDownloadAsm,
}) => {
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('runtime')}
          className="text-left font-pixel text-2xl tracking-wider text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs animate-pulse"></span>
          GB2DOS STUDIO
        </button>
        <span className="hidden sm:inline text-xs text-neutral-500 font-mono">
          Mode 13h · 320x200 · Real Mode x86
        </span>
      </div>

      {/* Zone 2: 4-5 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-1 bg-neutral-950/80 p-1 rounded-md border border-neutral-800/80">
        <button
          onClick={() => setActiveTab('runtime')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            activeTab === 'runtime'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Mode 13h Runtime
        </button>
        <button
          onClick={() => setActiveTab('mz_header')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            activeTab === 'mz_header'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          MZ Header &amp; Binary
        </button>
        <button
          onClick={() => setActiveTab('tile_studio')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            activeTab === 'tile_studio'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          2BPP Tile Studio
        </button>
        <button
          onClick={() => setActiveTab('transpiler')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            activeTab === 'transpiler'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          SM83 → x86 Assembly
        </button>
        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            activeTab === 'hardware'
              ? 'bg-neutral-800 text-amber-300 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Legacy Hardware
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          title={audioEnabled ? 'Mute PC Speaker' : 'Enable PC Speaker'}
          className={`p-2 rounded border text-xs transition-colors ${
            audioEnabled
              ? 'border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20'
              : 'border-neutral-800 text-neutral-500 hover:text-neutral-300 bg-neutral-900'
          }`}
        >
          {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        <button
          onClick={onDownloadAsm}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors whitespace-nowrap"
        >
          <FileCode size={14} className="text-amber-400" />
          <span>.ASM Source</span>
        </button>

        <button
          onClick={onDownloadExe}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded font-mono font-semibold transition-colors shadow-sm whitespace-nowrap"
        >
          <Download size={14} />
          <span>Build .EXE</span>
        </button>
      </div>
    </header>
  );
};
