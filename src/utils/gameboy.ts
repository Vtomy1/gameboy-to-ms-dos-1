import { CartridgeProject, GameBoyTile, GameBoySprite } from '../types';

/**
 * Decode 16 bytes of Game Boy 2BPP tile data into an 8x8 matrix of color indices (0..3).
 * Interleaved bitplane structure:
 * Row y is represented by byte 2*y (low bitplane) and byte 2*y + 1 (high bitplane).
 */
export function decode2BppTile(bytes: Uint8Array): number[][] {
  const pixels: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: number[] = [];
    const lowByte = bytes[y * 2] ?? 0;
    const highByte = bytes[y * 2 + 1] ?? 0;
    for (let x = 0; x < 8; x++) {
      const bitPos = 7 - x;
      const lowBit = (lowByte >> bitPos) & 1;
      const highBit = (highByte >> bitPos) & 1;
      const colorIndex = (highBit << 1) | lowBit;
      row.push(colorIndex);
    }
    pixels.push(row);
  }
  return pixels;
}

/**
 * Encode an 8x8 matrix of color indices (0..3) into 16 bytes of Game Boy 2BPP data.
 */
export function encode2BppTile(pixels: number[][]): Uint8Array {
  const bytes = new Uint8Array(16);
  for (let y = 0; y < 8; y++) {
    let lowByte = 0;
    let highByte = 0;
    for (let x = 0; x < 8; x++) {
      const colorIndex = pixels[y]?.[x] ?? 0;
      const bitPos = 7 - x;
      const lowBit = colorIndex & 1;
      const highBit = (colorIndex >> 1) & 1;
      lowByte |= (lowBit << bitPos);
      highByte |= (highBit << bitPos);
    }
    bytes[y * 2] = lowByte;
    bytes[y * 2 + 1] = highByte;
  }
  return bytes;
}

/**
 * Helper to build a tile from a string pattern of 8 rows of 8 chars (e.g. '.', '1', '2', '3')
 */
export function makeTile(id: number, name: string, pattern: string[]): GameBoyTile {
  const pixels: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: number[] = [];
    const line = pattern[y] || '........';
    for (let x = 0; x < 8; x++) {
      const ch = line[x] || '.';
      let val = 0;
      if (ch === '1') val = 1;
      else if (ch === '2') val = 2;
      else if (ch === '3' || ch === '#') val = 3;
      else val = 0;
      row.push(val);
    }
    pixels.push(row);
  }
  return {
    id,
    name,
    raw2bpp: encode2BppTile(pixels),
    pixels,
  };
}

// Built-in tile library for Project 1: Dungeon Crawler
const DUNGEON_TILES: GameBoyTile[] = [
  makeTile(0, 'Cobblestone Floor', [
    '00000000',
    '01000010',
    '00010000',
    '00000000',
    '00100000',
    '00000100',
    '01000000',
    '00000010',
  ]),
  makeTile(1, 'Stone Brick Wall', [
    '33333333',
    '31113113',
    '31213123',
    '33333333',
    '31131113',
    '31231213',
    '33333333',
    '22222222',
  ]),
  makeTile(2, 'Dungeon Gate Top', [
    '33333333',
    '30000003',
    '30300303',
    '30300303',
    '30300303',
    '30300303',
    '30300303',
    '30300303',
  ]),
  makeTile(3, 'Treasure Chest', [
    '00333300',
    '03222230',
    '33333333',
    '31122113',
    '31133113',
    '31111113',
    '33333333',
    '00000000',
  ]),
  makeTile(4, 'Torch on Wall', [
    '00010000',
    '00121000',
    '00232000',
    '00121000',
    '00030000',
    '00333000',
    '00030000',
    '00030000',
  ]),
  makeTile(5, 'Water Ripples', [
    '11111111',
    '12221122',
    '22112221',
    '11111111',
    '11221122',
    '22212211',
    '11111111',
    '12211221',
  ]),
  makeTile(6, 'Banner / Crest', [
    '33333333',
    '03222230',
    '03211230',
    '03211230',
    '00322300',
    '00322300',
    '00033000',
    '00003000',
  ]),
  makeTile(7, 'Spike Trap', [
    '00000000',
    '01000010',
    '13100131',
    '13100131',
    '33300333',
    '33311333',
    '33333333',
    '22222222',
  ]),
  // Knight Player Sprites
  makeTile(8, 'Knight Front', [
    '00333300',
    '03222230',
    '03300330',
    '00333300',
    '03122130',
    '33122133',
    '00311300',
    '00300300',
  ]),
  makeTile(9, 'Knight Walk', [
    '00333300',
    '03222230',
    '03300330',
    '00333300',
    '03122130',
    '33122133',
    '00310000',
    '00033000',
  ]),
  makeTile(10, 'Skeleton Enemy', [
    '00333300',
    '03133130',
    '03333330',
    '00133100',
    '00033000',
    '03333330',
    '00033000',
    '00300300',
  ]),
  makeTile(11, 'HUD Heart Icon', [
    '01100110',
    '13311331',
    '33333333',
    '33333333',
    '13333331',
    '01333310',
    '00133100',
    '00011000',
  ]),
];

