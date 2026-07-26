import type { Octokit } from './get-octokit.js';
import type { Logger } from './logger.js';
export type GitHubContext = {
    repo: {
        owner: string;
        repo: string;
    };
    ref?: string;
    serverUrl: string;
    octokit: Octokit;
    logger: Logger;
};
