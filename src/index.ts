import type { IRushMcpPlugin, RushMcpPluginSession } from './types/rush-mcp-plugin';
import { McpProxyClient } from './McpProxyClient';
import { ProxyTool } from './ProxyTool';
import { getRwxCliVersion } from './utils';
import { LaunchCiRunTool } from './tools/LaunchCiRunTool';
import { WaitForCiRunTool } from './tools/WaitForCiRunTool';
import { GetTaskLogsTool } from './tools/GetTaskLogsTool';
import { HeadLogsTool } from './tools/HeadLogsTool';
import { TailLogsTool } from './tools/TailLogsTool';
import { GrepLogsTool } from './tools/GrepLogsTool';
import { GetRecentRunsTool } from './tools/GetRecentRunsTool';
import { SetRwxAccessTokenTool } from './tools/SetRwxAccessTokenTool';
import { VerifyRwxCliTool } from './tools/VerifyRwxCliTool';
import { ValidateWorkflowTool } from './tools/ValidateWorkflowTool';
import { GetRunResultsTool } from './tools/GetRunResultsTool';
import { GetArtifactsTool } from './tools/GetArtifactsTool';

export class RwxPlugin implements IRushMcpPlugin {
  public session: RushMcpPluginSession;
  private _proxyClient: McpProxyClient | null = null;
  private _rwxCliReady: boolean = false;

  public constructor(session: RushMcpPluginSession) {
    this.session = session;
  }

  /**
   * Check if the rwx CLI is ready (installed and meets minimum version).
   */
  public get rwxCliReady(): boolean {
    return this._rwxCliReady;
  }

  public async onInitializeAsync(): Promise<void> {
    try {
      // Always register configuration tools first - these don't require CLI or token
      this.session.registerTool(
        { toolName: 'set_rwx_access_token' },
        new SetRwxAccessTokenTool(this)
      );

      this.session.registerTool(
        { toolName: 'verify_rwx_cli' },
        new VerifyRwxCliTool(this)
      );

      // Check rwx CLI version - but don't throw, just log and set state
      const cliCheck = getRwxCliVersion();
      this._rwxCliReady = cliCheck.installed && cliCheck.meetsMinimum;

      if (!cliCheck.installed) {
        console.error('[RWX Plugin] rwx CLI not installed - tools will prompt for installation');
      } else if (!cliCheck.meetsMinimum) {
        console.error(`[RWX Plugin] rwx CLI version ${cliCheck.version} is below minimum - tools will prompt for upgrade`);
      }

      // Only start proxy client if CLI is ready
      if (this._rwxCliReady) {
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
      }

      // Register native tools that extend rwx mcp functionality
      // These will check for CLI/token availability at runtime
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

      this.session.registerTool(
        { toolName: 'validate_workflow' },
        new ValidateWorkflowTool(this)
      );

      this.session.registerTool(
        { toolName: 'get_run_results' },
        new GetRunResultsTool(this)
      );

      this.session.registerTool(
        { toolName: 'get_artifacts' },
        new GetArtifactsTool(this)
      );

      console.error('[RWX Plugin] Registered 12 native tools (set_rwx_access_token, verify_rwx_cli, launch_ci_run, wait_for_ci_run, get_task_logs, head_logs, tail_logs, grep_logs, get_recent_runs, validate_workflow, get_run_results, get_artifacts)');
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
