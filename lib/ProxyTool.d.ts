import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from './types/rush-mcp-plugin';
import type { RwxPlugin } from './index';
import type { McpProxyClient } from './McpProxyClient';
/**
 * A generic proxy tool that forwards requests to the standalone rwx mcp server
 */
export declare class ProxyTool implements IRushMcpTool<ProxyTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    private readonly _toolName;
    private readonly _toolDescription;
    private readonly _inputSchema;
    private readonly _proxyClient;
    constructor(plugin: RwxPlugin, proxyClient: McpProxyClient, toolName: string, toolDescription: string, inputSchema: Record<string, unknown>);
    get schema(): zodModule.ZodObject<Record<string, any>, "strip", zodModule.ZodTypeAny, {
        [x: string]: any;
    }, {
        [x: string]: any;
    }>;
    executeAsync(input: Record<string, unknown>): Promise<CallToolResult>;
}
//# sourceMappingURL=ProxyTool.d.ts.map