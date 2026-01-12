import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '@rushstack/mcp-server';
import type { RwxPlugin } from '../index';
export declare class AnalyzeCiRunTool implements IRushMcpTool<AnalyzeCiRunTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): any;
    executeAsync(input: zodModule.infer<AnalyzeCiRunTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=AnalyzeCiRunTool.d.ts.map