# AGENTS.md - Rush MCP RWX Plugin

## Overview

This is a **Rush MCP plugin** that integrates RWX CI/CD functionality into the Rush monorepo MCP server. The plugin acts as a proxy, spawning the standalone `rwx-mcp-server` and forwarding tool requests via JSON-RPC over stdio.

## Commands

```bash
# Install dependencies
npm install

# Build (compiles TypeScript to lib/)
npm run build

# Clean build output
npm run clean
```

No test suite is currently configured.

## Project Structure

```
src/
├── index.ts              # Plugin entry point, exports RwxPlugin class
├── McpProxyClient.ts     # JSON-RPC client that spawns and proxies to rwx-mcp-server
├── ProxyTool.ts          # Generic tool wrapper that forwards requests to proxy
├── utils.ts              # Shared utilities (RWX CLI wrapper, API helpers)
└── tools/                # Individual MCP tool implementations (currently unused in proxy mode)
    ├── GetTaskLogsTool.ts
    ├── LaunchCiRunTool.ts
    └── WaitForCiRunTool.ts
```

## Architecture

### Plugin Registration

The plugin implements `IRushMcpPlugin` from `@rushstack/mcp-server`:

1. **Entry point**: `rush-mcp-plugin.json` points to `lib/index.js`
2. **Initialization**: `onInitializeAsync()` spawns the `rwx-mcp-server` subprocess
3. **Tool discovery**: Dynamically registers all tools discovered from the downstream server
4. **Request forwarding**: All tool calls are proxied via `ProxyTool` → `McpProxyClient`

### Proxy Pattern

The plugin doesn't execute tool logic directly. Instead:

1. `McpProxyClient` spawns `node packages/rwx-mcp-server/dist/index.js` (relative to Rush workspace root)
2. Communicates via JSON-RPC 2.0 over stdio (newline-delimited JSON)
3. On startup, initializes MCP protocol and fetches available tools
4. `ProxyTool` dynamically converts JSON Schema to Zod schema for Rush MCP compatibility

### Tool Files (src/tools/)

These files contain standalone tool implementations that query RWX APIs. They are **not currently used** in the proxy architecture but serve as reference implementations or fallbacks.

## Code Patterns

### Tool Implementation Pattern

All tools implement `IRushMcpTool<T['schema']>`:

```typescript
export class SomeTool implements IRushMcpTool<SomeTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      // schema definition
    });
  }

  public async executeAsync(input: zodModule.infer<SomeTool['schema']>): Promise<CallToolResult> {
    // implementation
  }
}
```

### Return Format

All tools return `CallToolResult` with JSON-stringified content:

```typescript
return {
  content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
  isError: false, // or true for errors
};
```

### Error Handling

Errors are caught and returned as error content rather than thrown:

```typescript
catch (error) {
  return {
    content: [{ type: 'text', text: `Failed to do X: ${error}` }],
    isError: true,
  };
}
```

## TypeScript Configuration

- **Target**: ES2020
- **Module**: CommonJS
- **Strict mode**: Enabled
- **Output**: `lib/` directory with declarations and source maps
- **Types**: `@types/node` only

## Dependencies

### Runtime
- `@types/node` (incorrectly in dependencies, should be devDependencies)
- `typescript` (incorrectly in dependencies, should be devDependencies)

### Peer Dependencies
- `@rushstack/mcp-server` ^0.1.4 (required, provides MCP types and runtime)

## Environment Variables

The plugin expects these environment variables when tools call RWX APIs:

- `RWX_ACCESS_TOKEN` - Bearer token for RWX Cloud API authentication

## Constants (src/utils.ts)

```typescript
RWX_ORG = 'curri'           // Organization slug for RWX URLs
```

## Gotchas

1. **Proxy server path is hardcoded**: `McpProxyClient` expects `packages/rwx-mcp-server/dist/index.js` relative to `process.cwd()` (Rush workspace root). This must exist in the consuming monorepo.

2. **No standalone operation**: This plugin only works within a Rush MCP server context; it cannot run independently.

3. **Tool files unused**: The `src/tools/` directory contains reference implementations but the proxy architecture dynamically discovers and forwards to downstream tools.

4. **JSON Schema to Zod conversion**: `ProxyTool.schema` does basic type mapping (string, number, boolean, array, object). Complex JSON Schema features (enums, nested objects with specific shapes) are simplified to `zod.unknown()` or `zod.record()`.

5. **Stderr filtering**: `McpProxyClient` filters out the startup message "RWX CI/CD MCP Server running" from stderr output.

6. **No graceful shutdown handling**: If the proxy process dies unexpectedly, pending requests are rejected but no automatic restart occurs.
