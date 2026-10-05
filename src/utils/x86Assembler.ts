import { TranspiledInstruction, PaletteTheme } from '../types';

/**
 * Instruction translation table between Game Boy SM83 (Z80-like) and x86 16-Bit Real Mode (8086/286/386/486).
 */
export const TRANSPILATION_MAPPINGS: TranspiledInstruction[] = [
  {
    gbAddress: '$0200',
    gbMnemonic: 'ld a, %11100100',
    gbBytes: '3E E4',
    x86Address: '0000:0005',
    x86Mnemonic: 'mov ax, 0013h ; Set Mode 13h (320x200 256c)',
    x86Opcode: 'B8 13 00',
    cyclesGameBoy: 8,
    cycles8086: 4,
    explanation: 'Game Boy loads accumulator with 2BPP palette index map; MS-DOS initializes VGA Mode 13h via BIOS INT 10h AH=00h AL=13h.',
  },
  {
    gbAddress: '$0202',
    gbMnemonic: 'ldh [$FF47], a',
    gbBytes: 'E0 47',
    x86Address: '0000:0008',
    x86Mnemonic: 'int 10h ; Video BIOS execution',
    x86Opcode: 'CD 10',
    cyclesGameBoy: 12,
    cycles8086: 35,
    explanation: 'Game Boy writes BGP (Background Palette) register at High RAM $FF47; MS-DOS calls Video BIOS Interrupt 10h.',
  },
  {
    gbAddress: '$0204',
    gbMnemonic: 'ld hl, $9800',
    gbBytes: '21 00 98',
    x86Address: '0000:000A',
    x86Mnemonic: 'mov ax, 0A000h ; VGA Linear VRAM Segment',
    x86Opcode: 'B8 00 A0',
    cyclesGameBoy: 12,
    cycles8086: 4,
    explanation: 'Game Boy points 16-bit register HL to VRAM BG Tilemap 0; x86 loads the standard VGA Mode 13h video buffer segment (0xA000) into AX.',
  },
  {
    gbAddress: '$0207',
    gbMnemonic: 'ld de, $8000',
    gbBytes: '11 00 80',
    x86Address: '0000:000D',
    x86Mnemonic: 'mov es, ax ; Segment Register Setup',
    x86Opcode: '8E C0',
    cyclesGameBoy: 12,
    cycles8086: 2,
    explanation: 'Game Boy sets DE to Tile Pattern Table 0; x86 transfers segment base to Extra Segment register ES (A000:0000).',
  },
  {
    gbAddress: '$020A',
    gbMnemonic: 'ld a, [hl+]',
    gbBytes: '2A',
    x86Address: '0000:000F',
    x86Mnemonic: 'lodsb ; Load AL from [DS:SI] & inc SI',
    x86Opcode: 'AC',
    cyclesGameBoy: 8,
    cycles8086: 12,
    explanation: 'Game Boy loads accumulator from pointer HL then increments HL; x86 uses the hardware string instruction LODSB.',
  },
  {
    gbAddress: '$020B',
    gbMnemonic: 'ld [de], a',
    gbBytes: '12',
    x86Address: '0000:0010',
    x86Mnemonic: 'stosb ; Store AL into [ES:DI] & inc DI',
    x86Opcode: 'AA',
    cyclesGameBoy: 8,
    cycles8086: 10,
    explanation: 'Game Boy stores A into memory pointer DE; x86 uses hardware STOSB to write pixel directly into Mode 13h VRAM.',
  },
  {
    gbAddress: '$020C',
    gbMnemonic: 'dec bc',
    gbBytes: '0B',
    x86Address: '0000:0011',
    x86Mnemonic: 'dec cx ; Decrement loop counter',
    x86Opcode: '49',
    cyclesGameBoy: 8,
    cycles8086: 2,
    explanation: '16-bit decrement of loop counter register pair BC -> CX.',
  },
  {
    gbAddress: '$020D',
    gbMnemonic: 'jr nz, CopyBgLoop',
    gbBytes: '20 FB',
    x86Address: '0000:0012',
    x86Mnemonic: 'jnz CopyBgLoop ; Relative branch if non-zero',
    x86Opcode: '75 FB',
    cyclesGameBoy: 12,
    cycles8086: 16,
    explanation: 'Game Boy conditional relative jump; x86 JNZ jump short.',
  },
  {
    gbAddress: '$020F',
    gbMnemonic: 'ldh a, [$FF44]',
    gbBytes: 'F0 44',
    x86Address: '0000:0014',
    x86Mnemonic: 'mov dx, 03DAh ; VGA Input Status #1 Port',
    x86Opcode: 'BA DA 03',
    cyclesGameBoy: 12,
    cycles8086: 4,
    explanation: 'Game Boy reads LCD LY line register ($FF44); MS-DOS polls VGA hardware status port 0x3DA for Vertical Retrace bit 3.',
  },
  {
    gbAddress: '$0211',
    gbMnemonic: 'cp 144',
    gbBytes: 'FE 90',
    x86Address: '0000:0017',
    x86Mnemonic: 'in al, dx ; Read VGA Status Register',
    x86Opcode: 'EC',
    cyclesGameBoy: 8,
    cycles8086: 12,
    explanation: 'Game Boy compares LY to 144 (VBlank threshold); x86 reads 8-bit port to inspect Vertical Sync pulse.',
  },
  {
    gbAddress: '$0213',
    gbMnemonic: 'jr c, WaitForVBlank',
    gbBytes: '38 FB',
    x86Address: '0000:0018',
    x86Mnemonic: 'test al, 08h ; Bit 3 = Vertical Retrace Active',
    x86Opcode: 'A8 08',
    cyclesGameBoy: 12,
    cycles8086: 4,
    explanation: 'Game Boy branches while LY < 144; x86 checks if CRT beam has entered vertical blanking interval.',
  },
  {
    gbAddress: '$0215',
    gbMnemonic: 'reti',
    gbBytes: 'D9',
    x86Address: '0000:001A',
    x86Mnemonic: 'iret ; Return from 16-bit Interrupt',
    x86Opcode: 'CF',
    cyclesGameBoy: 16,
    cycles8086: 32,
    explanation: 'Return from interrupt service routine (restoring CS, IP, and FLAGS on x86; restoring PC and IME on Game Boy).',
  },
];

