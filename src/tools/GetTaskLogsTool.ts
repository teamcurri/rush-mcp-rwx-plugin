import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '@rushstack/mcp-server';
import type { RwxPlugin } from '../index';
import { extractRunId, runRwxCommand } from '../utils';
import { readFileSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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

      const timestamp = Date.now();
      const outputDir = join(tmpdir(), `rwx-logs-${id}-${timestamp}`);

      try {
        runRwxCommand(['logs', id, '--output-dir', outputDir, '--auto-extract']);

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
      } finally {
        try {
          rmSync(outputDir, { force: true, recursive: true });
        } catch (cleanupError) {
          console.error('Failed to cleanup temp directory:', cleanupError);
        }
      }
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
