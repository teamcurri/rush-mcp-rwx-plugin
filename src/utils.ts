import { execFileSync } from 'child_process';
import { readFileSync, readdirSync, rmSync, mkdtempSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export const RWX_ORG = 'curri';
export const MIN_RWX_VERSION = '3.0.0';

// Cache for downloaded logs (only for completed runs)
interface LogsCacheEntry {
  logs: string;
  expiresAt: number;
}
const logsCache = new Map<string, LogsCacheEntry>();
const LOGS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface RwxVersionCheck {
  installed: boolean;
  version: string | null;
  meetsMinimum: boolean;
}

/**
 * Get the rwx CLI version information without throwing.
 * Returns an object with installation status, version, and whether it meets minimum requirements.
 */
export function getRwxCliVersion(): RwxVersionCheck {
  try {
    const versionOutput = execFileSync('rwx', ['--version'], {
      encoding: 'utf-8',
    }).trim();

    const versionMatch = versionOutput.match(/v?(\d+\.\d+\.\d+)/);
    if (!versionMatch) {
      return { installed: true, version: null, meetsMinimum: false };
    }

    const version = versionMatch[1];
    const meetsMinimum = isVersionGte(version, MIN_RWX_VERSION);

    return { installed: true, version, meetsMinimum };
  } catch {
    return { installed: false, version: null, meetsMinimum: false };
  }
}

/**
 * Check if the rwx CLI is installed and meets the minimum version requirement.
 * Throws an error if not installed or version is too low.
 * @deprecated Use getRwxCliVersion() for non-throwing version check
 */
export function checkRwxCliVersion(): void {
  const check = getRwxCliVersion();
  
  if (!check.installed) {
    throw new Error(
      `rwx CLI is not installed or not in PATH. Please install rwx CLI version >= ${MIN_RWX_VERSION}. ` +
        'See https://docs.rwx.com/mint/install for installation instructions.'
    );
  }

  if (!check.meetsMinimum) {
    throw new Error(
      `rwx CLI version ${check.version} is installed, but version >= ${MIN_RWX_VERSION} is required. ` +
        'Please update your rwx CLI installation.'
    );
  }
}

/**
 * Compare two semantic versions.
 * Returns true if a >= b.
 */
function isVersionGte(a: string, b: string): boolean {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;

    if (partA > partB) return true;
    if (partA < partB) return false;
  }

  return true; // Equal
}

export function runRwxCommand(args: string[], cwd?: string): string {
  try {
    return execFileSync('rwx', args, {
      cwd,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error: unknown) {
    const execError = error as {
      stderr?: string;
      stdout?: string;
      message?: string;
    };
    if (execError.stdout) return execError.stdout;
    throw new Error(
      execError.stderr || execError.message || 'RWX command failed'
    );
  }
}

export function extractRunId(runIdOrUrl: string): string {
  if (runIdOrUrl.includes('/')) {
    return runIdOrUrl.split('/').pop()!;
  }
  return runIdOrUrl;
}

interface RwxRunResponse {
  completed_at: string | null;
  run_status: {
    execution: string;
    result: string;
  };
}

export async function fetchRunStatus(runId: string): Promise<{
  status: 'running' | 'success' | 'failure' | 'unknown';
  isComplete: boolean;
}> {
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
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as RwxRunResponse;

    const isComplete =
      data.completed_at !== null || data.run_status.execution === 'finished';

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
  } catch (error) {
    console.error('Error fetching run status:', error);
    throw error;
  }
}

/**
 * Download logs for a run or task and return the concatenated content.
 * Handles both single log files and extracted directories with multiple logs.
 * Caches logs for completed runs for 30 minutes.
 */
export async function downloadLogs(id: string): Promise<string> {
  // Check cache first
  const cached = logsCache.get(id);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.logs;
  }

  // Download the logs
  const logs = downloadLogsFromRwx(id);

  // Check if the run is complete - if so, cache the logs
  try {
    const { isComplete } = await fetchRunStatus(id);
    if (isComplete) {
      logsCache.set(id, {
        logs,
        expiresAt: Date.now() + LOGS_CACHE_TTL_MS,
      });
    }
  } catch {
    // If we can't fetch status (e.g., it's a task ID not a run ID), 
    // try to determine completion from logs content or just don't cache
  }

  return logs;
}

/**
 * Internal function to actually download logs from RWX CLI
 */
function downloadLogsFromRwx(id: string): string {
  const outputDir = mkdtempSync(join(tmpdir(), `rwx-logs-${id}-`));

  try {
    runRwxCommand(['logs', id, '--output-dir', outputDir, '--auto-extract', '--output', 'json']);

    // Find all log files, including in subdirectories
    const logFiles = findLogFiles(outputDir);
    
    if (logFiles.length === 0) {
      throw new Error('No log files found in downloaded output');
    }

    // If there's only one log file, return its content
    if (logFiles.length === 1) {
      return readFileSync(logFiles[0], 'utf-8');
    }

    // Multiple log files - concatenate them with headers
    const contents: string[] = [];
    for (const logFile of logFiles.sort()) {
      const relativePath = logFile.replace(outputDir + '/', '');
      const content = readFileSync(logFile, 'utf-8');
      contents.push(`\n=== ${relativePath} ===\n${content}`);
    }
    
    return contents.join('\n');
  } finally {
    try {
      rmSync(outputDir, { force: true, recursive: true });
    } catch (cleanupError) {
      console.error('Failed to cleanup temp directory:', cleanupError);
    }
  }
}

/**
 * Recursively find all .log and .txt files in a directory
 */
function findLogFiles(dir: string): string[] {
  const results: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recurse into subdirectories
        results.push(...findLogFiles(fullPath));
      } else if (entry.endsWith('.log') || entry.endsWith('.txt')) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore errors reading directories
  }
  
  return results;
}
