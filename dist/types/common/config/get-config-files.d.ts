import type { Octokit } from '../get-octokit.js';
import type { Logger } from '../logger.js';
export declare const getConfigFiles: (configFilename: string, currentContext: {
    repo: {
        owner: string;
        repo: string;
    };
    ref: string;
}, octokit: Octokit, logger: Logger) => Promise<{
    config: {
        [x: string]: unknown;
        _extends: {
            from: string;
            strategy: Record<string, "append" | "override" | "prepend">;
        } | undefined;
    };
    fetchedFrom: import("./parse-config-target.js").ConfigTarget;
}[]>;
