import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { extractRunId, runRwxCommand } from '../utils';
import { readFileSync, readdirSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Download logs for a run or task and return the content
 */
function downloadLogs(id: string): string {
  const outputDir = mkdtempSync(join(tmpdir(), `rwx-logs-${id}-`));

  try {
    runRwxCommand(['logs', id, '--output-dir', outputDir, '--auto-extract']);

    // Try to find the log file
    const possiblePaths = [
      join(outputDir, `${id}.log`),
      join(outputDir, 'output.log'),
      join(outputDir, 'logs.txt'),
    ];

    let logsContent = '';
    for (const logPath of possiblePaths) {
      try {
        logsContent = readFileSync(logPath, 'utf-8');
        break;
      } catch {
        continue;
      }
    }

    if (!logsContent) {
      const files = readdirSync(outputDir);
      const logFile = files.find(
        (f: string) => f.endsWith('.log') || f.endsWith('.txt')
      );
      if (logFile) {
        logsContent = readFileSync(join(outputDir, logFile), 'utf-8');
      }
    }

    if (!logsContent) {
      throw new Error('No log files found in downloaded output');
    }

    return logsContent;
  } finally {
    try {
      rmSync(outputDir, { force: true, recursive: true });
    } catch (cleanupError) {
      console.error('Failed to cleanup temp directory:', cleanupError);
    }
  }
}

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
        .number()
        .default(100)
        .describe('Number of lines to return from the end (default: 100)'),
    });
  }

  public async executeAsync(input: zodModule.infer<TailLogsTool['schema']>): Promise<CallToolResult> {
    try {
      const id = extractRunId(input.id);
      const numLines = input.lines;

      const logs = downloadLogs(id);
      const allLines = logs.split('\n');
      const tailLines = allLines.slice(-numLines).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id,
              lines_requested: numLines,
              lines_returned: Math.min(numLines, allLines.length),
              total_lines: allLines.length,
              logs: tailLines.substring(0, 100000),
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
