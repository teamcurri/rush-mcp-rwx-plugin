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
/**
 * Download logs for a run or task and return the concatenated content.
 * Handles both single log files and extracted directories with multiple logs.
 * Caches logs for completed runs for 30 minutes.
 */
export declare function downloadLogs(id: string): Promise<string>;
//# sourceMappingURL=utils.d.ts.map