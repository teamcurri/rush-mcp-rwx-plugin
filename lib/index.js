"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RwxPlugin = void 0;
const McpProxyClient_1 = require("./McpProxyClient");
const ProxyTool_1 = require("./ProxyTool");
class RwxPlugin {
    constructor(session) {
        this._proxyClient = null;
        this.session = session;
    }
    async onInitializeAsync() {
        try {
            // Get the Rush workspace path (current working directory when Rush MCP server starts)
            const rushWorkspacePath = process.cwd();
            // Start the rwx mcp proxy client
            this._proxyClient = new McpProxyClient_1.McpProxyClient();
            await this._proxyClient.startAsync(rushWorkspacePath);
            // Dynamically register all tools from the rwx mcp server
            for (const tool of this._proxyClient.tools) {
                this.session.registerTool({ toolName: tool.name }, new ProxyTool_1.ProxyTool(this, this._proxyClient, tool.name, tool.description || '', tool.inputSchema));
            }
            console.error(`[RWX Plugin] Successfully proxied ${this._proxyClient.tools.length} tools from rwx mcp server`);
        }
        catch (error) {
            console.error('[RWX Plugin] Failed to start proxy client:', error);
            throw error;
        }
    }
    async onShutdownAsync() {
        if (this._proxyClient) {
            await this._proxyClient.stopAsync();
            this._proxyClient = null;
        }
    }
}
exports.RwxPlugin = RwxPlugin;
exports.default = (session) => new RwxPlugin(session);
//# sourceMappingURL=index.js.map