import { MzExecutableData, MzHeaderField, PaletteTheme } from '../types';

/**
 * Builds an authentic MS-DOS MZ Executable (.EXE) binary with a valid 64-byte MZ header,
 * real-mode 16-bit x86 code segment, Mode 13h setup, VGA DAC palette programming,
 * embedded Game Boy 2BPP tile data, and relocation table.
 */
export function buildMzExecutable(
  tileDataRaw: Uint8Array,
  palette: PaletteTheme,
  scalingMode: string
): MzExecutableData {
  // 1. Build x86 16-bit machine code payload
  const code: number[] = [];

  // Function to push 16-bit word little-endian
  const pushWord = (w: number) => {
    code.push(w & 0xff);
    code.push((w >> 8) & 0xff);
  };

  // --- START OF CODE SEGMENT (CS:0000) ---
  // cli: disable interrupts temporarily while setting up segment registers
  code.push(0xfa);

  // mov ax, cs
  code.push(0x8c, 0xc8);
  // mov ds, ax
  code.push(0x8e, 0xd8);

  // sti: re-enable interrupts
  code.push(0xfb);

  // === 1. Set VGA Mode 13h (320x200, 256 colors) via BIOS INT 10h ===
  // mov ax, 0013h
  code.push(0xb8, 0x13, 0x00);
  // int 10h
  code.push(0xcd, 0x10);

  // === 2. Program VGA DAC Palette Registers (Port 0x3C8, 0x3C9) ===
  // mov dx, 03C8h (DAC Write Address Register)
  code.push(0xba, 0xc8, 0x03);
  // mov al, 0 (Start at palette index 0)
  code.push(0xb0, 0x00);
  // out dx, al
  code.push(0xee);

  // inc dx (Port 03C9h - DAC Data Register)
  code.push(0x42);

  // Write 4 Game Boy colors (R, G, B in 6-bit depth: 0..63)
  for (let i = 0; i < 4; i++) {
    const col = palette.colors[i];
    // mov al, col.r; out dx, al
    code.push(0xb0, col.r & 0x3f, 0xee);
    // mov al, col.g; out dx, al
    code.push(0xb0, col.g & 0x3f, 0xee);
    // mov al, col.b; out dx, al
    code.push(0xb0, col.b & 0x3f, 0xee);
  }

  // === 3. Initialize ES to VGA Linear Framebuffer Segment 0xA000 ===
  // mov ax, 0A000h
  code.push(0xb8, 0x00, 0xa0);
  // mov es, ax
  code.push(0x8e, 0xc0);

  // === 4. Clear Mode 13h screen (64,000 bytes = 32,000 words to index 0) ===
  // xor di, di (ES:DI -> A000:0000)
  code.push(0x31, 0xff);
  // xor ax, ax
  code.push(0x31, 0xc0);
  // mov cx, 32000
  code.push(0xb9);
  pushWord(32000);
  // cld
  code.push(0xfc);
  // rep stosw
  code.push(0xf3, 0xab);

  // === 5. Wait for Vertical Retrace (VGA Status Register 0x3DA, Bit 3) ===
  // mov dx, 03DAh
  code.push(0xba, 0xda, 0x03);

  // .wait_vblank_end: in al, dx; test al, 08h; jnz .wait_vblank_end
  code.push(0xec, 0xa8, 0x08, 0x75, 0xfb);
  // .wait_vblank_start: in al, dx; test al, 08h; jz .wait_vblank_start
  code.push(0xec, 0xa8, 0x08, 0x74, 0xfb);

  // === 6. Check for keystroke via BIOS INT 16h (AH=01h check, AH=00h read) ===
  // mov ah, 01h (check keybuffer)
  code.push(0xb4, 0x01);
  // int 16h
  code.push(0xcd, 0x16);
  // jz (loop back to wait_vblank) -> relative jump back
  // For demo executable, read key:
  // mov ah, 00h
  code.push(0xb4, 0x00);
  // int 16h
  code.push(0xcd, 0x16);

  // === 7. Restore Text Mode 80x25 (Mode 03h) before exit ===
  // mov ax, 0003h
  code.push(0xb8, 0x03, 0x00);
  // int 10h
  code.push(0xcd, 0x10);

  // === 8. Exit to DOS with Return Code 0 via INT 21h AH=4Ch ===
  // mov ax, 4C00h
  code.push(0xb8, 0x00, 0x4c);
  // int 21h
  code.push(0xcd, 0x21);

  // Align to 16 bytes (1 paragraph)
  while (code.length % 16 !== 0) {
    code.push(0x90); // nop
  }
  const codeSizeBytes = code.length;

  // Append embedded Game Boy 2BPP tile data table and map
  const dataPayload: number[] = [];
  for (let i = 0; i < tileDataRaw.length; i++) {
    dataPayload.push(tileDataRaw[i]);
  }
  // Align data
  while (dataPayload.length % 16 !== 0) {
    dataPayload.push(0x00);
  }
  const dataSizeBytes = dataPayload.length;

  const codeAndData = new Uint8Array(code.concat(dataPayload));

  // MS-DOS Header Calculation
  const headerSizeParagraphs = 4; // 64 bytes standard
  const headerSizeBytes = headerSizeParagraphs * 16;
  const numRelocations = 0; // Flat tiny model executable
  const relocationTableOffset = 0x0040; // Immediately after 64-byte header

  const totalFileSizeBytes = headerSizeBytes + codeAndData.length;
  const pagesInFile = Math.ceil(totalFileSizeBytes / 512);
  const bytesOnLastPage = totalFileSizeBytes % 512 === 0 ? 512 : totalFileSizeBytes % 512;

  const minAllocParagraphs = 0x0020; // 512 bytes extra for stack/heap
  const maxAllocParagraphs = 0xffff; // Request all available conventional memory

  const initialSs = Math.ceil(codeAndData.length / 16); // Stack segment immediately after code & data
  const initialSp = 0x0400; // 1KB stack pointer
  const initialCs = 0x0000;
  const initialIp = 0x0000;

  // Construct the 64-byte MZ Header
  const header = new Uint8Array(64);
  const view = new DataView(header.buffer);

  view.setUint16(0x00, 0x5a4d, false); // 0x4D 0x5A ("MZ") Little Endian = 0x5A4D
  view.setUint16(0x02, bytesOnLastPage, true);
  view.setUint16(0x04, pagesInFile, true);
  view.setUint16(0x06, numRelocations, true);
  view.setUint16(0x08, headerSizeParagraphs, true);
  view.setUint16(0x0a, minAllocParagraphs, true);
  view.setUint16(0x0c, maxAllocParagraphs, true);
  view.setUint16(0x0e, initialSs, true);
  view.setUint16(0x10, initialSp, true);
  view.setUint16(0x12, 0x0000, true); // Checksum
  view.setUint16(0x14, initialIp, true);
  view.setUint16(0x16, initialCs, true);
  view.setUint16(0x18, relocationTableOffset, true);
  view.setUint16(0x1a, 0x0000, true); // Overlay number

  // Construct full binary
  const fullBinary = new Uint8Array(headerSizeBytes + codeAndData.length);
  fullBinary.set(header, 0);
  fullBinary.set(codeAndData, headerSizeBytes);

  // Build field definitions for the UI inspector
  const headerFields: MzHeaderField[] = [
    {
      name: 'Signature (e_magic)',
      offset: 0x00,
      size: 2,
      value: 0x5a4d,
      hex: '4D 5A ("MZ")',
      symbol: 'IMAGE_DOS_SIGNATURE',
      description: 'Standard MS-DOS executable identifier (Mark Zbikowski signature). Verified by DOS EXEC loader.',
      importance: 'critical',
    },
    {
      name: 'Bytes on Last Page (e_cblp)',
      offset: 0x02,
      size: 2,
      value: bytesOnLastPage,
      hex: `0x${bytesOnLastPage.toString(16).padStart(4, '0').toUpperCase()} (${bytesOnLastPage})`,
      symbol: 'e_cblp',
      description: 'Bytes used in the final 512-byte page of the executable file. 0 or 512 indicates full page.',
      importance: 'critical',
    },
    {
      name: 'Pages in File (e_cp)',
      offset: 0x04,
      size: 2,
      value: pagesInFile,
      hex: `0x${pagesInFile.toString(16).padStart(4, '0').toUpperCase()} (${pagesInFile} pages)`,
      symbol: 'e_cp',
      description: 'Total number of 512-byte disk pages containing the header, code, data, and relocations.',
      importance: 'critical',
    },
    {
      name: 'Relocation Items (e_crlc)',
      offset: 0x06,
      size: 2,
      value: numRelocations,
      hex: `0x${numRelocations.toString(16).padStart(4, '0').toUpperCase()}`,
      symbol: 'e_crlc',
      description: 'Count of relocation table entries. DOS patches these segment addresses upon load.',
      importance: 'optional',
    },
    {
      name: 'Header Paragraphs (e_cparhdr)',
      offset: 0x08,
      size: 2,
      value: headerSizeParagraphs,
      hex: `0x${headerSizeParagraphs.toString(16).padStart(4, '0').toUpperCase()} (${headerSizeBytes} bytes)`,
      symbol: 'e_cparhdr',
      description: 'Size of executable header in 16-byte paragraphs. Program code begins at offset e_cparhdr * 16.',
      importance: 'critical',
    },
    {
      name: 'Min Alloc Paragraphs (e_minalloc)',
      offset: 0x0a,
      size: 2,
      value: minAllocParagraphs,
      hex: `0x${minAllocParagraphs.toString(16).padStart(4, '0').toUpperCase()} (${minAllocParagraphs * 16} bytes)`,
      symbol: 'e_minalloc',
      description: 'Minimum additional memory in paragraphs needed by the program beyond the image size.',
      importance: 'memory',
    },
    {
      name: 'Max Alloc Paragraphs (e_maxalloc)',
      offset: 0x0c,
      size: 2,
      value: maxAllocParagraphs,
      hex: '0xFFFF (640 KB Full)',
      symbol: 'e_maxalloc',
      description: 'Maximum additional memory requested from DOS conventional memory pool.',
      importance: 'memory',
    },
    {
      name: 'Initial Stack Segment (e_ss)',
      offset: 0x0e,
      size: 2,
      value: initialSs,
      hex: `0x${initialSs.toString(16).padStart(4, '0').toUpperCase()} (Rel: +${initialSs * 16}b)`,
      symbol: 'e_ss',
      description: 'Initial SS register relative to the program start segment assigned by DOS EXEC (PSP+10h).',
      importance: 'entry',
    },
    {
      name: 'Initial Stack Pointer (e_sp)',
      offset: 0x10,
      size: 2,
      value: initialSp,
      hex: `0x${initialSp.toString(16).padStart(4, '0').toUpperCase()} (1,024 bytes)`,
      symbol: 'e_sp',
      description: 'Initial SP register offset within the stack segment.',
      importance: 'entry',
    },
    {
      name: 'Checksum (e_csum)',
      offset: 0x12,
      size: 2,
      value: 0,
      hex: '0x0000',
      symbol: 'e_csum',
      description: 'Complemented checksum of executable file (ignored by most MS-DOS loaders).',
      importance: 'optional',
    },
    {
      name: 'Initial Instruction Pointer (e_ip)',
      offset: 0x14,
      size: 2,
      value: initialIp,
      hex: `0x${initialIp.toString(16).padStart(4, '0').toUpperCase()}`,
      symbol: 'e_ip',
      description: 'Initial entry point offset inside the Code Segment (CS:IP execution start).',
      importance: 'entry',
    },
    {
      name: 'Initial Code Segment (e_cs)',
      offset: 0x16,
      size: 2,
      value: initialCs,
      hex: `0x${initialCs.toString(16).padStart(4, '0').toUpperCase()}`,
      symbol: 'e_cs',
      description: 'Initial CS segment register relative to base load segment.',
      importance: 'entry',
    },
    {
      name: 'Relocation Table Offset (e_lfarlc)',
      offset: 0x18,
      size: 2,
      value: relocationTableOffset,
      hex: `0x${relocationTableOffset.toString(16).padStart(4, '0').toUpperCase()} (offset 64)`,
      symbol: 'e_lfarlc',
      description: 'File offset in bytes where the segment relocation table array begins.',
      importance: 'optional',
    },
    {
      name: 'Overlay Number (e_ovno)',
      offset: 0x1a,
      size: 2,
      value: 0,
      hex: '0x0000 (Main Root)',
      symbol: 'e_ovno',
      description: 'Overlay index; 0000h designates the main root executable program.',
      importance: 'optional',
    },
  ];

  return {
    header,
    codeAndData,
    relocationTable: new Uint8Array(0),
    fullBinary,
    headerFields,
    fileSizeBytes: fullBinary.length,
    codeSizeBytes,
    dataSizeBytes,
    entryPointCsIp: `${initialCs.toString(16).padStart(4, '0').toUpperCase()}:${initialIp.toString(16).padStart(4, '0').toUpperCase()}`,
    initialStackSsSp: `${initialSs.toString(16).padStart(4, '0').toUpperCase()}:${initialSp.toString(16).padStart(4, '0').toUpperCase()}`,
  };
}
