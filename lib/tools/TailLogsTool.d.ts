import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class TailLogsTool implements IRushMcpTool<TailLogsTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        id: zodModule.ZodString;
        lines: zodModule.ZodDefault<zodModule.ZodNumber>;
        offset: zodModule.ZodDefault<zodModule.ZodNumber>;
    }, "strip", zodModule.ZodTypeAny, {
        id: string;
        lines: number;
        offset: number;
    }, {
        id: string;
        lines?: number | undefined;
        offset?: number | undefined;
    }>;
    executeAsync(input: zodModule.infer<TailLogsTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=TailLogsTool.d.ts.map