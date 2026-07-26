import { type GitHubContext } from '../../../../common/index.js';
import type { ParsedConfig } from '../../config/index.js';
import type { findPreviousReleases } from '../find-previous-releases/index.js';
export declare const findPullRequests: (params: {
    lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease'];
    config: ParsedConfig;
    previousCommitish?: string;
    github: Pick<GitHubContext, 'logger' | 'octokit' | 'repo'>;
}) => Promise<{
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
    newContributorLogins: Set<string>;
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
}>;
