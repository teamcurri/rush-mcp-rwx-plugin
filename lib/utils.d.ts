export declare const RWX_ORG = "curri";
export declare const MIN_RWX_VERSION = "2.3.2";
/**
 * Check if the rwx CLI is installed and meets the minimum version requirement.
 * Throws an error if not installed or version is too low.
 */
export declare function checkRwxCliVersion(): void;
export declare function runRwxCommand(args: string[], cwd?: string): string;
export declare function extractRunId(runIdOrUrl: string): string;
export declare function fetchRunStatus(runId: string): Promise<{
    status: 'running' | 'success' | 'failure' | 'unknown';
    isComplete: boolean;
}>;
//# sourceMappingURL=utils.d.ts.map