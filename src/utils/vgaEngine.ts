import { GameBoyTile, GameBoySprite, PaletteTheme, RenderScalingMode } from '../types';

export class VgaMode13hEngine {
  // Linear 64,000-byte Mode 13h video RAM at segment 0xA000:0000
  public vram: Uint8Array = new Uint8Array(320 * 200);

  // 256-color DAC Palette table [R, G, B] each 0..255
  public dacPalette: Uint8Array = new Uint8Array(256 * 3);

  // Internal Game Boy 160x144 framebuffer (indices 0..3)
  public gbScreen: Uint8Array = new Uint8Array(160 * 144);

  constructor() {
    this.initDefaultDac();
  }

  public initDefaultDac() {
    // Fill with default standard VGA colors, index 0-3 set to dark shades
    for (let i = 0; i < 256; i++) {
      this.dacPalette[i * 3 + 0] = (i * 7) & 0xff;
      this.dacPalette[i * 3 + 1] = (i * 11) & 0xff;
      this.dacPalette[i * 3 + 2] = (i * 13) & 0xff;
    }
  }

  /**
   * Apply 4-color Game Boy palette to DAC indices 0..3
   */
  public updateDacFromTheme(theme: PaletteTheme) {
    for (let i = 0; i < 4; i++) {
      const c = theme.colors[i];
      // Convert 6-bit DAC (0..63) to 8-bit screen RGB (0..255)
      const r8 = Math.min(255, Math.round((c.r / 63) * 255));
      const g8 = Math.min(255, Math.round((c.g / 63) * 255));
      const b8 = Math.min(255, Math.round((c.b / 63) * 255));
      this.dacPalette[i * 3 + 0] = r8;
      this.dacPalette[i * 3 + 1] = g8;
      this.dacPalette[i * 3 + 2] = b8;
    }

    // Set border/bezel colors for indices 4..15
    this.dacPalette[4 * 3 + 0] = 30; // Dark border
    this.dacPalette[4 * 3 + 1] = 30;
    this.dacPalette[4 * 3 + 2] = 36;

    this.dacPalette[5 * 3 + 0] = 60; // Light border highlight
    this.dacPalette[5 * 3 + 1] = 62;
    this.dacPalette[5 * 3 + 2] = 70;
  }

  /**
   * Render Game Boy 160x144 frame from tilemap, tiles, and sprites
   */
  public renderGameBoyFrame(
    tiles: GameBoyTile[],
    tilemap: number[],
    sprites: GameBoySprite[],
    scrollX: number,
    scrollY: number
  ) {
    // 1. Render 160x144 Background Layer from 32x32 Tilemap
    for (let screenY = 0; screenY < 144; screenY++) {
      const mapY = (screenY + scrollY) % 256;
      const tileY = Math.floor(mapY / 8);
      const pixelY = mapY % 8;

      for (let screenX = 0; screenX < 160; screenX++) {
        const mapX = (screenX + scrollX) % 256;
        const tileX = Math.floor(mapX / 8);
        const pixelX = mapX % 8;

        const tileId = tilemap[tileY * 32 + tileX] ?? 0;
        const tile = tiles[tileId % tiles.length] ?? tiles[0];
        const pixelColor = tile ? (tile.pixels[pixelY]?.[pixelX] ?? 0) : 0;

        this.gbScreen[screenY * 160 + screenX] = pixelColor;
      }
    }

    // 2. Render OAM Sprites (up to 40 sprites)
    for (const sprite of sprites) {
      const sprX = sprite.x - scrollX;
      const sprY = sprite.y - scrollY;

      // Check bounds
      if (sprX <= -8 || sprX >= 160 || sprY <= -8 || sprY >= 144) continue;

      const tile = tiles[sprite.tileIndex % tiles.length];
      if (!tile) continue;

      for (let py = 0; py < 8; py++) {
        const drawY = sprY + py;
        if (drawY < 0 || drawY >= 144) continue;

        const srcY = sprite.flipY ? (7 - py) : py;

        for (let px = 0; px < 8; px++) {
          const drawX = sprX + px;
          if (drawX < 0 || drawX >= 160) continue;

          const srcX = sprite.flipX ? (7 - px) : px;
          const colorIndex = tile.pixels[srcY]?.[srcX] ?? 0;

          // In Game Boy hardware, pixel value 0 is transparent for sprites
          if (colorIndex !== 0) {
            this.gbScreen[drawY * 160 + drawX] = colorIndex;
          }
        }
      }
    }
  }

