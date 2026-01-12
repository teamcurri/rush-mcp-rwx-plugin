/**
 * Type declarations for Rush MCP plugin system.
 * These types represent the expected plugin API that is not yet published
 * in @rushstack/mcp-server.
 */

import type { z } from 'zod';

export type { z as zodModule };

export interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface RushMcpPluginSession {
  zod: typeof z;
  registerTool(options: { toolName: string }, tool: IRushMcpTool<unknown>): void;
}

export interface IRushMcpPlugin {
  session: RushMcpPluginSession;
  onInitializeAsync(): Promise<void>;
  onShutdownAsync(): Promise<void>;
}

export interface IRushMcpTool<TSchema> {
  plugin: IRushMcpPlugin;
  session: RushMcpPluginSession;
  schema: TSchema;
  executeAsync(input: unknown): Promise<CallToolResult>;
}
