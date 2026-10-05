export type RenderScalingMode = 'centered_1x' | 'integer_2x' | 'fit_aspect' | 'fullscreen_tilemap';

export type PaletteThemeId = 'dmg_classic' | 'pocket_bw' | 'sgb_neon' | 'dos_cga' | 'amber_phosphor' | 'vga_enhanced';

export interface VgaDacColor {
  r: number; // 0-63 (VGA DAC 6-bit)
  g: number; // 0-63
  b: number; // 0-63
  hex: string;
}

export interface PaletteTheme {
  id: PaletteThemeId;
  name: string;
  description: string;
  colors: [VgaDacColor, VgaDacColor, VgaDacColor, VgaDacColor];
  bezelBg: string;
}

export interface GameBoyTile {
  id: number;
  name: string;
  raw2bpp: Uint8Array; // 16 bytes
  pixels: number[][]; // 8x8 array of 0..3 indices
}

export interface GameBoySprite {
  id: number;
  x: number;
  y: number;
  tileIndex: number;
  flipX: boolean;
  flipY: boolean;
  palette: 0 | 1;
}

export interface MzHeaderField {
  name: string;
  offset: number;
  size: number;
  value: number;
  hex: string;
  symbol: string;
  description: string;
  importance: 'critical' | 'memory' | 'entry' | 'optional';
}

export interface MzExecutableData {
  header: Uint8Array; // 64 bytes
  codeAndData: Uint8Array;
  relocationTable: Uint8Array;
  fullBinary: Uint8Array;
  headerFields: MzHeaderField[];
  fileSizeBytes: number;
  codeSizeBytes: number;
  dataSizeBytes: number;
  entryPointCsIp: string;
  initialStackSsSp: string;
}

export interface X86RegisterState {
  ax: number;
  bx: number;
  cx: number;
  dx: number;
  si: number;
  di: number;
  bp: number;
  sp: number;
  cs: number;
  ip: number;
  ds: number;
  es: number;
  ss: number;
  flags: {
    cf: boolean; // Carry
    zf: boolean; // Zero
    sf: boolean; // Sign
    of: boolean; // Overflow
    if: boolean; // Interrupt
  };
}

export interface TranspiledInstruction {
  gbAddress: string;
  gbMnemonic: string;
  gbBytes: string;
  x86Address: string;
  x86Mnemonic: string;
  x86Opcode: string;
  cycles8086: number;
  cyclesGameBoy: number;
  explanation: string;
}

export interface CartridgeProject {
  id: string;
  title: string;
  genre: string;
  description: string;
  tileCount: number;
  tiles: GameBoyTile[];
  tilemap: number[]; // 32x32 = 1024 tile IDs
  sprites: GameBoySprite[];
  sampleAsmCode: string;
}
