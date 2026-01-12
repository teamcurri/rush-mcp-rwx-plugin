export declare const RWX_ORG = "curri";
export declare function runRwxCommand(args: string[], cwd?: string): string;
export declare function extractRunId(runIdOrUrl: string): string;
export declare function fetchRunStatus(runId: string): Promise<{
    status: 'running' | 'success' | 'failure' | 'unknown';
    isComplete: boolean;
}>;
//# sourceMappingURL=utils.d.ts.map