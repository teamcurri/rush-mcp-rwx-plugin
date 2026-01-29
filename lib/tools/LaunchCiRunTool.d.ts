import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class LaunchCiRunTool implements IRushMcpTool<LaunchCiRunTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        targets: zodModule.ZodOptional<zodModule.ZodArray<zodModule.ZodString, "many">>;
        wait: zodModule.ZodDefault<zodModule.ZodBoolean>;
    }, "strip", zodModule.ZodTypeAny, {
        wait: boolean;
        targets?: string[] | undefined;
    }, {
        targets?: string[] | undefined;
        wait?: boolean | undefined;
    }>;
    executeAsync(input: zodModule.infer<LaunchCiRunTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=LaunchCiRunTool.d.ts.map