// Built-in tile library for Project 2: Space Raider
const SPACE_TILES: GameBoyTile[] = [
  makeTile(0, 'Deep Space Star', [
    '00000000',
    '00000000',
    '00010000',
    '00121000',
    '00010000',
    '00000000',
    '00000000',
    '00000000',
  ]),
  makeTile(1, 'Distant Galaxy', [
    '00000000',
    '00011000',
    '00122100',
    '01233210',
    '00122100',
    '00011000',
    '00000000',
    '00000000',
  ]),
  makeTile(2, 'Metallic Hull Plate', [
    '33333333',
    '31111112',
    '31222212',
    '31222212',
    '31222212',
    '31222212',
    '31111112',
    '22222222',
  ]),
  makeTile(3, 'Energy Reactor Grid', [
    '33333333',
    '30011003',
    '30122103',
    '31233213',
    '31233213',
    '30122103',
    '30011003',
    '33333333',
  ]),
  makeTile(4, 'Starship Fighter', [
    '00033000',
    '00133100',
    '00133100',
    '01233210',
    '12233221',
    '33333333',
    '03022030',
    '00133100',
  ]),
  makeTile(5, 'Alien Swarm Drone', [
    '00300300',
    '03333330',
    '33133133',
    '33333333',
    '33333333',
    '03000030',
    '03300330',
    '30000003',
  ]),
  makeTile(6, 'Plasma Laser', [
    '00033000',
    '00133100',
    '00122100',
    '00122100',
    '00122100',
    '00122100',
    '00133100',
    '00033000',
  ]),
  makeTile(7, 'Explosion Burst', [
    '10011001',
    '01233210',
    '02333320',
    '13311331',
    '13311331',
    '02333320',
    '01233210',
    '10011001',
  ]),
];

// Generate 32x32 dungeon map
function createDungeonMap(): number[] {
  const map: number[] = new Array(32 * 32).fill(0); // 0 is floor
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      // outer wall
      if (y === 0 || y === 31 || x === 0 || x === 31) {
        map[y * 32 + x] = 1; // wall
      } else if (y === 5 && x >= 4 && x <= 27) {
        // inner castle wall with gate
        map[y * 32 + x] = (x === 15 || x === 16) ? 2 : 1;
      } else if (y === 4 && (x === 6 || x === 12 || x === 19 || x === 25)) {
        map[y * 32 + x] = 4; // torches
      } else if (y === 12 && x >= 8 && x <= 23 && (x % 4 === 0)) {
        map[y * 32 + x] = 1; // stone pillars
      } else if (y === 18 && (x === 10 || x === 21)) {
        map[y * 32 + x] = 3; // chests
      } else if (y >= 22 && y <= 25 && x >= 6 && x <= 25) {
        map[y * 32 + x] = 5; // water moat
      }
    }
  }
  return map;
}

