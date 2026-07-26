import { type Logger } from '../../../../common/index.js';
import type { ParsedConfig } from '../../config/index.js';
import type { getVersionInfo } from './get-version-info.js';
/**
 * Renders the release name,
 * based on the input and config.
 */
export declare const renderReleaseName: (params: {
    logger?: Logger;
    inputName: string | undefined;
    config: Pick<ParsedConfig, 'name-template'>;
    versionInfo: ReturnType<typeof getVersionInfo>;
}) => string;
