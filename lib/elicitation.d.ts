import type { CallToolResult } from './types/rush-mcp-plugin';
/**
 * Elicitation response format for prompting users for input.
 * When a tool returns this, the agent should:
 * 1. Display the question/instructions to the user
 * 2. Collect input according to input_schema
 * 3. Call next_tool with the collected input
 * 4. After next_tool succeeds, retry the original tool
 */
export interface ElicitationResponse {
    status: 'needs_user_input';
    kind: 'elicitation';
    question: string;
    instructions?: string;
    input_schema: {
        type: 'string' | 'object';
        enum?: string[];
        properties?: Record<string, {
            type: string;
            description?: string;
            enum?: string[];
        }>;
        required?: string[];
    };
    next_tool: string;
    next_tool_inputs?: Record<string, unknown>;
}
/**
 * Create an elicitation response that prompts the user for the RWX access token.
 */
export declare function createRwxTokenElicitation(): CallToolResult;
/**
 * Create an elicitation response that prompts the user to install or upgrade the rwx CLI.
 */
export declare function createRwxCliInstallElicitation(currentVersion: string | null, requiredVersion: string): CallToolResult;
/**
 * Check if RWX_ACCESS_TOKEN is set.
 * Returns an elicitation response if not set, null otherwise.
 */
export declare function checkRwxToken(): CallToolResult | null;
/**
 * Check if the rwx CLI is installed and meets minimum version.
 * Returns an elicitation response if not ready, null otherwise.
 */
export declare function checkRwxCli(): CallToolResult | null;
/**
 * Check all RWX prerequisites (CLI and token).
 * Returns the first elicitation response needed, or null if all ready.
 * Checks CLI first, then token.
 */
export declare function checkRwxPrerequisites(): CallToolResult | null;
/**
 * Create an elicitation response for an invalid/expired RWX token (401 error).
 */
export declare function createRwxTokenInvalidElicitation(): CallToolResult;
/**
 * Check if an error is a 401 Unauthorized error.
 */
export declare function is401Error(error: unknown): boolean;
/**
 * Handle an error, returning an elicitation response for 401 errors
 * or a standard error response otherwise.
 */
export declare function handleRwxError(error: unknown, operation: string): CallToolResult;
//# sourceMappingURL=elicitation.d.ts.map