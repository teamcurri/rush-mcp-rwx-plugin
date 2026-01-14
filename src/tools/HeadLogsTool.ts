import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { extractRunId, downloadLogs } from '../utils';

const MAX_LINES_PER_PAGE = 50;

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
        .default(MAX_LINES_PER_PAGE)
        .describe(`Number of lines to return from the beginning (default: ${MAX_LINES_PER_PAGE}, max: ${MAX_LINES_PER_PAGE})`),
      offset: zod
        .number()
        .default(0)
        .describe('Line offset to start from (default: 0). Use for pagination.'),
    });
  }

  public async executeAsync(input: zodModule.infer<HeadLogsTool['schema']>): Promise<CallToolResult> {
    try {
      const id = extractRunId(input.id);
      const numLines = Math.min(input.lines ?? MAX_LINES_PER_PAGE, MAX_LINES_PER_PAGE);
      const offset = input.offset ?? 0;

      const logs = await downloadLogs(id);
      const allLines = logs.split('\n');
      const headLines = allLines.slice(offset, offset + numLines);
      const linesReturned = headLines.length;
      const hasMore = offset + linesReturned < allLines.length;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id,
              offset,
              lines_requested: numLines,
              lines_returned: linesReturned,
              total_lines: allLines.length,
              has_more: hasMore,
              next_offset: hasMore ? offset + linesReturned : null,
              logs: headLines.join('\n'),
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
