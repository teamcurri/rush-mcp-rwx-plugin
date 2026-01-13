"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_RWX_VERSION = exports.RWX_ORG = void 0;
exports.checkRwxCliVersion = checkRwxCliVersion;
exports.runRwxCommand = runRwxCommand;
exports.extractRunId = extractRunId;
exports.fetchRunStatus = fetchRunStatus;
const child_process_1 = require("child_process");
exports.RWX_ORG = 'curri';
exports.MIN_RWX_VERSION = '2.3.2';
/**
 * Check if the rwx CLI is installed and meets the minimum version requirement.
 * Throws an error if not installed or version is too low.
 */
function checkRwxCliVersion() {
    let versionOutput;
    try {
        versionOutput = (0, child_process_1.execFileSync)('rwx', ['--version'], {
            encoding: 'utf-8',
        }).trim();
    }
    catch (error) {
        throw new Error(`rwx CLI is not installed or not in PATH. Please install rwx CLI version >= ${exports.MIN_RWX_VERSION}. ` +
            'See https://docs.rwx.com/mint/install for installation instructions.');
    }
    // Parse version from output like "rwx version v2.3.2"
    const versionMatch = versionOutput.match(/v?(\d+\.\d+\.\d+)/);
    if (!versionMatch) {
        throw new Error(`Could not parse rwx CLI version from output: ${versionOutput}`);
    }
    const installedVersion = versionMatch[1];
    if (!isVersionGte(installedVersion, exports.MIN_RWX_VERSION)) {
        throw new Error(`rwx CLI version ${installedVersion} is installed, but version >= ${exports.MIN_RWX_VERSION} is required. ` +
            'Please update your rwx CLI installation.');
    }
}
/**
 * Compare two semantic versions.
 * Returns true if a >= b.
 */
function isVersionGte(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const partA = partsA[i] || 0;
        const partB = partsB[i] || 0;
        if (partA > partB)
            return true;
        if (partA < partB)
            return false;
    }
    return true; // Equal
}
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