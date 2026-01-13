import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class GetRecentRunsTool implements IRushMcpTool<GetRecentRunsTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        ref: zodModule.ZodString;
        limit: zodModule.ZodDefault<zodModule.ZodNumber>;
    }, "strip", zodModule.ZodTypeAny, {
        ref: string;
        limit: number;
    }, {
        ref: string;
        limit?: number | undefined;
    }>;
    executeAsync(input: zodModule.infer<GetRecentRunsTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=GetRecentRunsTool.d.ts.map