// Generate 32x32 space map
function createSpaceMap(): number[] {
  const map: number[] = new Array(32 * 32).fill(0);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const hash = (x * 37 + y * 73) % 100;
      if (hash > 92) {
        map[y * 32 + x] = 1; // galaxy
      } else if (hash > 75) {
        map[y * 32 + x] = 0; // star
      } else {
        map[y * 32 + x] = 0;
      }
    }
  }
  return map;
}

export const SAMPLE_PROJECTS: CartridgeProject[] = [
  {
    id: 'dungeon_quest',
    title: 'Dungeon of the 8-Bit Paladin',
    genre: 'Top-Down Dungeon Crawler',
    description: '160x144 Game Boy action RPG dungeon with stone walls, chests, torches, and animated hero knight.',
    tileCount: DUNGEON_TILES.length,
    tiles: DUNGEON_TILES,
    tilemap: createDungeonMap(),
    sprites: [
      { id: 0, x: 80, y: 72, tileIndex: 8, flipX: false, flipY: false, palette: 0 },
      { id: 1, x: 120, y: 56, tileIndex: 10, flipX: false, flipY: false, palette: 1 },
      { id: 2, x: 48, y: 96, tileIndex: 10, flipX: true, flipY: false, palette: 1 },
    ],
    sampleAsmCode: `; ============================================================
; GAME BOY SM83 (Z80) SOURCE ROUTINE: RENDER_SPRITE_LOOP
; ROM Bank 00, Address: $0240
; ============================================================
SECTION "EngineRender", ROM0[$0240]

InitPPU_Mode13h:
    ld      a, %11100100      ; BGP palette: 3,2,1,0
    ldh     [$FF47], a        ; rBGP
    ld      hl, $9800         ; Game Boy VRAM BG Map Base
    ld      bc, 32 * 32       ; 1024 tiles to transfer
    ld      de, $A000         ; Target Mode 13h Framebuffer Segment

CopyBgLoop:
    ld      a, [hl+]          ; Fetch tile index from Game Boy VRAM
    call    ExpandTile2Bpp    ; Convert 2BPP bitplanes to 8-bit chunky
    dec     bc
    ld      a, b
    or      c
    jr      nz, CopyBgLoop

WaitForVBlank:
    ldh     a, [$FF44]        ; Read LY register (Scanline counter)
    cp      144               ; Game Boy LCD VBlank threshold
    jr      c, WaitForVBlank

    ret
`,
  },
  {
    id: 'space_raider',
    title: 'Cosmo Raider 1989',
    genre: 'Vertical Scrolling Shmup',
    description: 'High-speed vertical space shooter with starfield parallax, laser cannon, and alien flagship.',
    tileCount: SPACE_TILES.length,
    tiles: SPACE_TILES,
    tilemap: createSpaceMap(),
    sprites: [
      { id: 0, x: 80, y: 110, tileIndex: 4, flipX: false, flipY: false, palette: 0 },
      { id: 1, x: 80, y: 90, tileIndex: 6, flipX: false, flipY: false, palette: 0 },
      { id: 2, x: 60, y: 30, tileIndex: 5, flipX: false, flipY: false, palette: 1 },
      { id: 3, x: 100, y: 30, tileIndex: 5, flipX: true, flipY: false, palette: 1 },
    ],
    sampleAsmCode: `; ============================================================
; GAME BOY SM83 (Z80) SOURCE ROUTINE: STARFIELD_SCROLLER
; ROM Bank 00, Address: $0310
; ============================================================
SECTION "Starfield", ROM0[$0310]

UpdateStarfield:
    ldh     a, [$FF42]        ; Read SCY (Scroll Y)
    inc     a                 ; Scroll down 1 pixel per frame
    ldh     [$FF42], a        ; Write back to hardware register

UpdateLaser:
    ld      hl, $FE00         ; OAM sprite table (Sprite 0 Y)
    ld      a, [hl]
    sub     4                 ; Move laser upward
    ld      [hl], a
    cp      $10               ; Off-screen check
    ret
`,
  },
];
