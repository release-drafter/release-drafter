import type { Octokit } from '../get-octokit.js';
import type { ConfigTarget } from './parse-config-target.js';
export declare const getConfigFileFromRepo: (configTarget: ConfigTarget, octokit: Octokit) => Promise<string>;
