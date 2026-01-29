"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyTool = void 0;
/**
 * Patterns to replace CLI command references with MCP tool references
 * Note: Backtick patterns must come BEFORE plain text patterns to match first
 */
const CLI_TO_MCP_REPLACEMENTS = [
    // Backtick patterns first (more specific)
    [/`rwx logs[^`]*`/gi, 'the log tools (get_task_logs, head_logs, tail_logs, grep_logs)'],
    [/`rwx results[^`]*`/gi, 'the get_run_results tool'],
    [/`rwx artifacts[^`]*`/gi, 'the get_artifacts tool'],
    [/`rwx run[^`]*`/gi, 'the launch_ci_run tool'],
    // Plain text patterns (less specific, match after backticks)
    [/\brwx logs\b/gi, 'the log tools (get_task_logs, head_logs, tail_logs, grep_logs)'],
    [/\brwx results\b/gi, 'the get_run_results tool'],
    [/\brwx artifacts\b/gi, 'the get_artifacts tool'],
    [/\brwx run\b/gi, 'the launch_ci_run tool'],
];
/**
 * Transform text content to replace CLI references with MCP tool references
 */
function transformCliReferences(text) {
    let result = text;
    for (const [pattern, replacement] of CLI_TO_MCP_REPLACEMENTS) {
        result = result.replace(pattern, replacement);
    }
    return result;
}
/**
 * Transform a CallToolResult to replace CLI references in text content
 */
function transformResult(result) {
    if (!result.content || !Array.isArray(result.content)) {
        return result;
    }
    const transformedContent = result.content.map((item) => {
        if (item.type === 'text' && typeof item.text === 'string') {
            return {
                ...item,
                text: transformCliReferences(item.text),
            };
        }
        return item;
    });
    return {
        ...result,
        content: transformedContent,
    };
}
/**
 * A generic proxy tool that forwards requests to the standalone rwx mcp server
 */
class ProxyTool {
    constructor(plugin, proxyClient, toolName, toolDescription, inputSchema) {
        this.plugin = plugin;
        this.session = plugin.session;
        this._proxyClient = proxyClient;
        this._toolName = toolName;
        this._toolDescription = transformCliReferences(toolDescription);
        this._inputSchema = inputSchema;
    }
    get schema() {
        const zod = this.session.zod;
        // Convert JSON Schema to Zod schema
        // For simplicity, we'll build a basic ZodObject from the properties
        const properties = this._inputSchema.properties || {};
        const required = this._inputSchema.required || [];
        const zodShape = {};
        for (const [key, propSchema] of Object.entries(properties)) {
            const propType = propSchema.type;
            let propDescription = propSchema.description;
            // Transform CLI references in descriptions
            if (propDescription) {
                propDescription = transformCliReferences(propDescription);
            }
            let zodField;
            // Map JSON Schema types to Zod types
            switch (propType) {
                case 'string':
                    zodField = zod.string();
                    break;
                case 'number':
                    zodField = zod.number();
                    break;
                case 'boolean':
                    zodField = zod.boolean();
                    break;
                case 'array':
                    zodField = zod.array(zod.unknown());
                    break;
                case 'object':
                    zodField = zod.record(zod.unknown());
                    break;
                default:
                    zodField = zod.unknown();
            }
            // Add description if present
            if (propDescription) {
                zodField = zodField.describe(propDescription);
            }
            // Make optional if not in required array
            if (!required.includes(key)) {
                zodField = zodField.optional();
            }
            zodShape[key] = zodField;
        }
        return zod.object(zodShape);
    }
    async executeAsync(input) {
        try {
            const result = await this._proxyClient.callToolAsync(this._toolName, input);
            // Transform the result to replace CLI references with MCP tool references
            return transformResult(result);
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error calling ${this._toolName}: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    }
}
exports.ProxyTool = ProxyTool;
//# sourceMappingURL=ProxyTool.js.map