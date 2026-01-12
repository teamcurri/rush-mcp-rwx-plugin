import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class WaitForCiRunTool implements IRushMcpTool<WaitForCiRunTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        run_id: zodModule.ZodString;
        timeout_seconds: zodModule.ZodDefault<zodModule.ZodNumber>;
        poll_interval_seconds: zodModule.ZodDefault<zodModule.ZodNumber>;
    }, "strip", zodModule.ZodTypeAny, {
        run_id: string;
        timeout_seconds: number;
        poll_interval_seconds: number;
    }, {
        run_id: string;
        timeout_seconds?: number | undefined;
        poll_interval_seconds?: number | undefined;
    }>;
    executeAsync(input: zodModule.infer<WaitForCiRunTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=WaitForCiRunTool.d.ts.map