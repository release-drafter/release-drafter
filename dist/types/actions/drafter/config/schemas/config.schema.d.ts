import type * as z from 'zod';
import { ZodDefault } from 'zod';
/**
 * A single set of predicates that are combined with AND logic.
 * All specified predicates must be satisfied for a change to match.
 */
declare const changeConditionSchema: z.ZodObject<{
    conventional: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<true>, z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        types: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        scope: z.ZodOptional<z.ZodString>;
        scopes: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        breaking: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
    label: z.ZodOptional<z.ZodString>;
    labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'labels-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
        all: "all";
        any: "any";
        exactly: "exactly";
        only: "only";
    }>>>;
    path: z.ZodOptional<z.ZodString>;
    paths: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'paths-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
        all: "all";
        any: "any";
        exactly: "exactly";
        only: "only";
    }>>>;
}, z.core.$strip>;
export declare const changeConditionSchemaDefaults: {
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
export type ChangeConditionConfig = z.input<typeof changeConditionSchema>;
declare const categorySchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    type: ZodDefault<z.ZodOptional<z.ZodEnum<{
        changelog: "changelog";
        "pre-exclude": "pre-exclude";
        "pre-include": "pre-include";
        "version-resolver": "version-resolver";
    }>>>;
    exclusive: ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    'collapse-after': ZodDefault<z.ZodOptional<z.ZodNumber>>;
    'semver-increment': ZodDefault<z.ZodOptional<z.ZodEnum<{
        major: "major";
        minor: "minor";
        patch: "patch";
    }>>>;
    labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    label: z.ZodOptional<z.ZodString>;
    when: ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodObject<{
        conventional: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<true>, z.ZodObject<{
            type: z.ZodOptional<z.ZodString>;
            types: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            scope: z.ZodOptional<z.ZodString>;
            scopes: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            breaking: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>]>>;
        label: z.ZodOptional<z.ZodString>;
        labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        'labels-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
            all: "all";
            any: "any";
            exactly: "exactly";
            only: "only";
        }>>>;
        path: z.ZodOptional<z.ZodString>;
        paths: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        'paths-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
            all: "all";
            any: "any";
            exactly: "exactly";
            only: "only";
        }>>>;
    }, z.core.$strip>, z.ZodArray<z.ZodObject<{
        conventional: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<true>, z.ZodObject<{
            type: z.ZodOptional<z.ZodString>;
            types: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            scope: z.ZodOptional<z.ZodString>;
            scopes: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            breaking: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>]>>;
        label: z.ZodOptional<z.ZodString>;
        labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        'labels-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
            all: "all";
            any: "any";
            exactly: "exactly";
            only: "only";
        }>>>;
        path: z.ZodOptional<z.ZodString>;
        paths: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        'paths-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
            all: "all";
            any: "any";
            exactly: "exactly";
            only: "only";
        }>>>;
    }, z.core.$strip>>]>>>;
}, z.core.$strip>;
export declare const categorySchemaDefaults: {
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
};
export type CategoryConfig = z.input<typeof categorySchema>;
export declare const exclusiveConfigSchema: z.ZodObject<{
    'change-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'change-author-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'change-authors-separator': ZodDefault<z.ZodOptional<z.ZodString>>;
    'change-authors-final-separator': z.ZodOptional<z.ZodString>;
    'change-title-escapes': z.ZodOptional<z.ZodString>;
    'no-changes-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'version-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'name-template': z.ZodOptional<z.ZodString>;
    'tag-prefix': z.ZodOptional<z.ZodString>;
    'tag-template': z.ZodOptional<z.ZodString>;
    'exclude-labels': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'include-labels': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'include-paths': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'exclude-paths': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'exclude-contributors': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'new-contributor-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'no-contributors-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'sort-by': ZodDefault<z.ZodOptional<z.ZodEnum<{
        merged_at: "merged_at";
        title: "title";
    }>>>;
    'sort-direction': ZodDefault<z.ZodOptional<z.ZodEnum<{
        ascending: "ascending";
        descending: "descending";
    }>>>;
    'filter-by-commitish': ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    'pull-request-limit': ZodDefault<z.ZodOptional<z.ZodNumber>>;
    'history-limit': ZodDefault<z.ZodOptional<z.ZodNumber>>;
    replacers: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        search: z.ZodString;
        replace: z.ZodString;
    }, z.core.$strip>>>>;
    categories: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        type: ZodDefault<z.ZodOptional<z.ZodEnum<{
            changelog: "changelog";
            "pre-exclude": "pre-exclude";
            "pre-include": "pre-include";
            "version-resolver": "version-resolver";
        }>>>;
        exclusive: ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        'collapse-after': ZodDefault<z.ZodOptional<z.ZodNumber>>;
        'semver-increment': ZodDefault<z.ZodOptional<z.ZodEnum<{
            major: "major";
            minor: "minor";
            patch: "patch";
        }>>>;
        labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        label: z.ZodOptional<z.ZodString>;
        when: ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            conventional: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<true>, z.ZodObject<{
                type: z.ZodOptional<z.ZodString>;
                types: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
                scope: z.ZodOptional<z.ZodString>;
                scopes: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
                breaking: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>]>>;
            label: z.ZodOptional<z.ZodString>;
            labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            'labels-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
                all: "all";
                any: "any";
                exactly: "exactly";
                only: "only";
            }>>>;
            path: z.ZodOptional<z.ZodString>;
            paths: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            'paths-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
                all: "all";
                any: "any";
                exactly: "exactly";
                only: "only";
            }>>>;
        }, z.core.$strip>, z.ZodArray<z.ZodObject<{
            conventional: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<true>, z.ZodObject<{
                type: z.ZodOptional<z.ZodString>;
                types: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
                scope: z.ZodOptional<z.ZodString>;
                scopes: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
                breaking: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>]>>;
            label: z.ZodOptional<z.ZodString>;
            labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            'labels-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
                all: "all";
                any: "any";
                exactly: "exactly";
                only: "only";
            }>>>;
            path: z.ZodOptional<z.ZodString>;
            paths: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            'paths-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
                all: "all";
                any: "any";
                exactly: "exactly";
                only: "only";
            }>>>;
        }, z.core.$strip>>]>>>;
    }, z.core.$strip>>>>;
    'version-resolver': ZodDefault<z.ZodOptional<z.ZodObject<{
        major: ZodDefault<z.ZodOptional<z.ZodObject<{
            labels: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>>;
        minor: ZodDefault<z.ZodOptional<z.ZodObject<{
            labels: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>>;
        patch: ZodDefault<z.ZodOptional<z.ZodObject<{
            labels: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>>;
        default: ZodDefault<z.ZodOptional<z.ZodEnum<{
            major: "major";
            minor: "minor";
            patch: "patch";
        }>>>;
    }, z.core.$strip>>>;
    'category-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    template: ZodDefault<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const configSchema: z.ZodIntersection<z.ZodObject<{
    'change-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'change-author-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'change-authors-separator': ZodDefault<z.ZodOptional<z.ZodString>>;
    'change-authors-final-separator': z.ZodOptional<z.ZodString>;
    'change-title-escapes': z.ZodOptional<z.ZodString>;
    'no-changes-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'version-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'name-template': z.ZodOptional<z.ZodString>;
    'tag-prefix': z.ZodOptional<z.ZodString>;
    'tag-template': z.ZodOptional<z.ZodString>;
    'exclude-labels': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'include-labels': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'include-paths': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'exclude-paths': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'exclude-contributors': ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    'new-contributor-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'no-contributors-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    'sort-by': ZodDefault<z.ZodOptional<z.ZodEnum<{
        merged_at: "merged_at";
        title: "title";
    }>>>;
    'sort-direction': ZodDefault<z.ZodOptional<z.ZodEnum<{
        ascending: "ascending";
        descending: "descending";
    }>>>;
    'filter-by-commitish': ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    'pull-request-limit': ZodDefault<z.ZodOptional<z.ZodNumber>>;
    'history-limit': ZodDefault<z.ZodOptional<z.ZodNumber>>;
    replacers: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        search: z.ZodString;
        replace: z.ZodString;
    }, z.core.$strip>>>>;
    categories: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        type: ZodDefault<z.ZodOptional<z.ZodEnum<{
            changelog: "changelog";
            "pre-exclude": "pre-exclude";
            "pre-include": "pre-include";
            "version-resolver": "version-resolver";
        }>>>;
        exclusive: ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        'collapse-after': ZodDefault<z.ZodOptional<z.ZodNumber>>;
        'semver-increment': ZodDefault<z.ZodOptional<z.ZodEnum<{
            major: "major";
            minor: "minor";
            patch: "patch";
        }>>>;
        labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        label: z.ZodOptional<z.ZodString>;
        when: ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            conventional: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<true>, z.ZodObject<{
                type: z.ZodOptional<z.ZodString>;
                types: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
                scope: z.ZodOptional<z.ZodString>;
                scopes: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
                breaking: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>]>>;
            label: z.ZodOptional<z.ZodString>;
            labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            'labels-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
                all: "all";
                any: "any";
                exactly: "exactly";
                only: "only";
            }>>>;
            path: z.ZodOptional<z.ZodString>;
            paths: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            'paths-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
                all: "all";
                any: "any";
                exactly: "exactly";
                only: "only";
            }>>>;
        }, z.core.$strip>, z.ZodArray<z.ZodObject<{
            conventional: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<true>, z.ZodObject<{
                type: z.ZodOptional<z.ZodString>;
                types: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
                scope: z.ZodOptional<z.ZodString>;
                scopes: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
                breaking: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>]>>;
            label: z.ZodOptional<z.ZodString>;
            labels: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            'labels-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
                all: "all";
                any: "any";
                exactly: "exactly";
                only: "only";
            }>>>;
            path: z.ZodOptional<z.ZodString>;
            paths: ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            'paths-mode': ZodDefault<z.ZodOptional<z.ZodEnum<{
                all: "all";
                any: "any";
                exactly: "exactly";
                only: "only";
            }>>>;
        }, z.core.$strip>>]>>>;
    }, z.core.$strip>>>>;
    'version-resolver': ZodDefault<z.ZodOptional<z.ZodObject<{
        major: ZodDefault<z.ZodOptional<z.ZodObject<{
            labels: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>>;
        minor: ZodDefault<z.ZodOptional<z.ZodObject<{
            labels: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>>;
        patch: ZodDefault<z.ZodOptional<z.ZodObject<{
            labels: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>>;
        default: ZodDefault<z.ZodOptional<z.ZodEnum<{
            major: "major";
            minor: "minor";
            patch: "patch";
        }>>>;
    }, z.core.$strip>>>;
    'category-template': ZodDefault<z.ZodOptional<z.ZodString>>;
    template: ZodDefault<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    latest: z.ZodOptional<z.ZodUnion<[z.ZodCodec<z.ZodString, z.ZodBoolean>, z.ZodBoolean]>>;
    prerelease: z.ZodOptional<z.ZodUnion<[z.ZodCodec<z.ZodString, z.ZodBoolean>, z.ZodBoolean]>>;
    'prerelease-identifier': z.ZodOptional<z.ZodString>;
    'include-pre-releases': z.ZodOptional<z.ZodUnion<[z.ZodCodec<z.ZodString, z.ZodBoolean>, z.ZodBoolean]>>;
    commitish: z.ZodOptional<z.ZodString>;
    header: z.ZodOptional<z.ZodString>;
    footer: z.ZodOptional<z.ZodString>;
    'filter-by-range': z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
/**
 * Configs exclusive to the config-file
 *
 * For the full config params, see `Config`
 *
 * For the config params that can be overwritten by the action's input, see `CommonConfig`
 */
export type ExclusiveConfig = z.output<typeof exclusiveConfigSchema>;
/**
 * Full config params (from the config-file)
 *
 * For the config params exclusive to the config-file, see `ExclusiveConfig`
 *
 * For the config params that can be overwritten by the action's input, see `CommonConfig`
 */
export type Config = z.output<typeof configSchema>;
export declare const configSchemaDefaults: Config;
export {};
