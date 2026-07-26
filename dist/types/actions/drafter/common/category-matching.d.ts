import type { ParsedConfig } from '../config/index.js';
type ParsedCategory = ParsedConfig['categories'][number];
type ParsedCondition = ParsedCategory['when'][number];
type PullRequestLike = {
    title?: string;
    labels?: {
        nodes?: ({
            name?: string | null;
        } | null)[] | null;
    } | null;
    changedFiles?: string[];
};
export type ChangelogCategory = Extract<ParsedCategory, {
    type: 'changelog';
}>;
export type VersionResolverCategory = Extract<ParsedCategory, {
    type: 'version-resolver';
}>;
export declare const matchesCategoryCondition: (condition: ParsedCondition, pullRequest: PullRequestLike) => boolean;
export declare const matchesCategory: (category: ParsedCategory, pullRequest: PullRequestLike) => boolean;
export declare const filterPullRequestsByPreCategories: <Pr extends PullRequestLike>(pullRequests: Pr[], categories: ParsedConfig['categories']) => Pr[];
/**
 * Determines if any of the categories require loading pull request changed files.
 */
export declare const needsPullRequestChangedFiles: (categories: ParsedConfig['categories']) => boolean;
export declare const getChangelogCategories: (categories: ParsedConfig['categories']) => ChangelogCategory[];
export declare const getVersionResolverCategories: (categories: ParsedConfig['categories']) => VersionResolverCategory[];
export {};
