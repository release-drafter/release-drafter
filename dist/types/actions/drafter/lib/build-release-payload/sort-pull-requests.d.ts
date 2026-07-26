import { type Logger } from '../../../../common/index.js';
import type { Config } from '../../config/index.js';
import type { findPullRequests } from '../find-pull-requests/index.js';
type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number];
export declare const sortPullRequests: (params: {
    logger?: Logger;
    pullRequests: Pr[];
    config: Pick<Config, 'sort-by' | 'sort-direction'>;
}) => ({
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
export {};
