import type { IRushMcpPlugin, RushMcpPluginSession } from './types/rush-mcp-plugin';
import { McpProxyClient } from './McpProxyClient';
import { ProxyTool } from './ProxyTool';
import { checkRwxCliVersion } from './utils';
import { LaunchCiRunTool } from './tools/LaunchCiRunTool';
import { WaitForCiRunTool } from './tools/WaitForCiRunTool';
import { GetTaskLogsTool } from './tools/GetTaskLogsTool';
import { HeadLogsTool } from './tools/HeadLogsTool';
import { TailLogsTool } from './tools/TailLogsTool';
import { GrepLogsTool } from './tools/GrepLogsTool';
import { GetRecentRunsTool } from './tools/GetRecentRunsTool';

export class RwxPlugin implements IRushMcpPlugin {
  public session: RushMcpPluginSession;
  private _proxyClient: McpProxyClient | null = null;

  public constructor(session: RushMcpPluginSession) {
    this.session = session;
  }

  public async onInitializeAsync(): Promise<void> {
    // Check rwx CLI version on boot - throws if not installed or version too low
    checkRwxCliVersion();

    try {
      // Start the rwx mcp proxy client
      this._proxyClient = new McpProxyClient();
      await this._proxyClient.startAsync();

      // Dynamically register all tools from the rwx mcp server
      for (const tool of this._proxyClient.tools) {
        this.session.registerTool(
          { toolName: tool.name },
          new ProxyTool(
            this,
            this._proxyClient,
            tool.name,
            tool.description || '',
            tool.inputSchema
          )
        );
      }

      console.error(`[RWX Plugin] Successfully proxied ${this._proxyClient.tools.length} tools from rwx mcp serve`);

      // Register native tools that extend rwx mcp functionality
      this.session.registerTool(
        { toolName: 'launch_ci_run' },
        new LaunchCiRunTool(this)
      );

      this.session.registerTool(
        { toolName: 'wait_for_ci_run' },
        new WaitForCiRunTool(this)
      );

      this.session.registerTool(
        { toolName: 'get_task_logs' },
        new GetTaskLogsTool(this)
      );

      this.session.registerTool(
        { toolName: 'head_logs' },
        new HeadLogsTool(this)
      );

      this.session.registerTool(
        { toolName: 'tail_logs' },
        new TailLogsTool(this)
      );

      this.session.registerTool(
        { toolName: 'grep_logs' },
        new GrepLogsTool(this)
      );

      this.session.registerTool(
        { toolName: 'get_recent_runs' },
        new GetRecentRunsTool(this)
      );

      console.error('[RWX Plugin] Registered 7 native tools (launch_ci_run, wait_for_ci_run, get_task_logs, head_logs, tail_logs, grep_logs, get_recent_runs)');
    } catch (error) {
      console.error('[RWX Plugin] Failed to initialize:', error);
      throw error;
    }
  }

  public async onShutdownAsync(): Promise<void> {
    if (this._proxyClient) {
      await this._proxyClient.stopAsync();
      this._proxyClient = null;
    }
  }
}

export default (session: RushMcpPluginSession) => new RwxPlugin(session);
