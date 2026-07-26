import type { GitHubContext } from '../../../../common/index.js';
import type { ParsedConfig } from '../../config/index.js';
/**
 * Lists every release and :
 * - filters by commitish if specified
 * - filters by tag-prefix if specified
 * - filters out pre-releases unless specified
 * - extracts the first draft releases (according to return-order of GitHub API)
 * - get latest published release according to ./sort-releases.ts implementation
 *
 * Returns one of (or both) draft release and latest published release
 * The last stable release is used to determine the range of commits to include in the changelog,
 * and to resolve the next version number.
 *
 * The draft release is used to determine if we should create a new release or update the existing one.
 */
export declare const findPreviousReleases: (params: Pick<ParsedConfig, 'commitish' | 'filter-by-commitish' | 'tag-prefix' | 'prerelease' | 'include-pre-releases' | 'filter-by-range'> & {
    github: Pick<GitHubContext, 'logger' | 'octokit' | 'repo'>;
}) => Promise<{
    draftRelease: {
        url: string;
        html_url: string;
        assets_url: string;
        upload_url: string;
        tarball_url: string | null;
        zipball_url: string | null;
        id: number;
        node_id: string;
        tag_name: string;
        target_commitish: string;
        name: string | null;
        body?: string | null;
        draft: boolean;
        prerelease: boolean;
        immutable?: boolean;
        created_at: string;
        published_at: string | null;
        updated_at?: string | null;
        author: import("@octokit/openapi-types").components["schemas"]["simple-user"];
        assets: import("@octokit/openapi-types").components["schemas"]["release-asset"][];
        body_html?: string;
        body_text?: string;
        mentions_count?: number;
        discussion_url?: string;
        reactions?: import("@octokit/openapi-types").components["schemas"]["reaction-rollup"];
    } | undefined;
    lastRelease: {
        url: string;
        html_url: string;
        assets_url: string;
        upload_url: string;
        tarball_url: string | null;
        zipball_url: string | null;
        id: number;
        node_id: string;
        tag_name: string;
        target_commitish: string;
        name: string | null;
        body?: string | null;
        draft: boolean;
        prerelease: boolean;
        immutable?: boolean;
        created_at: string;
        published_at: string | null;
        updated_at?: string | null;
        author: import("@octokit/openapi-types").components["schemas"]["simple-user"];
        assets: import("@octokit/openapi-types").components["schemas"]["release-asset"][];
        body_html?: string;
        body_text?: string;
        mentions_count?: number;
        discussion_url?: string;
        reactions?: import("@octokit/openapi-types").components["schemas"]["reaction-rollup"];
    } | undefined;
}>;
