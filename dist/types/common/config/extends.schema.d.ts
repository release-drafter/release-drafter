import type * as z from 'zod';
export declare const MERGE_STRATEGIES: readonly ['override', 'append', 'prepend'];
export declare const mergeStrategySchema: z.ZodEnum<{
    append: "append";
    override: "override";
    prepend: "prepend";
}>;
export type MergeStrategy = z.output<typeof mergeStrategySchema>;
/**
 * Schema for the `_extends` key: either a plain target string, or a mapping
 * with `from` (same target syntax) and an optional per-key merge `strategy`.
 * The mapping is strict because composition errors on unknown keys; this way
 * editors flag the same typos the action would reject at runtime.
 *
 * Empty string and null values remain valid no-ops for compatibility with the
 * historical string form. Zod normalizes every active declaration to the
 * mapping shape consumed by config loading and composition.
 */
export declare const extendsDeclarationSchema: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNull, z.ZodObject<{
    from: z.ZodString;
    strategy: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodEnum<{
        append: "append";
        override: "override";
        prepend: "prepend";
    }>>>>;
}, z.core.$strict>]>>, z.ZodTransform<{
    from: string;
    strategy: Record<string, "append" | "override" | "prepend">;
} | undefined, string | {
    from: string;
    strategy?: Record<string, "append" | "override" | "prepend"> | null | undefined;
} | null | undefined>>;
export type ExtendsDeclaration = Exclude<z.output<typeof extendsDeclarationSchema>, undefined>;
/**
 * Parses the common envelope of a raw config file while retaining all
 * action-specific keys for composition and later validation.
 */
export declare const configFileSchema: z.ZodObject<{
    _extends: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNull, z.ZodObject<{
        from: z.ZodString;
        strategy: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodEnum<{
            append: "append";
            override: "override";
            prepend: "prepend";
        }>>>>;
    }, z.core.$strict>]>>, z.ZodTransform<{
        from: string;
        strategy: Record<string, "append" | "override" | "prepend">;
    } | undefined, string | {
        from: string;
        strategy?: Record<string, "append" | "override" | "prepend"> | null | undefined;
    } | null | undefined>>;
}, z.core.$loose>;
