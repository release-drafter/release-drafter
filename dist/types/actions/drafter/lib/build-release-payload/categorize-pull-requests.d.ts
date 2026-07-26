import { type ChangelogCategory } from '../../common/category-matching.js';
import type { ParsedConfig } from '../../config/index.js';
import type { findPullRequests } from '../find-pull-requests/index.js';
type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number];
export declare const categorizePullRequests: (params: {
    pullRequests: Pr[];
    config: Pick<ParsedConfig, 'categories'>;
}) => [Pr[], (ChangelogCategory & {
    pullRequests: Pr[];
})[]];
export {};
