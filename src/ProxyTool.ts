import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from './types/rush-mcp-plugin';
import type { RwxPlugin } from './index';
import type { McpProxyClient } from './McpProxyClient';

/**
 * Patterns to replace CLI command references with MCP tool references
 */
const CLI_TO_MCP_REPLACEMENTS: Array<[RegExp, string]> = [
  // rwx logs -> get_task_logs / head_logs / tail_logs / grep_logs
  [/\brwx logs\b/gi, 'get_task_logs, head_logs, tail_logs, or grep_logs tools'],
  [/`rwx logs[^`]*`/gi, 'the log tools (get_task_logs, head_logs, tail_logs, grep_logs)'],
  
  // rwx results -> get_run_results
  [/\brwx results\b/gi, 'get_run_results tool'],
  [/`rwx results[^`]*`/gi, 'the get_run_results tool'],
  
  // rwx artifacts -> get_artifacts
  [/\brwx artifacts\b/gi, 'get_artifacts tool'],
  [/`rwx artifacts[^`]*`/gi, 'the get_artifacts tool'],
  
  // rwx run -> launch_ci_run
  [/\brwx run\b/gi, 'launch_ci_run tool'],
  [/`rwx run[^`]*`/gi, 'the launch_ci_run tool'],
];

/**
 * Transform text content to replace CLI references with MCP tool references
 */
function transformCliReferences(text: string): string {
  let result = text;
  for (const [pattern, replacement] of CLI_TO_MCP_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Transform a CallToolResult to replace CLI references in text content
 */
function transformResult(result: CallToolResult): CallToolResult {
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
    this._toolDescription = transformCliReferences(toolDescription);
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
      let propDescription = (propSchema as any).description;

      // Transform CLI references in descriptions
      if (propDescription) {
        propDescription = transformCliReferences(propDescription);
      }

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

      // Transform the result to replace CLI references with MCP tool references
      return transformResult(result as CallToolResult);
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
