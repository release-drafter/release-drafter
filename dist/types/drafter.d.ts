import { type Octokit } from './common/get-octokit.js';
import { type Logger } from './common/logger.js';
export type DraftReleaseOptions = {
    repo: {
        owner: string;
        repo: string;
    };
    token: string;
    octokit?: Octokit;
    configName?: string;
    commitish?: string;
    previousCommitish?: string;
    version?: string;
    dryRun?: boolean;
    publish?: boolean;
    prerelease?: boolean;
    latest?: boolean;
    apiUrl?: string;
    serverUrl?: string;
    logger?: Logger;
};
export declare const draftRelease: (options: DraftReleaseOptions) => Promise<{
    commits: ({
        __typename: 'Commit';
        id: string;
        oid: string;
        committedDate: string;
        message: string;
        author: {
            __typename: 'GitActor';
            name: string | null;
            user: {
                __typename: 'User';
                login: string;
            } | null;
        } | null;
        authors: {
            nodes: Array<{
                __typename: 'GitActor';
                name: string | null;
                user: {
                    __typename: 'User';
                    login: string;
                } | null;
            } | null> | null;
        };
        associatedPullRequests: {
            __typename: 'PullRequestConnection';
            nodes: Array<{
                __typename: 'PullRequest';
                title: string;
                number: number;
                url?: string;
                body?: string;
                mergedAt: string | null;
                isCrossRepository: boolean;
                merged: boolean;
                baseRefName?: string;
                headRefName?: string;
                author: {
                    __typename: 'Bot';
                    login: string;
                    url: string;
                } | {
                    __typename: 'EnterpriseUserAccount';
                    login: string;
                    url: string;
                } | {
                    __typename: 'Mannequin';
                    login: string;
                    url: string;
                } | {
                    __typename: 'Organization';
                    login: string;
                    url: string;
                } | {
                    __typename: 'User';
                    login: string;
                    url: string;
                } | null;
                baseRepository: {
                    __typename: 'Repository';
                    nameWithOwner: string;
                } | null;
                labels: {
                    __typename: 'LabelConnection';
                    nodes: Array<{
                        __typename: 'Label';
                        name: string;
                    } | null> | null;
                } | null;
            } | null> | null;
        } | null;
    } | {
        __typename: 'Commit';
        id: string;
        oid: string;
        committedDate: string;
        message: string;
        author: {
            __typename: 'GitActor';
            name: string | null;
            user: {
                __typename: 'User';
                login: string;
            } | null;
        } | null;
        authors: {
            nodes: Array<{
                __typename: 'GitActor';
                name: string | null;
                user: {
                    __typename: 'User';
                    login: string;
                } | null;
            } | null> | null;
        };
        associatedPullRequests: {
            __typename: 'PullRequestConnection';
            nodes: Array<{
                __typename: 'PullRequest';
                title: string;
                number: number;
                url?: string;
                body?: string;
                mergedAt: string | null;
                isCrossRepository: boolean;
                merged: boolean;
                baseRefName?: string;
                headRefName?: string;
                author: {
                    __typename: 'Bot';
                    login: string;
                    url: string;
                } | {
                    __typename: 'EnterpriseUserAccount';
                    login: string;
                    url: string;
                } | {
                    __typename: 'Mannequin';
                    login: string;
                    url: string;
                } | {
                    __typename: 'Organization';
                    login: string;
                    url: string;
                } | {
                    __typename: 'User';
                    login: string;
                    url: string;
                } | null;
                baseRepository: {
                    __typename: 'Repository';
                    nameWithOwner: string;
                } | null;
                labels: {
                    __typename: 'LabelConnection';
                    nodes: Array<{
                        __typename: 'Label';
                        name: string;
                    } | null> | null;
                } | null;
            } | null> | null;
        } | null;
    })[];
    pullRequests: ({
        __typename: 'PullRequest';
        title: string;
        number: number;
        url?: string;
        body?: string;
        mergedAt: string | null;
        isCrossRepository: boolean;
        merged: boolean;
        baseRefName?: string;
        headRefName?: string;
        author: {
            __typename: 'Bot';
            login: string;
            url: string;
        } | {
            __typename: 'EnterpriseUserAccount';
            login: string;
            url: string;
        } | {
            __typename: 'Mannequin';
            login: string;
            url: string;
        } | {
            __typename: 'Organization';
            login: string;
            url: string;
        } | {
            __typename: 'User';
            login: string;
            url: string;
        } | null;
        baseRepository: {
            __typename: 'Repository';
            nameWithOwner: string;
        } | null;
        labels: {
            __typename: 'LabelConnection';
            nodes: Array<{
                __typename: 'Label';
                name: string;
            } | null> | null;
        } | null;
    } | {
        __typename: 'PullRequest';
        title: string;
        number: number;
        url?: string;
        body?: string;
        mergedAt: string | null;
        isCrossRepository: boolean;
        merged: boolean;
        baseRefName?: string;
        headRefName?: string;
        author: {
            __typename: 'Bot';
            login: string;
            url: string;
        } | {
            __typename: 'EnterpriseUserAccount';
            login: string;
            url: string;
        } | {
            __typename: 'Mannequin';
            login: string;
            url: string;
        } | {
            __typename: 'Organization';
            login: string;
            url: string;
        } | {
            __typename: 'User';
            login: string;
            url: string;
        } | null;
        baseRepository: {
            __typename: 'Repository';
            nameWithOwner: string;
        } | null;
        labels: {
            __typename: 'LabelConnection';
            nodes: Array<{
                __typename: 'Label';
                name: string;
            } | null> | null;
        } | null;
        changedFiles: string[] | undefined;
    } | {
        __typename: 'PullRequest';
        title: string;
        number: number;
        url?: string;
        body?: string;
        mergedAt: string | null;
        isCrossRepository: boolean;
        merged: boolean;
        baseRefName?: string;
        headRefName?: string;
        mergeCommit: {
            __typename: 'Commit';
            oid: string;
        } | null;
        author: {
            __typename: 'Bot';
            login: string;
            url: string;
        } | {
            __typename: 'EnterpriseUserAccount';
            login: string;
            url: string;
        } | {
            __typename: 'Mannequin';
            login: string;
            url: string;
        } | {
            __typename: 'Organization';
            login: string;
            url: string;
        } | {
            __typename: 'User';
            login: string;
            url: string;
        } | null;
        baseRepository: {
            __typename: 'Repository';
            nameWithOwner: string;
        } | null;
        labels: {
            __typename: 'LabelConnection';
            nodes: Array<{
                __typename: 'Label';
                name: string;
            } | null> | null;
        } | null;
        changedFiles: string[] | undefined;
    })[];
    releasePayload: {
        name: string;
        tag: string;
        body: string;
        targetCommitish: string;
        prerelease: boolean;
        make_latest: boolean;
        draft: boolean;
        resolvedVersion: string;
        majorVersion: string | null;
        minorVersion: string | null;
        patchVersion: string | null;
        prereleaseVersion: string | null;
    };
    upsertedRelease: import("@octokit/types").OctokitResponse<{
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
    }, 200> | import("@octokit/types").OctokitResponse<{
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
    }, 201> | undefined;
    dryRun: boolean | undefined;
}>;
