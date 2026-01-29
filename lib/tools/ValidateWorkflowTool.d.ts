import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
export interface ValidationDiagnostic {
    severity: 'error' | 'warning' | 'info';
    message: string;
    advice?: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationDiagnostic[];
    warnings: ValidationDiagnostic[];
    taskCount?: number;
    taskKeys?: string[];
}
export declare class ValidateWorkflowTool implements IRushMcpTool<ValidateWorkflowTool['schema']> {
    readonly plugin: RwxPlugin;
    readonly session: RushMcpPluginSession;
    constructor(plugin: RwxPlugin);
    get schema(): zodModule.ZodObject<{
        file_path: zodModule.ZodOptional<zodModule.ZodString>;
        content: zodModule.ZodOptional<zodModule.ZodString>;
    }, "strip", zodModule.ZodTypeAny, {
        content?: string | undefined;
        file_path?: string | undefined;
    }, {
        content?: string | undefined;
        file_path?: string | undefined;
    }>;
    executeAsync(input: zodModule.infer<ValidateWorkflowTool['schema']>): Promise<CallToolResult>;
    private validateWorkflow;
}
//# sourceMappingURL=ValidateWorkflowTool.d.ts.map