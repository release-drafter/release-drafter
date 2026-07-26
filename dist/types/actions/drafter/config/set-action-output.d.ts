import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import type { buildReleasePayload } from '../lib/index.js';
export declare const setActionOutput: (params: {
    upsertedRelease: RestEndpointMethodTypes['repos']['createRelease']['response'] | RestEndpointMethodTypes['repos']['updateRelease']['response'] | undefined;
    releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>;
}) => void;
