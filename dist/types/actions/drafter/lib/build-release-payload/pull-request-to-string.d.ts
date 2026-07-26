import type { Config } from '../../config/index.js';
import type { findPullRequests } from '../find-pull-requests/index.js';
type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number];
export declare const pullRequestToString: (params: {
    serverUrl?: string;
    category?: string;
    commits: Awaited<ReturnType<typeof findPullRequests>>['commits'];
    pullRequests: Pr[];
    config: Pick<Config, 'change-template' | 'change-title-escapes' | 'change-author-template' | 'change-authors-separator' | 'change-authors-final-separator'>;
}) => string;
export {};
