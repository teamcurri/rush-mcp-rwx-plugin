import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '@rushstack/mcp-server';
import type { RwxPlugin } from '../index';
export declare class GetRecentRunsTool implements IRushMcpTool<GetRecentRunsTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): any;
    executeAsync(input: zodModule.infer<GetRecentRunsTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=GetRecentRunsTool.d.ts.map