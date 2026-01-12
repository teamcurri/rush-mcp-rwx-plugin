"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyTool = void 0;
/**
 * A generic proxy tool that forwards requests to the standalone rwx mcp server
 */
class ProxyTool {
    constructor(plugin, proxyClient, toolName, toolDescription, inputSchema) {
        this.plugin = plugin;
        this.session = plugin.session;
        this._proxyClient = proxyClient;
        this._toolName = toolName;
        this._toolDescription = toolDescription;
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
            const propDescription = propSchema.description;
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
            // The result should already be in CallToolResult format from the downstream server
            return result;
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