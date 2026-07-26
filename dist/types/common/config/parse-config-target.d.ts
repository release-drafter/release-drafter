export type ConfigTarget = {
    scheme: 'file' | 'github';
    repo: {
        owner: string;
        repo: string;
    };
    ref?: string;
    filepath: string;
};
export declare const describeConfigTarget: (target: ConfigTarget) => string;
/**
 * Parses a config target string into its components
 * @param target - Target string in format `[github:][[owner/]repo]:filepath[@ref]` or `file:filepath`
 * @param currentContext - Current runtime context (repo owner, name, and ref)
 * @returns Parsed config target with resolved components
 */
export declare function parseConfigTarget(target: string, context: Pick<ConfigTarget, 'ref' | 'repo'>): ConfigTarget;
