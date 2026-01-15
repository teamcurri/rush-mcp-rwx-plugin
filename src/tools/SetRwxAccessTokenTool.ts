import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';

export class SetRwxAccessTokenTool implements IRushMcpTool<SetRwxAccessTokenTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      token: zod
        .string()
        .describe('The RWX access token to configure'),
    });
  }

  public async executeAsync(input: zodModule.infer<SetRwxAccessTokenTool['schema']>): Promise<CallToolResult> {
    try {
      if (!input.token || input.token.trim() === '') {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Token cannot be empty.',
            },
          ],
          isError: true,
        };
      }

      // Set the token in the current process environment
      process.env.RWX_ACCESS_TOKEN = input.token.trim();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              message: 'RWX access token configured successfully for this session.',
              hint: 'You can now proceed with your previous request.',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to set RWX access token: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}
