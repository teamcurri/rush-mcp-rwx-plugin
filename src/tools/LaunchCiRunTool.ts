import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { runRwxCommand, RWX_ORG } from '../utils';
import { checkRwxPrerequisites, handleRwxError } from '../elicitation';

interface RwxRunOutput {
  run_id: string;
  run_url: string;
  result?: string;
  execution?: string;
}

export class LaunchCiRunTool implements IRushMcpTool<LaunchCiRunTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      targets: zod
        .array(zod.string())
        .optional()
        .describe('Specific tasks to target (optional)'),
      wait: zod
        .boolean()
        .default(false)
        .describe('Wait for the run to complete before returning (default: false)'),
    });
  }

  public async executeAsync(input: zodModule.infer<LaunchCiRunTool['schema']>): Promise<CallToolResult> {
    // Check prerequisites - both CLI and token needed
    const prereqCheck = checkRwxPrerequisites();
    if (prereqCheck) {
      return prereqCheck;
    }

    try {
      const args = ['run', '.rwx/ci.yml', '--output', 'json'];
      
      if (input.wait) {
        args.push('--wait');
      }
      
      if (input.targets && input.targets.length > 0) {
        input.targets.forEach((t) => args.push('--target', t));
      }
      
      const result = runRwxCommand(args);
      const parsed = JSON.parse(result) as RwxRunOutput;

      const runId = parsed.run_id;
      const runUrl = parsed.run_url || `https://cloud.rwx.com/mint/${RWX_ORG}/runs/${runId}`;

      if (input.wait) {
        // Run completed - include result status
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
          completed: true,
          next_step: status === 'failure' 
            ? 'Use get_run_results to see task failures, or grep_logs to search for errors'
            : 'Run completed successfully',
          run_id: runId,
          status,
          url: runUrl,
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
      } else {
        // Run launched but not waited for
        const response = {
          completed: false,
          next_step: 'Use wait_for_ci_run to wait for completion, or launch with wait=true',
          run_id: runId,
          status: 'launched',
          url: runUrl,
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
    } catch (error) {
      return handleRwxError(error, 'launch CI run');
    }
  }
}
