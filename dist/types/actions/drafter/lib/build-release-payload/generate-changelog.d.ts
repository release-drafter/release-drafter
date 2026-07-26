import type { ParsedConfig } from '../../config/index.js';
import type { findPullRequests } from '../find-pull-requests/index.js';
export declare const generateChangeLog: (params: {
    serverUrl?: string;
    commits?: Awaited<ReturnType<typeof findPullRequests>>['commits'];
    pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests'];
    config: Pick<ParsedConfig, 'change-title-escapes' | 'no-changes-template' | 'categories' | 'change-template' | 'change-author-template' | 'change-authors-separator' | 'change-authors-final-separator' | 'category-template'>;
}) => string;
