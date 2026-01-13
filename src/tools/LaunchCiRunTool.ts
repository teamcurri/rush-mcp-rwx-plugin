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
      targets: zod
        .array(zod.string())
        .optional()
        .describe('Specific tasks to target (optional)'),
    });
  }

  public async executeAsync(input: zodModule.infer<LaunchCiRunTool['schema']>): Promise<CallToolResult> {
    try {
      const args = ['run', '.rwx/ci.yml', '--json'];
      if (input.targets && input.targets.length > 0) {
        input.targets.forEach((t) => args.push('--target', t));
      }
      const result = runRwxCommand(args);
      const parsed = JSON.parse(result);

      const response = {
        next_step:
          'Use wait_for_ci_run to wait for completion, or get_run_test_failures to check results',
        run_id: parsed.RunId || parsed.run_id,
        status: 'launched',
        url: parsed.RunURL || parsed.url,
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
