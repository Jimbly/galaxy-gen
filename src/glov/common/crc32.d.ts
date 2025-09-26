// Efficient CRCing of Buffers
export default function crc32(buf: Buffer | Uint8Array | number[]): number;
export function crc32(buf: Buffer | Uint8Array | number[]): number;

// Note: not particularly efficient
export function crc32string(str: string): number;
