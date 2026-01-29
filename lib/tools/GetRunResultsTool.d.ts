import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class GetRunResultsTool implements IRushMcpTool<GetRunResultsTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        run_id: zodModule.ZodString;
    }, "strip", zodModule.ZodTypeAny, {
        run_id: string;
    }, {
        run_id: string;
    }>;
    executeAsync(input: zodModule.infer<GetRunResultsTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=GetRunResultsTool.d.ts.map