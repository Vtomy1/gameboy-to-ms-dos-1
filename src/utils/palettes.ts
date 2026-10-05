import { PaletteTheme, PaletteThemeId, VgaDacColor } from '../types';

// Convert 6-bit VGA DAC value (0-63) to 8-bit screen RGB (0-255)
export function dacToRgb(dac: number): number {
  return Math.min(255, Math.round((dac / 63) * 255));
}

// Convert 8-bit screen RGB to 6-bit VGA DAC (0-63)
export function rgbToDac(rgb: number): number {
  return Math.min(63, Math.max(0, Math.floor((rgb / 255) * 63)));
}

export function vgaColor(r: number, g: number, b: number): VgaDacColor {
  const r8 = dacToRgb(r);
  const g8 = dacToRgb(g);
  const b8 = dacToRgb(b);
  const hex = `#${r8.toString(16).padStart(2, '0')}${g8.toString(16).padStart(2, '0')}${b8.toString(16).padStart(2, '0')}`.toUpperCase();
  return { r, g, b, hex };
}

export const PALETTE_THEMES: Record<PaletteThemeId, PaletteTheme> = {
  dmg_classic: {
    id: 'dmg_classic',
    name: 'DMG-01 Classic Pea Green',
    description: 'Original 1989 Nintendo Game Boy reflective STN LCD screen green tones',
    colors: [
      vgaColor(39, 47, 4),   // #9BBC0F - Lightest
      vgaColor(35, 43, 4),   // #8BAC0F - Light
      vgaColor(12, 24, 12),  // #306230 - Dark
      vgaColor(4, 14, 4),    // #0F380F - Darkest
    ],
    bezelBg: '#8B956D',
  },
  pocket_bw: {
    id: 'pocket_bw',
    name: 'Game Boy Pocket Monochromatic',
    description: '1996 true black-and-white FSTN LCD display high contrast profile',
    colors: [
      vgaColor(58, 58, 58),  // Pure White
      vgaColor(40, 40, 40),  // Light Gray
      vgaColor(20, 20, 20),  // Dark Slate
      vgaColor(2, 2, 2),     // Pitch Black
    ],
    bezelBg: '#2A2D34',
  },
  sgb_neon: {
    id: 'sgb_neon',
    name: 'Super Game Boy Arcade 1994',
    description: 'Vibrant 16-color Super Famicom / SNES colorized arcade palette',
    colors: [
      vgaColor(63, 61, 48),  // Warm cream
      vgaColor(63, 28, 12),  // Coral orange
      vgaColor(20, 38, 56),  // Deep oceanic blue
      vgaColor(8, 8, 20),    // Midnight navy
    ],
    bezelBg: '#341539',
  },
  dos_cga: {
    id: 'dos_cga',
    name: 'IBM PC CGA Mode 1 (High Intensity)',
    description: 'Classic MS-DOS 4-color CGA graphics palette: Black, Cyan, Magenta, White',
    colors: [
      vgaColor(63, 63, 63),  // Bright White
      vgaColor(63, 21, 63),  // High-intensity Magenta
      vgaColor(21, 63, 63),  // High-intensity Cyan
      vgaColor(0, 0, 0),     // Solid Black
    ],
    bezelBg: '#1B1E2B',
  },
  amber_phosphor: {
    id: 'amber_phosphor',
    name: 'IBM 5151 Amber Monoware',
    description: 'Warm P3 monochrome amber phosphor legacy CRT monitor glow',
    colors: [
      vgaColor(63, 44, 4),   // Glowing Amber
      vgaColor(48, 28, 0),   // Deep Gold
      vgaColor(26, 14, 0),   // Dark Bronze
      vgaColor(2, 1, 0),     // Black
    ],
    bezelBg: '#2E1A05',
  },
  vga_enhanced: {
    id: 'vga_enhanced',
    name: 'VGA Mode 13h 256-Color Studio',
    description: 'Extended 8-bit MS-DOS game palette with rich retro 256-color remap',
    colors: [
      vgaColor(56, 62, 52),  // Soft mint white
      vgaColor(28, 48, 56),  // Cyan slate
      vgaColor(54, 22, 28),  // Crimson brick
      vgaColor(10, 12, 16),  // Shadow iron
    ],
    bezelBg: '#1E2522',
  },
};
