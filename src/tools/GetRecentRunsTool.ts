import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '@rushstack/mcp-server';
import type { RwxPlugin } from '../index';
import { HONEYCOMB_DATASET, HONEYCOMB_ENV } from '../utils';

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
      branch: zod.string().describe('Git branch name'),
      limit: zod.number().default(5).describe('Number of runs to return'),
    });
  }

  public async executeAsync(input: zodModule.infer<GetRecentRunsTool['schema']>): Promise<CallToolResult> {
    const query = {
      dataset_slug: HONEYCOMB_DATASET,
      environment_slug: HONEYCOMB_ENV,
      query_spec: {
        breakdowns: [
          'cicd.pipeline.run.id',
          'cicd.pipeline.run.url.full',
          'cicd.pipeline.run.git.sha',
        ],
        calculations: [{ op: 'COUNT' }],
        filters: [
          { column: 'cicd.pipeline.run.git.branch', op: '=', value: input.branch },
        ],
        limit: input.limit,
        time_range: 604800,
      },
    };

    const response = {
      description: `Query for recent runs on branch: ${input.branch}`,
      params: query,
      tool: 'mcp__honeycomb__run_query',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
}
