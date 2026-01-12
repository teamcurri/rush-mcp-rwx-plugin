import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class LaunchCiRunTool implements IRushMcpTool<LaunchCiRunTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        ref: zodModule.ZodString;
        targets: zodModule.ZodOptional<zodModule.ZodArray<zodModule.ZodString, "many">>;
    }, "strip", zodModule.ZodTypeAny, {
        ref: string;
        targets?: string[] | undefined;
    }, {
        ref: string;
        targets?: string[] | undefined;
    }>;
    executeAsync(input: zodModule.infer<LaunchCiRunTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=LaunchCiRunTool.d.ts.map