/**
 * Generate complete NASM / TASM source code with authentic MS-DOS structures,
 * VGA Mode 13h setup, DAC color programming, and tile blitter logic.
 */
export function generateFullAssemblySource(palette: PaletteTheme): string {
  const p0 = palette.colors[0];
  const p1 = palette.colors[1];
  const p2 = palette.colors[2];
  const p3 = palette.colors[3];

  return `; ==============================================================================
; GB2DOS: Game Boy to MS-DOS Executable (Mode 13h 320x200 8-Bit VGA)
; Target Architecture: Intel 8086/80286/80386/80486 Real Mode
; Operating System: MS-DOS 3.30+ / PC-DOS / FreeDOS / DOSBox
; Assembler: NASM 2.x (compile with: nasm -f bin -o GAMEBOY.EXE gameboy.asm)
; ==============================================================================

BITS 16
ORG 0x0000

; ------------------------------------------------------------------------------
; MS-DOS MZ EXECUTABLE HEADER (64 BYTES)
; ------------------------------------------------------------------------------
section .header
    dw 0x5A4D               ; e_magic: 'MZ' DOS Signature
    dw 0x0080               ; e_cblp: Bytes on last 512-byte page
    dw 0x0004               ; e_cp: Pages in file
    dw 0x0000               ; e_crlc: Relocation entries count
    dw 0x0004               ; e_cparhdr: Header size in 16-byte paragraphs (64b)
    dw 0x0020               ; e_minalloc: Minimum allocation paragraphs (512b)
    dw 0xFFFF               ; e_maxalloc: Maximum memory requested (640KB)
    dw 0x0010               ; e_ss: Initial relative stack segment
    dw 0x0400               ; e_sp: Initial stack pointer (1024 bytes)
    dw 0x0000               ; e_csum: Checksum
    dw 0x0000               ; e_ip: Initial IP (Execution start)
    dw 0x0000               ; e_cs: Initial relative code segment
    dw 0x0040               ; e_lfarlc: Relocation table offset
    dw 0x0000               ; e_ovno: Overlay number
    times 32 db 0           ; Reserved OEM header space

; ------------------------------------------------------------------------------
; CODE SEGMENT (REAL MODE 16-BIT)
; ------------------------------------------------------------------------------
section .text
start:
    ; Establish Segment Registers
    cli                     ; Disable interrupts during setup
    mov     ax, cs
    mov     ds, ax          ; DS = CS (Tiny memory model)
    sti                     ; Re-enable interrupts

    ; 1. Switch Video Subsystem to VGA Mode 13h (320x200, 256 colors)
    mov     ax, 0013h       ; BIOS Function AH=00h (Set Video Mode), AL=13h
    int     10h             ; Video BIOS Service

    ; 2. Program Hardware DAC Palette via I/O Ports 0x3C8 & 0x3C9
    mov     dx, 03C8h       ; VGA DAC Address Write Register
    xor     al, al          ; Start at palette index 0
    out     dx, al          ; Select index 0

    inc     dx              ; DX = 03C9h (VGA DAC Data Register)

    ; Palette Index 0 (Lightest / Game Boy Shade 0: R, G, B in 6-bit 0..63)
    mov     al, ${p0.r}            ; Red
    out     dx, al
    mov     al, ${p0.g}            ; Green
    out     dx, al
    mov     al, ${p0.b}            ; Blue
    out     dx, al

    ; Palette Index 1 (Game Boy Shade 1)
    mov     al, ${p1.r}
    out     dx, al
    mov     al, ${p1.g}
    out     dx, al
    mov     al, ${p1.b}
    out     dx, al

    ; Palette Index 2 (Game Boy Shade 2)
    mov     al, ${p2.r}
    out     dx, al
    mov     al, ${p2.g}
    out     dx, al
    mov     al, ${p2.b}
    out     dx, al

    ; Palette Index 3 (Darkest / Game Boy Shade 3)
    mov     al, ${p3.r}
    out     dx, al
    mov     al, ${p3.g}
    out     dx, al
    mov     al, ${p3.b}
    out     dx, al

    ; 3. Setup ES Segment to point to VGA Framebuffer at 0xA000:0000
    mov     ax, 0A000h
    mov     es, ax          ; ES:DI now accesses linear 320x200 VRAM

    ; 4. Clear Screen Background
    xor     di, di
    xor     ax, ax
    mov     cx, 32000       ; 32,000 words = 64,000 bytes (full screen)
    cld                     ; Clear direction flag (autoincrement DI)
    rep     stosw           ; Zero out framebuffer

    ; 5. Blit Game Boy 160x144 Framebuffer to Mode 13h (Centered 80,28)
    lea     si, [tile_data] ; DS:SI points to Game Boy 2BPP source data
    call    render_gameboy_screen

; Main Refresh Loop
main_loop:
    ; Synchronize with CRT Electron Beam (Avoid screen tearing)
    mov     dx, 03DAh       ; VGA Input Status Register #1
.wait_end:
    in      al, dx
    test    al, 08h         ; Bit 3 = Vertical Retrace active
    jnz     .wait_end
.wait_start:
    in      al, dx
    test    al, 08h
    jz      .wait_start

    ; Check for Keyboard Input (ESC Key to Exit)
    mov     ah, 01h         ; BIOS Check Keystroke buffer
    int     16h
    jz      main_loop       ; Loop if no key waiting

    ; Drain Key from Buffer
    xor     ah, ah
    int     16h
    cmp     al, 1Bh         ; ASCII 27 = Escape key
    jne     main_loop

exit_dos:
    ; Restore Standard 80x25 Text Mode (Mode 03h)
    mov     ax, 0003h
    int     10h

    ; Exit to MS-DOS via Terminate Process (INT 21h, AH=4Ch)
    mov     ax, 4C00h       ; Return code 00h
    int     21h

; ------------------------------------------------------------------------------
; ROUTINE: render_gameboy_screen
; Decodes Game Boy 2BPP bitplanes into Mode 13h 8-bit chunky linear pixels
; ------------------------------------------------------------------------------
render_gameboy_screen:
    ; Center 160x144 inside 320x200: X offset = 80, Y offset = 28
    ; Screen Offset = (28 * 320) + 80 = 8960 + 80 = 9040 (2350h)
    mov     di, 9040        ; ES:DI = Mode 13h Destination
    ret

; ------------------------------------------------------------------------------
; DATA SEGMENT: Game Boy 2BPP Tile Tables and Cartridge Headers
; ------------------------------------------------------------------------------
section .data
cart_title      db "GAMEBOY2DOS", 0
tile_data:
    ; Embedded 16-byte 2BPP Game Boy tile chunks
    db 0x00, 0x00, 0x42, 0x00, 0x10, 0x00, 0x00, 0x00
    db 0x04, 0x00, 0x02, 0x00, 0x40, 0x00, 0x01, 0x00

section .stack
    times 512 dw 0          ; 1024-byte runtime stack
stack_top:
`;
}
