import type { ParsedConfig } from '../../../config/index.js';
export type Template = {
    [key: `$${Uppercase<string>}`]: string | number | null | undefined | NestedTemplate;
};
export type NestedTemplate = {
    template: string;
    [key: `$${Uppercase<string>}`]: string | number | null | undefined | NestedTemplate;
};
/**
 * replaces all uppercase dollar templates with their string representation from object
 * if replacement is undefined in object the dollar template string is left untouched
 */
export declare const renderTemplate: (params: {
    template: string;
    object: Template;
    replacers?: ParsedConfig['replacers'];
}) => string;
