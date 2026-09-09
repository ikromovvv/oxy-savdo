// `node --import ./test/_setup.mjs` orqali yuklanadi — resolve hookini o'rnatadi.
import { register } from 'node:module';
register('./_resolver.mjs', import.meta.url);
