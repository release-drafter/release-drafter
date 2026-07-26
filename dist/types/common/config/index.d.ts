import type { Octokit } from '../get-octokit.js';
import type { Logger } from '../logger.js';
/**
 * Loads configuration from one or multiple files and resolves with
 * the combined configuration as well as the list of contexts the configuration
 * was loaded from
 */
export declare function composeConfigGet(configFilename: string, currentContext: {
    repo: {
        owner: string;
        repo: string;
    };
    ref: string;
}, octokit: Octokit, logger: Logger): Promise<{
    contexts: import("./parse-config-target.js").ConfigTarget[];
    config: Record<string, unknown>;
}>;
