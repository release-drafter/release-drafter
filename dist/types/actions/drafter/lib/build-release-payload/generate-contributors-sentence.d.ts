import type { ParsedConfig } from '../../config/index.js';
import type { findPullRequests } from '../find-pull-requests/index.js';
export declare const generateContributorsSentence: (params: {
    commits: Awaited<ReturnType<typeof findPullRequests>>['commits'];
    pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests'];
    config: Pick<ParsedConfig, 'categories' | 'exclude-contributors' | 'no-contributors-template'>;
    serverUrl?: string;
}) => string;
export declare const generateAuthorsSentence: (params: {
    commits: Awaited<ReturnType<typeof findPullRequests>>['commits'];
    pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests'];
    excludeContributors?: string[];
    noAuthorsTemplate?: string;
    authorTemplate?: string;
    authorsSeparator?: string;
    authorsFinalSeparator?: string;
    serverUrl?: string;
}) => string;
export declare const generateNewContributorsList: (params: {
    pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests'];
    newContributorLogins: ReadonlySet<string>;
    config: Pick<ParsedConfig, 'categories' | 'exclude-contributors' | 'new-contributor-template'>;
}) => string;
