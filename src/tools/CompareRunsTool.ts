import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '@rushstack/mcp-server';
import type { RwxPlugin } from '../index';
import { extractRunId, HONEYCOMB_DATASET, HONEYCOMB_ENV } from '../utils';

export class CompareRunsTool implements IRushMcpTool<CompareRunsTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      run_id_1: zod.string().describe('First run ID'),
      run_id_2: zod.string().describe('Second run ID'),
    });
  }

  public async executeAsync(input: zodModule.infer<CompareRunsTool['schema']>): Promise<CallToolResult> {
    const id1 = extractRunId(input.run_id_1);
    const id2 = extractRunId(input.run_id_2);

    const query = {
      dataset_slug: HONEYCOMB_DATASET,
      environment_slug: HONEYCOMB_ENV,
      query_spec: {
        breakdowns: ['cicd.pipeline.run.id', 'cicd.pipeline.task.name'],
        calculations: [{ column: 'duration_ms', op: 'MAX' }],
        filters: [
          { column: 'cicd.pipeline.run.id', op: 'in', value: [id1, id2] },
        ],
        time_range: 604800,
      },
    };

    const response = {
      analysis_tip:
        'Group results by task name to compare duration differences',
      description: `Compare runs ${id1} vs ${id2}`,
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
