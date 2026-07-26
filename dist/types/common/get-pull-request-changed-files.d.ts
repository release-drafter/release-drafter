import type { Octokit } from './get-octokit.js';
type PullRequestRef = {
    number: number;
    baseRepository?: {
        nameWithOwner?: string | null;
    } | null;
};
export declare const getPullRequestChangedFiles: (octokit: Octokit, params: {
    owner: string;
    repo: string;
    pull_number: number;
}) => Promise<string[]>;
export declare const getPullRequestsChangedFiles: (params: {
    owner: string;
    repo: string;
    pullRequests: PullRequestRef[];
    octokit: Octokit;
}) => Promise<Map<string, string[]>>;
export {};
