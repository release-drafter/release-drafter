import type { Logger } from '../../../common/index.js';
import { type CategoryConfig, type Config } from './schemas/config.schema.js';
type RawCategory = CategoryConfig;
/**
 * Parses all categories from the config, normalizing conditions and
 * handling backward compatibility with deprecated fields.
 *
 * This function:
 * - Normalizes a missing `type` to `changelog` to match schema defaults
 * - Normalizes the `when` field to always be an array of conditions
 * - Applies deprecated category-level `label`/`labels` shorthands to every
 *   normalized `when` condition
 * - Warns when deprecated compatibility fields are used
 * - Preserves all other category fields as-is
 *
 * Accepts both fully-typed and partial category objects for flexibility.
 *
 * @param categories - Categories from the raw config
 * @returns Array of fully parsed categories with normalized conditions
 */
export declare function parseCategories(categories: {
    categories: RawCategory[];
}, deprecatedConfig: Pick<Config, 'exclude-labels' | 'include-labels' | 'include-paths' | 'exclude-paths' | 'version-resolver'>, logger: Logger): ({
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
export {};
