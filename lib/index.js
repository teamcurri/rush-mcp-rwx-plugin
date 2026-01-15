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
const SetRwxAccessTokenTool_1 = require("./tools/SetRwxAccessTokenTool");
const VerifyRwxCliTool_1 = require("./tools/VerifyRwxCliTool");
class RwxPlugin {
    constructor(session) {
        this._proxyClient = null;
        this._rwxCliReady = false;
        this.session = session;
    }
    /**
     * Check if the rwx CLI is ready (installed and meets minimum version).
     */
    get rwxCliReady() {
        return this._rwxCliReady;
    }
    async onInitializeAsync() {
        try {
            // Always register configuration tools first - these don't require CLI or token
            this.session.registerTool({ toolName: 'set_rwx_access_token' }, new SetRwxAccessTokenTool_1.SetRwxAccessTokenTool(this));
            this.session.registerTool({ toolName: 'verify_rwx_cli' }, new VerifyRwxCliTool_1.VerifyRwxCliTool(this));
            // Check rwx CLI version - but don't throw, just log and set state
            const cliCheck = (0, utils_1.getRwxCliVersion)();
            this._rwxCliReady = cliCheck.installed && cliCheck.meetsMinimum;
            if (!cliCheck.installed) {
                console.error('[RWX Plugin] rwx CLI not installed - tools will prompt for installation');
            }
            else if (!cliCheck.meetsMinimum) {
                console.error(`[RWX Plugin] rwx CLI version ${cliCheck.version} is below minimum - tools will prompt for upgrade`);
            }
            // Only start proxy client if CLI is ready
            if (this._rwxCliReady) {
                // Start the rwx mcp proxy client
                this._proxyClient = new McpProxyClient_1.McpProxyClient();
                await this._proxyClient.startAsync();
                // Dynamically register all tools from the rwx mcp server
                for (const tool of this._proxyClient.tools) {
                    this.session.registerTool({ toolName: tool.name }, new ProxyTool_1.ProxyTool(this, this._proxyClient, tool.name, tool.description || '', tool.inputSchema));
                }
                console.error(`[RWX Plugin] Successfully proxied ${this._proxyClient.tools.length} tools from rwx mcp serve`);
            }
            // Register native tools that extend rwx mcp functionality
            // These will check for CLI/token availability at runtime
            this.session.registerTool({ toolName: 'launch_ci_run' }, new LaunchCiRunTool_1.LaunchCiRunTool(this));
            this.session.registerTool({ toolName: 'wait_for_ci_run' }, new WaitForCiRunTool_1.WaitForCiRunTool(this));
            this.session.registerTool({ toolName: 'get_task_logs' }, new GetTaskLogsTool_1.GetTaskLogsTool(this));
            this.session.registerTool({ toolName: 'head_logs' }, new HeadLogsTool_1.HeadLogsTool(this));
            this.session.registerTool({ toolName: 'tail_logs' }, new TailLogsTool_1.TailLogsTool(this));
            this.session.registerTool({ toolName: 'grep_logs' }, new GrepLogsTool_1.GrepLogsTool(this));
            this.session.registerTool({ toolName: 'get_recent_runs' }, new GetRecentRunsTool_1.GetRecentRunsTool(this));
            console.error('[RWX Plugin] Registered 9 native tools (set_rwx_access_token, verify_rwx_cli, launch_ci_run, wait_for_ci_run, get_task_logs, head_logs, tail_logs, grep_logs, get_recent_runs)');
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