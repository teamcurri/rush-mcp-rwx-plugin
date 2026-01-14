import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { extractRunId, downloadLogs } from '../utils';

const MAX_LINES_PER_PAGE = 50;

export class GrepLogsTool implements IRushMcpTool<GrepLogsTool['schema']> {
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
      pattern: zod
        .string()
        .describe('Pattern to search for in the logs (case-insensitive)'),
      context: zod
        .number()
        .default(3)
        .describe('Number of context lines before and after matches (default: 3)'),
      page: zod
        .number()
        .default(1)
        .describe('Page number (default: 1). Each page returns up to 50 lines of output.'),
    });
  }

  public async executeAsync(input: zodModule.infer<GrepLogsTool['schema']>): Promise<CallToolResult> {
    try {
      const id = extractRunId(input.id);
      const pattern = input.pattern;
      const context = input.context ?? 3;
      const page = Math.max(1, input.page ?? 1);

      const logs = await downloadLogs(id);
      const allLines = logs.split('\n');
      
      // Find matching lines with context
      const regex = new RegExp(pattern, 'i');
      const matchingIndices: number[] = [];
      
      for (let i = 0; i < allLines.length; i++) {
        if (regex.test(allLines[i])) {
          matchingIndices.push(i);
        }
      }

      // Build output with context
      const outputLines: string[] = [];
      const includedIndices = new Set<number>();

      for (const matchIdx of matchingIndices) {
        const startIdx = Math.max(0, matchIdx - context);
        const endIdx = Math.min(allLines.length - 1, matchIdx + context);

        for (let i = startIdx; i <= endIdx; i++) {
          if (!includedIndices.has(i)) {
            includedIndices.add(i);
            const prefix = i === matchIdx ? '>>> ' : '    ';
            outputLines.push(`${prefix}${i + 1}: ${allLines[i]}`);
          }
        }

        // Add separator between match groups
        if (matchIdx !== matchingIndices[matchingIndices.length - 1]) {
          outputLines.push('---');
        }
      }

      // Paginate the output
      const startLine = (page - 1) * MAX_LINES_PER_PAGE;
      const endLine = startLine + MAX_LINES_PER_PAGE;
      const paginatedLines = outputLines.slice(startLine, endLine);
      const totalPages = Math.ceil(outputLines.length / MAX_LINES_PER_PAGE);
      const hasMore = page < totalPages;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id,
              pattern,
              context,
              matches_found: matchingIndices.length,
              total_lines: allLines.length,
              page,
              total_pages: totalPages,
              has_more: hasMore,
              next_page: hasMore ? page + 1 : null,
              logs: paginatedLines.join('\n'),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to grep logs: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}
