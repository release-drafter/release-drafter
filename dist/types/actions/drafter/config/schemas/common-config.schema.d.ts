import type * as z from 'zod';
/**
 * Configuration parameters that can be specified in both
 * the config file or the action input.
 *
 * Default values cannot be defined here,
 * as action inputs may override config file values.
 *
 * @see merge-input-and-config.ts for how the merging of config and input is handled, including default values.
 */
export declare const commonConfigSchema: z.ZodObject<{
    latest: z.ZodOptional<z.ZodUnion<[z.ZodCodec<z.ZodString, z.ZodBoolean>, z.ZodBoolean]>>;
    prerelease: z.ZodOptional<z.ZodUnion<[z.ZodCodec<z.ZodString, z.ZodBoolean>, z.ZodBoolean]>>;
    'prerelease-identifier': z.ZodOptional<z.ZodString>;
    'include-pre-releases': z.ZodOptional<z.ZodUnion<[z.ZodCodec<z.ZodString, z.ZodBoolean>, z.ZodBoolean]>>;
    commitish: z.ZodOptional<z.ZodString>;
    header: z.ZodOptional<z.ZodString>;
    footer: z.ZodOptional<z.ZodString>;
    'filter-by-range': z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Configuration parameters that can be specified in both
 * the config file or the action input.
 */
export type CommonConfig = z.infer<typeof commonConfigSchema>;
