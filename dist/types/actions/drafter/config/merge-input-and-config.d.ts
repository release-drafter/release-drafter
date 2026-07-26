import { type Logger } from '../../../common/index.js';
import type { Config } from './schemas/config.schema.js';
import type { CommonConfig } from './schemas/index.js';
/**
 * Similar to Config, but with input values merged in and defaults applied.
 *
 * @see mergeInputAndConfig
 */
export type ParsedConfig = ReturnType<typeof mergeInputAndConfig>;
/**
 * Returns a copy of `config`, updated with values from `input`.
 *
 * Also performs some validation.
 *
 * Input takes precedence, because it's more easy to change at runtime
 */
export declare const mergeInputAndConfig: (params: {
    config: Config;
    input: CommonConfig;
    logger: Logger;
    ref?: string;
}) => {
    'prerelease-identifier'?: string | undefined;
    'include-pre-releases'?: boolean | undefined;
    header?: string | undefined;
    footer?: string | undefined;
    'filter-by-range'?: string | undefined;
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
    'exclude-contributors': string[];
    'new-contributor-template': string;
    'no-contributors-template': string;
    'sort-by': "merged_at" | "title";
    'sort-direction': "ascending" | "descending";
    'filter-by-commitish': boolean;
    'pull-request-limit': number;
    'history-limit': number;
    'category-template': string;
    template: string;
    commitish: string;
    latest: boolean;
    prerelease: boolean;
    replacers: {
        replace: string;
        search: RegExp;
    }[];
    categories: ({
        type: 'changelog';
        when: {
            'labels-mode': "all" | "any" | "exactly" | "only";
            'paths-mode': "all" | "any" | "exactly" | "only";
            paths: string[];
            labels: string[];
            conventional?: {
                types: string[];
                scopes: string[];
                breaking: boolean | undefined;
            } | undefined;
        }[];
        'collapse-after': number;
        'semver-increment': "major" | "minor" | "patch";
        exclusive: boolean;
        title: string | undefined;
    } | {
        'collapse-after'?: undefined;
        title?: undefined;
        type: 'version-resolver';
        when: {
            'labels-mode': "all" | "any" | "exactly" | "only";
            'paths-mode': "all" | "any" | "exactly" | "only";
            paths: string[];
            labels: string[];
            conventional?: {
                types: string[];
                scopes: string[];
                breaking: boolean | undefined;
            } | undefined;
        }[];
        'semver-increment': "major" | "minor" | "patch";
        exclusive: boolean;
    } | {
        'collapse-after'?: undefined;
        title?: undefined;
        'semver-increment'?: undefined;
        exclusive?: undefined;
        type: "pre-exclude" | "pre-include";
        when: {
            'labels-mode': "all" | "any" | "exactly" | "only";
            'paths-mode': "all" | "any" | "exactly" | "only";
            paths: string[];
            labels: string[];
            conventional?: {
                types: string[];
                scopes: string[];
                breaking: boolean | undefined;
            } | undefined;
        }[];
    })[];
};
