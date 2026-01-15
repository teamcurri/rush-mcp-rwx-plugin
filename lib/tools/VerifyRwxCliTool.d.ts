import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class VerifyRwxCliTool implements IRushMcpTool<VerifyRwxCliTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        confirmed: zodModule.ZodOptional<zodModule.ZodString>;
    }, "strip", zodModule.ZodTypeAny, {
        confirmed?: string | undefined;
    }, {
        confirmed?: string | undefined;
    }>;
    executeAsync(_input: zodModule.infer<VerifyRwxCliTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=VerifyRwxCliTool.d.ts.map