import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { RWX_ORG } from '../utils';

interface RwxRunListItem {
  id: string;
  branch: string | null;
  commit_sha: string | null;
  result_status: string;
  execution_status: string;
  title: string;
  trigger: string;
  definition_path: string;
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
        .describe('Git ref (branch name) to filter runs by'),
      limit: zod
        .coerce.number()
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

      // Query the RWX API for runs - fetch more than needed since we'll filter client-side
      const fetchLimit = Math.min(input.limit * 10, 100);
      const params = new URLSearchParams({
        limit: String(fetchLimit),
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

      // Filter by branch and only include ci.yml runs
      const filteredRuns = (data.runs || [])
        .filter((run) => 
          run.branch === input.ref && 
          run.definition_path === '.rwx/ci.yml'
        )
        .slice(0, input.limit);

      const runs = filteredRuns.map((run) => {
        let status: string;
        if (run.execution_status !== 'finished') {
          status = 'running';
        } else {
          const result = run.result_status?.toLowerCase();
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
          status,
          commit_sha: run.commit_sha,
          title: run.title,
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
