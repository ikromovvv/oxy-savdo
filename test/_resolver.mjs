// Node ESM loader hooki: kengaytmasiz nisbiy importlarni (`./kv`) hal qiladi.
// lib/ modullari Next.js/webpack uslubida `./kv` deb yozadi — bu Node'ning
// standart ESM resolveriga yetmaydi, shu yerda `.js` / `/index.js` sinab ko'ramiz.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      (err?.code === 'ERR_MODULE_NOT_FOUND' || err?.code === 'ERR_UNSUPPORTED_DIR_IMPORT') &&
      /^\.{1,2}\//.test(specifier) &&
      !/\.[cm]?jsx?$/.test(specifier)
    ) {
      for (const cand of [`${specifier}.js`, `${specifier}/index.js`]) {
        try {
          const r = await nextResolve(cand, context);
          if (r?.url && existsSync(fileURLToPath(r.url))) return r;
        } catch {
          /* keyingi nomzod */
        }
      }
    }
    throw err;
  }
}

// JSON fayllarni (masalan lib/skinMetaData.json) `import data from './x.json'` ko'rinishida yuklash:
// webpack buni o'zi hal qiladi, Node ESM esa import attribute talab qiladi — testlarda shu hook yetkazadi.
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    const text = readFileSync(fileURLToPath(url), 'utf8');
    return { format: 'module', source: `export default ${text};`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
