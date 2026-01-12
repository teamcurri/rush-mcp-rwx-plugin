"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RWX_ORG = void 0;
exports.runRwxCommand = runRwxCommand;
exports.extractRunId = extractRunId;
exports.fetchRunStatus = fetchRunStatus;
const child_process_1 = require("child_process");
exports.RWX_ORG = 'curri';
function runRwxCommand(args, cwd) {
    try {
        return (0, child_process_1.execFileSync)('rwx', args, {
            cwd,
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
        });
    }
    catch (error) {
        const execError = error;
        if (execError.stdout)
            return execError.stdout;
        throw new Error(execError.stderr || execError.message || 'RWX command failed');
    }
}
function extractRunId(runIdOrUrl) {
    if (runIdOrUrl.includes('/')) {
        return runIdOrUrl.split('/').pop();
    }
    return runIdOrUrl;
}
async function fetchRunStatus(runId) {
    try {
        const accessToken = process.env.RWX_ACCESS_TOKEN;
        if (!accessToken) {
            throw new Error('RWX_ACCESS_TOKEN environment variable not set');
        }
        const apiUrl = `https://cloud.rwx.com/mint/api/runs/${runId}`;
        const response = await fetch(apiUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json());
        const isComplete = data.completed_at !== null || data.run_status.execution === 'finished';
        const result = data.run_status.result?.toLowerCase();
        if (result === 'succeeded') {
            return { isComplete, status: 'success' };
        }
        if (result === 'failed') {
            return { isComplete, status: 'failure' };
        }
        if (!isComplete) {
            return { isComplete: false, status: 'running' };
        }
        console.error('Unknown run status:', data.run_status);
        return { isComplete, status: 'unknown' };
    }
    catch (error) {
        console.error('Error fetching run status:', error);
        throw error;
    }
}
//# sourceMappingURL=utils.js.map