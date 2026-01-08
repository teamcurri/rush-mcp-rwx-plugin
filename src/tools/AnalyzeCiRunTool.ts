import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '@rushstack/mcp-server';
import type { RwxPlugin } from '../index';
import { extractRunId, HONEYCOMB_DATASET, HONEYCOMB_ENV, RWX_ORG } from '../utils';

export class AnalyzeCiRunTool implements IRushMcpTool<AnalyzeCiRunTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      run_id: zod.string().describe('RWX run ID or full URL'),
    });
  }

  public async executeAsync(input: zodModule.infer<AnalyzeCiRunTool['schema']>): Promise<CallToolResult> {
    const id = extractRunId(input.run_id);
    const runUrl = `https://cloud.rwx.com/mint/${RWX_ORG}/runs/${id}`;

    const overviewQuery = {
      dataset_slug: HONEYCOMB_DATASET,
      environment_slug: HONEYCOMB_ENV,
      query_spec: {
        breakdowns: [
          'cicd.pipeline.task.name',
          'cicd.pipeline.task.run.result',
          'cicd.pipeline.task.run.execution.status',
          'cicd.pipeline.task.run.execution.reason',
        ],
        calculations: [{ op: 'COUNT' }, { column: 'duration_ms', op: 'MAX' }],
        filters: [{ column: 'cicd.pipeline.run.id', op: '=', value: id }],
        time_range: 86400,
      },
    };

    const failedTasksQuery = {
      dataset_slug: HONEYCOMB_DATASET,
      environment_slug: HONEYCOMB_ENV,
      query_spec: {
        breakdowns: [
          'cicd.pipeline.task.name',
          'cicd.pipeline.task.run.url.full',
        ],
        calculations: [{ op: 'COUNT' }, { column: 'duration_ms', op: 'MAX' }],
        filters: [
          { column: 'cicd.pipeline.run.id', op: '=', value: id },
          {
            column: 'cicd.pipeline.task.run.result',
            op: '=',
            value: 'failure',
          },
        ],
        time_range: 86400,
      },
    };

    const perfQuery = {
      dataset_slug: HONEYCOMB_DATASET,
      environment_slug: HONEYCOMB_ENV,
      query_spec: {
        breakdowns: ['cicd.pipeline.task.name'],
        calculations: [{ column: 'duration_ms', op: 'MAX' }],
        filters: [{ column: 'cicd.pipeline.run.id', op: '=', value: id }],
        orders: [{ column: 'duration_ms', op: 'MAX', order: 'descending' }],
        time_range: 86400,
      },
    };

    const response = {
      analysis_steps: [
        {
          action: 'Get run overview',
          params: overviewQuery,
          purpose: 'See all tasks, their results, and execution status',
          step: 1,
          tool: 'mcp__honeycomb__run_query',
        },
        {
          action: 'Get failed tasks',
          params: failedTasksQuery,
          purpose: 'Identify which specific tasks failed',
          step: 2,
          tool: 'mcp__honeycomb__run_query',
        },
        {
          action: 'Get test failures (if test task failed)',
          params: { run_urls: [id] },
          purpose: 'Get detailed test failure information',
          step: 3,
          tool: 'mcp__rwx__get_run_test_failures',
        },
      ],
      failure_classification_guide: {
        build_failure: "cicd.pipeline.task.name is 'build' AND result=failure",
        early_failure:
          'Only setup tasks ran (code, node-modules) before failure',
        infrastructure:
          'execution.reason mentions docker/network/resource issues',
        test_failure:
          "cicd.pipeline.task.name contains 'test' AND result=failure",
        timeout: 'execution.status=aborted AND execution.reason=cancelled',
      },
      performance_query: perfQuery,
      run_id: id,
      run_url: runUrl,
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
