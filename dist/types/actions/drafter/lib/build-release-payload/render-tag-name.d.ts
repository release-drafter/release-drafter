import { type Logger } from '../../../../common/index.js';
import type { ParsedConfig } from '../../config/index.js';
import type { getVersionInfo } from './get-version-info.js';
/**
 * Renders the tag name for the release,
 * based on the input and config.
 */
export declare const renderTagName: (params: {
    logger?: Logger;
    inputTagName: string | undefined;
    config: Pick<ParsedConfig, 'tag-template'>;
    versionInfo: ReturnType<typeof getVersionInfo>;
}) => string;
