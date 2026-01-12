import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '@rushstack/mcp-server';
import type { RwxPlugin } from '../index';
export declare class CompareRunsTool implements IRushMcpTool<CompareRunsTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): any;
    executeAsync(input: zodModule.infer<CompareRunsTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=CompareRunsTool.d.ts.map