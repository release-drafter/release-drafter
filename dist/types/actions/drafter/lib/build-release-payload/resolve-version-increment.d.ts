import type { ReleaseType } from 'semver';
import { type Logger } from '../../../../common/index.js';
import type { ParsedConfig } from '../../config/index.js';
import type { findPullRequests } from '../find-pull-requests/index.js';
export declare const resolveVersionKeyIncrement: (params: {
    logger?: Logger;
    pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests'];
    config: Pick<ParsedConfig, 'categories' | 'prerelease' | 'prerelease-identifier'>;
}) => ReleaseType;
