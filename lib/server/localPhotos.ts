import fs from 'node:fs';
import path from 'node:path';

const EXT = ['jpg', 'jpeg', 'webp', 'png', 'avif'];

/** Finds photos you have placed in public/images/destinations/<destination-id>.<ext>. */
export function localPhotos(ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const dir = path.join(process.cwd(), 'public', 'images', 'destinations');
  for (const id of ids) {
    for (const ext of EXT) {
      if (fs.existsSync(path.join(dir, `${id}.${ext}`))) {
        out[id] = `/images/destinations/${id}.${ext}`;
        break;
      }
    }
  }
  return out;
}
