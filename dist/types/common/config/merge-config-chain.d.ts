import type { Logger } from '../logger.js';
import type { getConfigFiles } from './get-config-files.js';
/**
 * Merges an `_extends` chain (ordered leaf-first, as returned by
 * `getConfigFiles`) into a single config object.
 *
 * Keys merge shallowly by default: the extending file's value replaces the
 * inherited one. A file can opt into appending or prepending a list key
 * to/onto the inherited list via the mapping form of `_extends`
 * (`_extends: {from: ..., strategy: {<key>: append|prepend}}`). A file's
 * strategy governs only the step where that file itself is merged onto the
 * configs it extends; it is not inherited by files extending it. The
 * `_extends` key is stripped from the result.
 */
export declare const mergeConfigChain: (configResults: Awaited<ReturnType<typeof getConfigFiles>>, logger: Logger) => Record<string, unknown>;
