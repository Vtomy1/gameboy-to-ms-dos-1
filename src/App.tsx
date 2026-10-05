import React, { useState, useMemo, useCallback } from 'react';
import { TopNav, TabType } from './components/TopNav';
import { DosRuntimeView } from './components/DosRuntimeView';
import { MzHeaderInspector } from './components/MzHeaderInspector';
import { TileGraphicsStudio } from './components/TileGraphicsStudio';
import { AssemblyTranspilerView } from './components/AssemblyTranspilerView';
import { HardwareSpecsView } from './components/HardwareSpecsView';

import {
  CartridgeProject,
  PaletteThemeId,
  RenderScalingMode,
} from './types';
import { SAMPLE_PROJECTS } from './utils/gameboy';
import { PALETTE_THEMES } from './utils/palettes';
import { buildMzExecutable } from './utils/mzHeader';
import { generateFullAssemblySource } from './utils/x86Assembler';
import { pcSpeaker } from './utils/sound';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('runtime');
  const [allProjects, setAllProjects] = useState<CartridgeProject[]>(SAMPLE_PROJECTS);
  const [currentProject, setCurrentProject] = useState<CartridgeProject>(SAMPLE_PROJECTS[0]);
  const [paletteThemeId, setPaletteThemeId] = useState<PaletteThemeId>('dmg_classic');
  const [scalingMode, setScalingMode] = useState<RenderScalingMode>('centered_1x');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Sync audio toggle with engine
  const handleToggleAudio = useCallback((enabled: boolean) => {
    setAudioEnabled(enabled);
    pcSpeaker.setEnabled(enabled);
    if (enabled) {
      pcSpeaker.biosBeep();
    }
  }, []);

  const activePalette = useMemo(() => {
    return PALETTE_THEMES[paletteThemeId] || PALETTE_THEMES.dmg_classic;
  }, [paletteThemeId]);

  // Combine raw 2BPP tiles from the project
  const combinedRawTiles = useMemo(() => {
    const totalBytes = currentProject.tiles.length * 16;
    const buffer = new Uint8Array(totalBytes);
    currentProject.tiles.forEach((tile, idx) => {
      buffer.set(tile.raw2bpp, idx * 16);
    });
    return buffer;
  }, [currentProject]);

  // Build authentic MS-DOS MZ Executable (.EXE) binary
  const mzData = useMemo(() => {
    return buildMzExecutable(combinedRawTiles, activePalette, scalingMode);
  }, [combinedRawTiles, activePalette, scalingMode]);

  // Download .EXE binary blob
  const handleDownloadExe = useCallback(() => {
    pcSpeaker.playCoin();
    const blob = new Blob([mzData.fullBinary as unknown as BlobPart], { type: 'application/x-msdownload' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentProject.id.toUpperCase()}.EXE`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [mzData, currentProject]);

  // Download .ASM source code
  const handleDownloadAsm = useCallback(() => {
    pcSpeaker.playJump();
    const asmCode = generateFullAssemblySource(activePalette);
    const blob = new Blob([asmCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentProject.id.toUpperCase()}.ASM`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activePalette, currentProject]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* 3-Zone Top Navigation Contract */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        audioEnabled={audioEnabled}
        setAudioEnabled={handleToggleAudio}
        onDownloadExe={handleDownloadExe}
        onDownloadAsm={handleDownloadAsm}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'runtime' && (
          <DosRuntimeView
            project={currentProject}
            setProject={setCurrentProject}
            allProjects={allProjects}
            paletteTheme={activePalette}
            setPaletteThemeId={setPaletteThemeId}
            scalingMode={scalingMode}
            setScalingMode={setScalingMode}
          />
        )}

        {activeTab === 'mz_header' && (
          <MzHeaderInspector
            mzData={mzData}
            onDownloadExe={handleDownloadExe}
            onDownloadAsm={handleDownloadAsm}
          />
        )}

        {activeTab === 'tile_studio' && (
          <TileGraphicsStudio
            project={currentProject}
            setProject={setCurrentProject}
            paletteTheme={activePalette}
          />
        )}

        {activeTab === 'transpiler' && (
          <AssemblyTranspilerView
            paletteTheme={activePalette}
            onDownloadAsm={handleDownloadAsm}
          />
        )}

        {activeTab === 'hardware' && <HardwareSpecsView />}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-5 px-6 text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-semibold">GB2DOS Studio</span>
            <span>·</span>
            <span>Game Boy SM83 PPU to MS-DOS Mode 13h (320×200 8-Bit) &amp; MZ Executable Transpiler</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>Intel 8086/286/386/486 Real Mode</span>
            <span>·</span>
            <span>VGA Port 0x3C8/0x3C9 DAC</span>
            <span>·</span>
            <span>INT 10h / INT 21h</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
