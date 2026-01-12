import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { runRwxCommand } from '../utils';

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
      ref: zod.string().describe('Git ref (branch name or commit SHA)'),
      targets: zod
        .array(zod.string())
        .optional()
        .describe('Specific tasks to target (optional)'),
    });
  }

  public async executeAsync(input: zodModule.infer<LaunchCiRunTool['schema']>): Promise<CallToolResult> {
    try {
      const args = ['run', '.rwx/ci.yml', '--ref', input.ref, '--json'];
      if (input.targets && input.targets.length > 0) {
        input.targets.forEach((t) => args.push('--target', t));
      }
      const result = runRwxCommand(args);
      const parsed = JSON.parse(result);

      const response = {
        next_step:
          'Use analyze_ci_run with this run_id to monitor progress',
        run_id: parsed.run_id,
        status: 'launched',
        url: parsed.url,
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
            text: `Failed to launch: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}
