import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class GetTaskLogsTool implements IRushMcpTool<GetTaskLogsTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        task_id: zodModule.ZodString;
    }, "strip", zodModule.ZodTypeAny, {
        task_id: string;
    }, {
        task_id: string;
    }>;
    executeAsync(input: zodModule.infer<GetTaskLogsTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=GetTaskLogsTool.d.ts.map