  /**
   * Blit Game Boy Screen into Mode 13h (320x200 linear VRAM) according to scaling mode
   */
  public blitToMode13h(mode: RenderScalingMode, scrollPanY: number = 0) {
    // Clear Mode 13h screen with border color (index 4)
    this.vram.fill(4);

    if (mode === 'centered_1x') {
      // 160x144 centered in 320x200
      // Left offset: (320 - 160) / 2 = 80
      // Top offset: (200 - 144) / 2 = 28
      const offsetX = 80;
      const offsetY = 28;

      // Draw subtle bevel frame
      for (let y = offsetY - 2; y <= offsetY + 145; y++) {
        for (let x = offsetX - 2; x <= offsetX + 161; x++) {
          if (y < offsetY || y >= offsetY + 144 || x < offsetX || x >= offsetX + 160) {
            this.vram[y * 320 + x] = 5; // Bevel highlight
          }
        }
      }

      // Copy pixels
      for (let y = 0; y < 144; y++) {
        const srcRow = y * 160;
        const dstRow = (offsetY + y) * 320 + offsetX;
        for (let x = 0; x < 160; x++) {
          this.vram[dstRow + x] = this.gbScreen[srcRow + x];
        }
      }
    } else if (mode === 'integer_2x') {
      // 2x integer scale: 160 x 2 = 320 px (fills full screen width!)
      // Height: 144 x 2 = 288 px. Since Mode 13h is 200 lines, we clip with scroll pan
      const maxScroll = 288 - 200; // 88 lines
      const clampedPan = Math.max(0, Math.min(maxScroll, scrollPanY));

      for (let vgaY = 0; vgaY < 200; vgaY++) {
        const srcY = Math.floor((vgaY + clampedPan) / 2);
        if (srcY >= 144) continue;
        const srcRow = srcY * 160;
        const dstRow = vgaY * 320;

        for (let vgaX = 0; vgaX < 320; vgaX++) {
          const srcX = Math.floor(vgaX / 2);
          this.vram[dstRow + vgaX] = this.gbScreen[srcRow + srcX];
        }
      }
    } else if (mode === 'fit_aspect') {
      // Scale 160x144 to 320x200 using hardware aspect ratio stretch
      const scaleX = 320 / 160; // exactly 2
      const scaleY = 200 / 144; // ~1.3888

      for (let vgaY = 0; vgaY < 200; vgaY++) {
        const srcY = Math.min(143, Math.floor(vgaY / scaleY));
        const srcRow = srcY * 160;
        const dstRow = vgaY * 320;

        for (let vgaX = 0; vgaX < 320; vgaX++) {
          const srcX = Math.min(159, Math.floor(vgaX / scaleX));
          this.vram[dstRow + vgaX] = this.gbScreen[srcRow + srcX];
        }
      }
    } else if (mode === 'fullscreen_tilemap') {
      // Full 320x200 tile canvas: 40 tiles wide x 25 tiles high
      // 160x144 is repeated or panned across full 320x200
      for (let vgaY = 0; vgaY < 200; vgaY++) {
        const srcY = vgaY % 144;
        const srcRow = srcY * 160;
        const dstRow = vgaY * 320;

        for (let vgaX = 0; vgaX < 320; vgaX++) {
          const srcX = vgaX % 160;
          this.vram[dstRow + vgaX] = this.gbScreen[srcRow + srcX];
        }
      }
    }
  }

  /**
   * Draw Mode 13h buffer onto an HTML Canvas 2D context ImageData
   */
  public renderToCanvas(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    const data = imgData.data;
    const vram = this.vram;
    const dac = this.dacPalette;

    let p = 0;
    for (let i = 0; i < 64000; i++) {
      const colorIdx = vram[i];
      const dacOffset = colorIdx * 3;
      data[p + 0] = dac[dacOffset + 0]; // R
      data[p + 1] = dac[dacOffset + 1]; // G
      data[p + 2] = dac[dacOffset + 2]; // B
      data[p + 3] = 255;                // A
      p += 4;
    }

    ctx.putImageData(imgData, 0, 0);
  }
}
