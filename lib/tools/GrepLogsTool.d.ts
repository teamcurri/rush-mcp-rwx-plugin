import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class GrepLogsTool implements IRushMcpTool<GrepLogsTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        id: zodModule.ZodString;
        pattern: zodModule.ZodString;
        context: zodModule.ZodDefault<zodModule.ZodNumber>;
        page: zodModule.ZodDefault<zodModule.ZodNumber>;
    }, "strip", zodModule.ZodTypeAny, {
        id: string;
        pattern: string;
        context: number;
        page: number;
    }, {
        id: string;
        pattern: string;
        context?: number | undefined;
        page?: number | undefined;
    }>;
    executeAsync(input: zodModule.infer<GrepLogsTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=GrepLogsTool.d.ts.map