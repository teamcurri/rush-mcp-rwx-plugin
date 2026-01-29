import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { runRwxCommand, extractRunId, RWX_ORG } from '../utils';
import { checkRwxPrerequisites, handleRwxError } from '../elicitation';

interface TaskResult {
  key: string;
  status: string;
  duration_seconds?: number;
  cache_hit?: boolean;
}

interface RwxResultsOutput {
  run_id: string;
  result: string;
  execution: string;
  tasks: TaskResult[];
  duration_seconds?: number;
  started_at?: string;
  completed_at?: string;
}

export class GetRunResultsTool implements IRushMcpTool<GetRunResultsTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      run_id: zod
        .string()
        .describe('RWX run ID or full URL to get results for'),
    });
  }

  public async executeAsync(input: zodModule.infer<GetRunResultsTool['schema']>): Promise<CallToolResult> {
    // Check prerequisites - CLI needed
    const prereqCheck = checkRwxPrerequisites();
    if (prereqCheck) {
      return prereqCheck;
    }

    try {
      const id = extractRunId(input.run_id);
      const result = runRwxCommand(['results', id, '--output', 'json']);
      const parsed = JSON.parse(result) as RwxResultsOutput;

      const runUrl = `https://cloud.rwx.com/mint/${RWX_ORG}/runs/${id}`;

      // Categorize tasks by status
      const failedTasks = parsed.tasks?.filter(t => 
        t.status?.toLowerCase() === 'failed'
      ) || [];
      const succeededTasks = parsed.tasks?.filter(t => 
        t.status?.toLowerCase() === 'succeeded'
      ) || [];
      const skippedTasks = parsed.tasks?.filter(t => 
        t.status?.toLowerCase() === 'skipped'
      ) || [];
      const cachedTasks = parsed.tasks?.filter(t => t.cache_hit) || [];

      const resultStatus = parsed.result?.toLowerCase();
      let status: string;
      if (resultStatus === 'succeeded') {
        status = 'success';
      } else if (resultStatus === 'failed') {
        status = 'failure';
      } else {
        status = resultStatus || 'unknown';
      }

      const response = {
        run_id: id,
        url: runUrl,
        status,
        execution: parsed.execution,
        duration_seconds: parsed.duration_seconds,
        summary: {
          total: parsed.tasks?.length || 0,
          succeeded: succeededTasks.length,
          failed: failedTasks.length,
          skipped: skippedTasks.length,
          cached: cachedTasks.length,
        },
        failed_tasks: failedTasks.map(t => t.key),
        tasks: parsed.tasks,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
        isError: status === 'failure',
      };
    } catch (error) {
      return handleRwxError(error, 'get run results');
    }
  }
}
