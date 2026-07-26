import type { ConfigTarget } from './parse-config-target.js';
/**
 * current path is assumed to be the ".github" folder in your repo
 * root path is assumed to be the root of your repo
 * @example
 *  filepath: release-drafter.yml
 *  output: [repo root]/.github/release-drafter.yml
 * @example
 *  filepath: /src/../configs/release-drafter.yml
 *  output: [repo root]/configs/release-drafter.yml
 * @example
 *  filepath: ../configs/release-drafter.yml
 *  output: [repo root]/configs/release-drafter.yml
 * @example
 *  filepath: /src/../configs/release-drafter.yml
 *  output: [repo root]/configs/release-drafter.yml
 *
 * When specifying a target using _extends in the same repo & ref, current path is assumed to be
 * the dirname of the current (parent) config file, instead of the .github repository.
 * This allows files to reference each-other in a more natural way.
 */
export declare const normalizeFilepath: (config: Pick<ConfigTarget, 'ref' | 'repo' | 'filepath'>, parentConfig?: Pick<ConfigTarget, 'ref' | 'repo' | 'filepath'>) => string;
