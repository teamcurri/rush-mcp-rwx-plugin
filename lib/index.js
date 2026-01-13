"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RwxPlugin = void 0;
const McpProxyClient_1 = require("./McpProxyClient");
const ProxyTool_1 = require("./ProxyTool");
const utils_1 = require("./utils");
const LaunchCiRunTool_1 = require("./tools/LaunchCiRunTool");
const WaitForCiRunTool_1 = require("./tools/WaitForCiRunTool");
const GetTaskLogsTool_1 = require("./tools/GetTaskLogsTool");
const HeadLogsTool_1 = require("./tools/HeadLogsTool");
const TailLogsTool_1 = require("./tools/TailLogsTool");
const GrepLogsTool_1 = require("./tools/GrepLogsTool");
const GetRecentRunsTool_1 = require("./tools/GetRecentRunsTool");
class RwxPlugin {
    constructor(session) {
        this._proxyClient = null;
        this.session = session;
    }
    async onInitializeAsync() {
        // Check rwx CLI version on boot - throws if not installed or version too low
        (0, utils_1.checkRwxCliVersion)();
        try {
            // Start the rwx mcp proxy client
            this._proxyClient = new McpProxyClient_1.McpProxyClient();
            await this._proxyClient.startAsync();
            // Dynamically register all tools from the rwx mcp server
            for (const tool of this._proxyClient.tools) {
                this.session.registerTool({ toolName: tool.name }, new ProxyTool_1.ProxyTool(this, this._proxyClient, tool.name, tool.description || '', tool.inputSchema));
            }
            console.error(`[RWX Plugin] Successfully proxied ${this._proxyClient.tools.length} tools from rwx mcp serve`);
            // Register native tools that extend rwx mcp functionality
            this.session.registerTool({ toolName: 'launch_ci_run' }, new LaunchCiRunTool_1.LaunchCiRunTool(this));
            this.session.registerTool({ toolName: 'wait_for_ci_run' }, new WaitForCiRunTool_1.WaitForCiRunTool(this));
            this.session.registerTool({ toolName: 'get_task_logs' }, new GetTaskLogsTool_1.GetTaskLogsTool(this));
            this.session.registerTool({ toolName: 'head_logs' }, new HeadLogsTool_1.HeadLogsTool(this));
            this.session.registerTool({ toolName: 'tail_logs' }, new TailLogsTool_1.TailLogsTool(this));
            this.session.registerTool({ toolName: 'grep_logs' }, new GrepLogsTool_1.GrepLogsTool(this));
            this.session.registerTool({ toolName: 'get_recent_runs' }, new GetRecentRunsTool_1.GetRecentRunsTool(this));
            console.error('[RWX Plugin] Registered 7 native tools (launch_ci_run, wait_for_ci_run, get_task_logs, head_logs, tail_logs, grep_logs, get_recent_runs)');
        }
        catch (error) {
            console.error('[RWX Plugin] Failed to initialize:', error);
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