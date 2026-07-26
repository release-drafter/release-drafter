import { type GitHubContext } from '../../../common/index.js';
export declare const getConfig: (configName: string, github: Pick<GitHubContext, 'logger' | 'octokit' | 'ref' | 'repo'>) => Promise<{
    'change-template': string;
    'change-author-template': string;
    'change-authors-separator': string;
    'change-authors-final-separator'?: string | undefined;
    'change-title-escapes'?: string | undefined;
    'no-changes-template': string;
    'version-template': string;
    'name-template'?: string | undefined;
    'tag-prefix'?: string | undefined;
    'tag-template'?: string | undefined;
    'exclude-labels': string[];
    'include-labels': string[];
    'include-paths': string[];
    'exclude-paths': string[];
    'exclude-contributors': string[];
    'new-contributor-template': string;
    'no-contributors-template': string;
    'sort-by': "merged_at" | "title";
    'sort-direction': "ascending" | "descending";
    'filter-by-commitish': boolean;
    'pull-request-limit': number;
    'history-limit': number;
    replacers: {
        search: string;
        replace: string;
    }[];
    categories: {
        title?: string | undefined;
        type: "changelog" | "pre-exclude" | "pre-include" | "version-resolver";
        exclusive: boolean;
        'collapse-after': number;
        'semver-increment': "major" | "minor" | "patch";
        labels: string[];
        label?: string | undefined;
        when: {
            conventional?: true | {
                type?: string | undefined;
                types: string[];
                scope?: string | undefined;
                scopes: string[];
                breaking?: boolean | undefined;
            } | undefined;
            label?: string | undefined;
            labels: string[];
            'labels-mode': "all" | "any" | "exactly" | "only";
            path?: string | undefined;
            paths: string[];
            'paths-mode': "all" | "any" | "exactly" | "only";
        }[] | {
            conventional?: true | {
                type?: string | undefined;
                types: string[];
                scope?: string | undefined;
                scopes: string[];
                breaking?: boolean | undefined;
            } | undefined;
            label?: string | undefined;
            labels: string[];
            'labels-mode': "all" | "any" | "exactly" | "only";
            path?: string | undefined;
            paths: string[];
            'paths-mode': "all" | "any" | "exactly" | "only";
        };
    }[];
    'version-resolver': {
        major: {
            labels: string[];
        };
        minor: {
            labels: string[];
        };
        patch: {
            labels: string[];
        };
        default: "major" | "minor" | "patch";
    };
    'category-template': string;
    template: string;
} & {
    latest?: boolean | undefined;
    prerelease?: boolean | undefined;
    'prerelease-identifier'?: string | undefined;
    'include-pre-releases'?: boolean | undefined;
    commitish?: string | undefined;
    header?: string | undefined;
    footer?: string | undefined;
    'filter-by-range'?: string | undefined;
}>;
