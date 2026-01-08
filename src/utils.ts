import { execFileSync } from 'child_process';

export const RWX_ORG = 'curri';
export const HONEYCOMB_ENV = 'test';
export const HONEYCOMB_DATASET = 'rwx';

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
