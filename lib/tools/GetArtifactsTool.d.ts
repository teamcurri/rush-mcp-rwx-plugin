import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export declare class GetArtifactsTool implements IRushMcpTool<GetArtifactsTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        run_id: zodModule.ZodString;
        download: zodModule.ZodDefault<zodModule.ZodBoolean>;
        artifact_key: zodModule.ZodOptional<zodModule.ZodString>;
    }, "strip", zodModule.ZodTypeAny, {
        run_id: string;
        download: boolean;
        artifact_key?: string | undefined;
    }, {
        run_id: string;
        download?: boolean | undefined;
        artifact_key?: string | undefined;
    }>;
    executeAsync(input: zodModule.infer<GetArtifactsTool['schema']>): Promise<CallToolResult>;
}
//# sourceMappingURL=GetArtifactsTool.d.ts.map