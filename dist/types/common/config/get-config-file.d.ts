import type { Octokit } from '../get-octokit.js';
import type { Logger } from '../logger.js';
import { type ConfigTarget } from './parse-config-target.js';
export declare const getConfigFile: (configTarget: ConfigTarget, parentTarget: ConfigTarget | undefined, octokit: Octokit, logger: Logger) => Promise<{
    config: {
        [x: string]: unknown;
        _extends: {
            from: string;
            strategy: Record<string, "append" | "override" | "prepend">;
        } | undefined;
    };
    fetchedFrom: ConfigTarget;
}>;
