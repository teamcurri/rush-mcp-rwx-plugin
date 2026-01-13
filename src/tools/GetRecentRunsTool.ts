import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { RWX_ORG } from '../utils';

interface RwxRunListItem {
  id: string;
  created_at: string;
  completed_at: string | null;
  run_status: {
    execution: string;
    result: string;
  };
  git_ref?: string;
  git_sha?: string;
}

interface RwxRunsListResponse {
  runs: RwxRunListItem[];
}

export class GetRecentRunsTool implements IRushMcpTool<GetRecentRunsTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      ref: zod
        .string()
        .describe('Git ref (branch name or commit SHA) to filter runs by'),
      limit: zod
        .number()
        .default(5)
        .describe('Number of runs to return (default: 5)'),
    });
  }

  public async executeAsync(input: zodModule.infer<GetRecentRunsTool['schema']>): Promise<CallToolResult> {
    try {
      const accessToken = process.env.RWX_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('RWX_ACCESS_TOKEN environment variable not set');
      }

      // Query the RWX API for runs filtered by ref
      const params = new URLSearchParams({
        limit: String(input.limit),
        git_ref: input.ref,
      });

      const apiUrl = `https://cloud.rwx.com/mint/api/runs?${params}`;
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

      const data = (await response.json()) as RwxRunsListResponse;

      const runs = (data.runs || []).map((run) => {
        let status: string;
        if (run.completed_at === null && run.run_status.execution !== 'finished') {
          status = 'running';
        } else {
          const result = run.run_status.result?.toLowerCase();
          if (result === 'succeeded') {
            status = 'success';
          } else if (result === 'failed') {
            status = 'failure';
          } else {
            status = result || 'unknown';
          }
        }

        return {
          run_id: run.id,
          date: run.created_at,
          status,
          url: `https://cloud.rwx.com/mint/${RWX_ORG}/runs/${run.id}`,
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ref: input.ref,
              count: runs.length,
              runs,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get recent runs: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}
