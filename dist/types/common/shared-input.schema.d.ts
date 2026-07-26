/**
 * Inputs shared by release-drafter and autolabeler
 */
export declare const sharedInputSchema: import("zod").ZodObject<{
    token: import("zod").ZodDefault<import("zod").ZodString>;
    'dry-run': import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodCodec<import("zod").ZodString, import("zod").ZodBoolean>, import("zod").ZodBoolean]>>;
}, import("zod/v4/core").$strip>;
