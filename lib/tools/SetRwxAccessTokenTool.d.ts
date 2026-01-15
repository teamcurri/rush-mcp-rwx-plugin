import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class SetRwxAccessTokenTool implements IRushMcpTool<SetRwxAccessTokenTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        token: zodModule.ZodString;
    }, "strip", zodModule.ZodTypeAny, {
        token: string;
    }, {
        token: string;
    }>;
    executeAsync(input: zodModule.infer<SetRwxAccessTokenTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=SetRwxAccessTokenTool.d.ts.map