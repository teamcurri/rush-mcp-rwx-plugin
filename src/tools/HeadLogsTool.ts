import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { extractRunId, downloadLogs } from '../utils';

export class HeadLogsTool implements IRushMcpTool<HeadLogsTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      id: zod
        .string()
        .describe('RWX run ID or task ID'),
      lines: zod
        .number()
        .default(100)
        .describe('Number of lines to return from the beginning (default: 100)'),
    });
  }

  public async executeAsync(input: zodModule.infer<HeadLogsTool['schema']>): Promise<CallToolResult> {
    try {
      const id = extractRunId(input.id);
      const numLines = input.lines;

      const logs = await downloadLogs(id);
      const allLines = logs.split('\n');
      const headLines = allLines.slice(0, numLines).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id,
              lines_requested: numLines,
              lines_returned: Math.min(numLines, allLines.length),
              total_lines: allLines.length,
              logs: headLines.substring(0, 100000),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get head logs: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}
