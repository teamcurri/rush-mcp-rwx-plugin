import type { IRushMcpPlugin, RushMcpPluginSession } from '@rushstack/mcp-server';
import { McpProxyClient } from './McpProxyClient';
import { ProxyTool } from './ProxyTool';

export class RwxPlugin implements IRushMcpPlugin {
  public session: RushMcpPluginSession;
  private _proxyClient: McpProxyClient | null = null;

  public constructor(session: RushMcpPluginSession) {
    this.session = session;
  }

  public async onInitializeAsync(): Promise<void> {
    try {
      // Get the Rush workspace path (current working directory when Rush MCP server starts)
      const rushWorkspacePath = process.cwd();

      // Start the rwx mcp proxy client
      this._proxyClient = new McpProxyClient();
      await this._proxyClient.startAsync(rushWorkspacePath);

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

      console.error(`[RWX Plugin] Successfully proxied ${this._proxyClient.tools.length} tools from rwx mcp server`);
    } catch (error) {
      console.error('[RWX Plugin] Failed to start proxy client:', error);
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
