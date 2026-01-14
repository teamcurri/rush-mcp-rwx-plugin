import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { extractRunId, fetchRunStatus, RWX_ORG } from '../utils';

export class WaitForCiRunTool implements IRushMcpTool<WaitForCiRunTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      run_id: zod.string().describe('RWX run ID or full URL to wait for'),
      timeout_seconds: zod
        .coerce.number()
        .default(1800)
        .describe('Maximum time to wait in seconds (default: 1800 = 30 min)'),
      poll_interval_seconds: zod
        .coerce.number()
        .default(30)
        .describe('Seconds between status checks (default: 30)'),
    });
  }

  public async executeAsync(input: zodModule.infer<WaitForCiRunTool['schema']>): Promise<CallToolResult> {
    const id = extractRunId(input.run_id);
    const runUrl = `https://cloud.rwx.com/mint/${RWX_ORG}/runs/${id}`;
    const startTime = Date.now();
    const maxTime = input.timeout_seconds * 1000;
    let pollCount = 0;

    try {
      while (Date.now() - startTime < maxTime) {
        pollCount++;
        const status = await fetchRunStatus(id);

        if (status.isComplete) {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          const response = {
            completed: true,
            elapsed_seconds: elapsedSeconds,
            polls: pollCount,
            run_id: id,
            run_url: runUrl,
            status: status.status,
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

        await new Promise((resolve) =>
          setTimeout(resolve, input.poll_interval_seconds * 1000)
        );
      }

      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const response = {
        completed: false,
        elapsed_seconds: elapsedSeconds,
        message: `Run did not complete within ${input.timeout_seconds} seconds`,
        polls: pollCount,
        run_id: id,
        run_url: runUrl,
        timeout: true,
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
            text: `Failed to wait for run: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}
