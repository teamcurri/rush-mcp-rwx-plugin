import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { extractRunId, downloadLogs } from '../utils';

export class GetTaskLogsTool implements IRushMcpTool<GetTaskLogsTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      task_id: zod
        .string()
        .describe(
          'RWX task ID (32-char hex) - get from Honeycomb cicd.pipeline.task.run.url.full'
        ),
    });
  }

  public async executeAsync(input: zodModule.infer<GetTaskLogsTool['schema']>): Promise<CallToolResult> {
    try {
      const id = extractRunId(input.task_id);
      const logsContent = await downloadLogs(id);

      const lines = logsContent.split('\n');
      const failureHighlights = lines
        .filter(
          (line) =>
            line.toLowerCase().includes('error') ||
            line.toLowerCase().includes('fail') ||
            line.toLowerCase().includes('✕') ||
            line.includes('FAIL')
        )
        .slice(0, 20);

      const exitCode = failureHighlights.length > 0 ? '1' : '0';

      const response = {
        exit_code: exitCode,
        failure_highlights: failureHighlights,
        logs: logsContent.substring(0, 100000),
        task_id: id,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get task logs: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}
