import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from './types/rush-mcp-plugin';
import type { RwxPlugin } from './index';
import type { McpProxyClient } from './McpProxyClient';

/**
 * A generic proxy tool that forwards requests to the standalone rwx mcp server
 */
export class ProxyTool implements IRushMcpTool<ProxyTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;
  private readonly _toolName: string;
  private readonly _toolDescription: string;
  private readonly _inputSchema: Record<string, unknown>;
  private readonly _proxyClient: McpProxyClient;

  public constructor(
    plugin: RwxPlugin,
    proxyClient: McpProxyClient,
    toolName: string,
    toolDescription: string,
    inputSchema: Record<string, unknown>
  ) {
    this.plugin = plugin;
    this.session = plugin.session;
    this._proxyClient = proxyClient;
    this._toolName = toolName;
    this._toolDescription = toolDescription;
    this._inputSchema = inputSchema;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;

    // Convert JSON Schema to Zod schema
    // For simplicity, we'll build a basic ZodObject from the properties
    const properties = (this._inputSchema.properties as Record<string, any>) || {};
    const required = (this._inputSchema.required as string[]) || [];

    const zodShape: Record<string, any> = {};

    for (const [key, propSchema] of Object.entries(properties)) {
      const propType = (propSchema as any).type;
      const propDescription = (propSchema as any).description;

      let zodField: any;

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

  public async executeAsync(input: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const result = await this._proxyClient.callToolAsync(this._toolName, input);

      // The result should already be in CallToolResult format from the downstream server
      return result as CallToolResult;
    } catch (error) {
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
