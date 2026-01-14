import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { extractRunId, downloadLogs } from '../utils';

const MAX_LINES_PER_PAGE = 50;

export class TailLogsTool implements IRushMcpTool<TailLogsTool['schema']> {
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
        .coerce.number()
        .default(MAX_LINES_PER_PAGE)
        .describe(`Number of lines to return from the end (default: ${MAX_LINES_PER_PAGE}, max: ${MAX_LINES_PER_PAGE})`),
      offset: zod
        .coerce.number()
        .default(0)
        .describe('Line offset from the end (default: 0). Use for pagination to see earlier lines.'),
    });
  }

  public async executeAsync(input: zodModule.infer<TailLogsTool['schema']>): Promise<CallToolResult> {
    try {
      const id = extractRunId(input.id);
      const numLines = Math.min(input.lines ?? MAX_LINES_PER_PAGE, MAX_LINES_PER_PAGE);
      const offset = input.offset ?? 0;

      const logs = await downloadLogs(id);
      const allLines = logs.split('\n');
      
      // Calculate the range from the end, accounting for offset
      // offset=0 means the last `numLines` lines
      // offset=50 means the 50 lines before the last 50
      const endIndex = allLines.length - offset;
      const startIndex = Math.max(0, endIndex - numLines);
      
      const tailLines = allLines.slice(startIndex, endIndex);
      const linesReturned = tailLines.length;
      const hasMore = startIndex > 0;

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
              start_line: startIndex + 1,
              end_line: endIndex,
              logs: tailLines.join('\n'),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get tail logs: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}
