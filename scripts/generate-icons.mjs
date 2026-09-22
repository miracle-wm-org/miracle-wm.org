// Generates the site favicons from the source artwork in public/assets/favicon.svg.
// Run with: bun run icons
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const SOURCE = 'public/assets/favicon.svg';
const src = readFileSync(SOURCE);

const render = (size) =>
    sharp(src, { density: 384 })
        .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ compressionLevel: 9, palette: true })
        .toBuffer();

// ICO container around PNG frames, per the BITMAPFILEHEADER-less ICONDIR layout.
function ico(frames) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type: icon
    header.writeUInt16LE(frames.length, 4);

    const directory = Buffer.alloc(16 * frames.length);
    let offset = header.length + directory.length;

    frames.forEach(({ size, data }, i) => {
        const entry = i * 16;
        directory.writeUInt8(size === 256 ? 0 : size, entry + 0); // width
        directory.writeUInt8(size === 256 ? 0 : size, entry + 1); // height
        directory.writeUInt8(0, entry + 2); // palette size (0 = no palette)
        directory.writeUInt8(0, entry + 3); // reserved
        directory.writeUInt16LE(1, entry + 4); // color planes
        directory.writeUInt16LE(32, entry + 6); // bits per pixel
        directory.writeUInt32LE(data.length, entry + 8);
        directory.writeUInt32LE(offset, entry + 12);
        offset += data.length;
    });

    return Buffer.concat([header, directory, ...frames.map((f) => f.data)]);
}

const icoSizes = [16, 32, 48];
const frames = [];
for (const size of icoSizes) {
    frames.push({ size, data: await render(size) });
}
writeFileSync('public/favicon.ico', ico(frames));
writeFileSync('public/apple-touch-icon.png', await render(180));

console.log('wrote public/favicon.ico, public/apple-touch-icon.png');
