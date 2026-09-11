/**
 * Pure TypeScript QR Code Generator (Zero External Dependencies)
 * Generates an SVG path / matrix for any alphanumeric URL string.
 * Supports Byte mode (UTF-8 / ASCII) with Reed-Solomon Error Correction.
 */

// Galois Field GF(256) tables with primitive polynomial 0x11d
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    LOG_TABLE[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
  LOG_TABLE[0] = 0;
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

function rsComputeGenerator(degree: number): Uint8Array {
  let gen = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(gen.length + 1);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gfMultiply(gen[j], EXP_TABLE[i]);
      next[j + 1] ^= gen[j];
    }
    gen = next;
  }
  return gen;
}

function rsEncode(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsComputeGenerator(ecCount);
  const remainder = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      remainder[j] ^= gfMultiply(gen[j], factor);
    }
  }
  return remainder;
}

// QR Code Specifications for Versions 1-6 (Byte Mode, Low EC)
interface QRVersionSpec {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytes: number;
  alignments: number[];
}

const QR_SPECS: QRVersionSpec[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 19, ecBytes: 7, alignments: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 34, ecBytes: 10, alignments: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 55, ecBytes: 15, alignments: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 80, ecBytes: 20, alignments: [6, 26] },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 108, ecBytes: 26, alignments: [6, 30] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 136, ecBytes: 18 * 2, alignments: [6, 34] },
];

export function generateQRCodeMatrix(text: string): boolean[][] {
  const textBytes = new TextEncoder().encode(text);
  
  // Pick smallest fitting version
  let spec = QR_SPECS[0];
  for (const s of QR_SPECS) {
    // 4 bits mode + 8 bits length + dataBytes
    const maxPayload = s.dataBytes - 3;
    if (textBytes.length <= maxPayload) {
      spec = s;
      break;
    }
    spec = s;
  }

  // 1. Bit Buffer: 0100 (Byte mode) + 8-bit length + bytes + terminator + padding
  const bitBuf: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuf.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(textBytes.length, spec.version < 10 ? 8 : 16);
  for (const b of textBytes) {
    pushBits(b, 8);
  }

  // Add 4-bit terminator
  const maxBits = spec.dataBytes * 8;
  const termLen = Math.min(4, maxBits - bitBuf.length);
  pushBits(0, termLen);

  // Pad to 8-bit boundary
  while (bitBuf.length % 8 !== 0) {
    bitBuf.push(0);
  }

  // Pad with alternating 0xEC and 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitBuf.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bit buffer to data bytes
  const dataBytes = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < spec.dataBytes; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitBuf[i * 8 + b];
    }
    dataBytes[i] = byteVal;
  }

  // 2. Error Correction
  const ecBytes = rsEncode(dataBytes, spec.ecBytes);

  // Interleave data + ec
  const allCodewords = new Uint8Array(spec.totalBytes);
  allCodewords.set(dataBytes, 0);
  allCodewords.set(ecBytes, dataBytes.length);

  // 3. Matrix Setup
  const N = spec.size;
  const matrix: (boolean | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));

  function setFinder(r: number, c: number) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
          const inBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          const isWhite = dr === -1 || dr === 7 || dc === -1 || dc === 7 || (dr === 1 && dc >= 1 && dc <= 5) || (dr === 5 && dc >= 1 && dc <= 5) || (dc === 1 && dr >= 1 && dr <= 5) || (dc === 5 && dr >= 1 && dr <= 5);
          matrix[nr][nc] = (inBorder || inCenter) && !isWhite;
        }
      }
    }
  }

  // Place Finder Patterns
  setFinder(0, 0);
  setFinder(0, N - 7);
  setFinder(N - 7, 0);

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[4 * spec.version + 9][8] = true;

  // Alignment patterns
  if (spec.alignments.length > 0) {
    for (const r of spec.alignments) {
      for (const c of spec.alignments) {
        if (matrix[r][c] !== null) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            matrix[r + dr][c + dc] = isBorder || isCenter;
          }
        }
      }
    }
  }

  // Reserve format bits around finder patterns
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
    if (matrix[8][N - 1 - i] === null) matrix[8][N - 1 - i] = false;
    if (matrix[N - 1 - i][8] === null) matrix[N - 1 - i][8] = false;
  }

  // 4. Place Data Codewords (Zig-Zag upward/downward)
  let bitIdx = 0;
  const totalCodewordBits = spec.totalBytes * 8;
  let upwards = true;

  for (let right = N - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = upwards
      ? Array.from({ length: N }, (_, i) => N - 1 - i)
      : Array.from({ length: N }, (_, i) => i);

    for (const r of rows) {
      for (let c = right; c > right - 2; c--) {
        if (matrix[r][c] === null) {
          let bit = false;
          if (bitIdx < totalCodewordBits) {
            const bytePos = Math.floor(bitIdx / 8);
            const bitOffset = 7 - (bitIdx % 8);
            bit = ((allCodewords[bytePos] >> bitOffset) & 1) === 1;
            bitIdx++;
          }
          // Apply standard Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? !bit : bit;
        }
      }
    }
    upwards = !upwards;
  }

  // 5. Format Information: Mask 0 + EC Level L (01) => 15 bits: 0b111011111000100
  const FORMAT_BITS = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  // Write format info to top-left & split across other 2 finders
  for (let i = 0; i < 6; i++) matrix[8][i] = FORMAT_BITS[i] === 1;
  matrix[8][7] = FORMAT_BITS[6] === 1;
  matrix[8][8] = FORMAT_BITS[7] === 1;
  matrix[7][8] = FORMAT_BITS[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = FORMAT_BITS[i] === 1;

  for (let i = 0; i < 8; i++) matrix[N - 1 - i][8] = FORMAT_BITS[i] === 1;
  for (let i = 8; i < 15; i++) matrix[8][N - 15 + i] = FORMAT_BITS[i] === 1;

  return matrix.map((row) => row.map((cell) => Boolean(cell)));
}

/**
 * Returns SVG path data for the QR code matrix
 */
export function qrMatrixToSvgPath(matrix: boolean[][]): string {
  const n = matrix.length;
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }
  return path.trim();
}
