import type * as z from 'zod';
export declare const exclusiveInputSchema: z.ZodIntersection<z.ZodObject<{
    'config-name': z.ZodDefault<z.ZodOptional<z.ZodString>>;
    name: z.ZodOptional<z.ZodString>;
    tag: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    publish: z.ZodDefault<z.ZodOptional<z.ZodCodec<z.ZodString, z.ZodBoolean>>>;
}, z.core.$strip>, z.ZodObject<{
    token: z.ZodDefault<z.ZodString>;
    'dry-run': z.ZodOptional<z.ZodUnion<[z.ZodCodec<z.ZodString, z.ZodBoolean>, z.ZodBoolean]>>;
}, z.core.$strip>>;
export declare const actionInputSchema: z.ZodIntersection<z.ZodIntersection<z.ZodObject<{
    'config-name': z.ZodDefault<z.ZodOptional<z.ZodString>>;
    name: z.ZodOptional<z.ZodString>;
    tag: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    publish: z.ZodDefault<z.ZodOptional<z.ZodCodec<z.ZodString, z.ZodBoolean>>>;
}, z.core.$strip>, z.ZodObject<{
    token: z.ZodDefault<z.ZodString>;
    'dry-run': z.ZodOptional<z.ZodUnion<[z.ZodCodec<z.ZodString, z.ZodBoolean>, z.ZodBoolean]>>;
}, z.core.$strip>>, z.ZodObject<{
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
 * Full action inputs
 *
 * For the action inputs exclusive to the action input, see `ExclusiveInput`
 *
 * For the action inputs that override configurations from the config-file, see `CommonConfig`
 */
export type ActionInput = z.infer<typeof actionInputSchema>;
/**
 * Inputs exclusive to the action input
 *
 * For the full action inputs, see `ActionInput`
 *
 * For the action inputs that override configurations from the config-file, see `CommonConfig`
 */
export type ExclusiveInput = z.infer<typeof exclusiveInputSchema>;
