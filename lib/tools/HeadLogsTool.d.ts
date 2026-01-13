import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class HeadLogsTool implements IRushMcpTool<HeadLogsTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        id: zodModule.ZodString;
        lines: zodModule.ZodDefault<zodModule.ZodNumber>;
    }, "strip", zodModule.ZodTypeAny, {
        id: string;
        lines: number;
    }, {
        id: string;
        lines?: number | undefined;
    }>;
    executeAsync(input: zodModule.infer<HeadLogsTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=HeadLogsTool.d.ts.map