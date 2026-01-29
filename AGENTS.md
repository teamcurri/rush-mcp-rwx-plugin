# AGENTS.md - Rush MCP RWX Plugin

## Overview

This is a **Rush MCP plugin** that integrates RWX CI/CD functionality into the Rush monorepo MCP server. The plugin:

1. **Proxies tools** from the `rwx mcp serve` CLI command
2. **Provides native tools** for enhanced CI/CD operations (launch, wait, results, logs, artifacts)
3. **Validates** that the rwx CLI is installed with version >= 3.0.0 on boot

## Prerequisites

- `rwx` CLI installed and in PATH (version >= 3.0.0)
- `RWX_ACCESS_TOKEN` environment variable set for API operations

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
├── McpProxyClient.ts     # JSON-RPC client that spawns `rwx mcp serve`
├── ProxyTool.ts          # Generic tool wrapper for proxied tools
├── utils.ts              # Shared utilities (CLI version check, API helpers)
├── support/              # RWX language server components
│   ├── parser.js         # Bundled RWX YAML parser (from rwx-cloud/language-server)
│   ├── parser.d.ts       # TypeScript declarations for the parser
│   └── rwx-yaml-schema.json  # JSON Schema for RWX workflow validation
└── tools/                # Native tool implementations
    ├── GetTaskLogsTool.ts      # Download and return full task logs
    ├── LaunchCiRunTool.ts      # Launch a CI run via `rwx run` (supports --wait)
    ├── WaitForCiRunTool.ts     # Poll and wait for run completion (legacy)
    ├── GetRunResultsTool.ts    # Get run results via `rwx results`
    ├── GetArtifactsTool.ts     # List/download artifacts via `rwx artifacts`
    ├── HeadLogsTool.ts         # Return first N lines of logs
    ├── TailLogsTool.ts         # Return last N lines of logs
    ├── GrepLogsTool.ts         # Search logs for pattern with context
    └── ValidateWorkflowTool.ts # Validate RWX workflow YAML files
```

## Tools Provided

### Proxied Tools (from `rwx mcp serve`)

All tools exposed by `rwx mcp serve` are automatically discovered and proxied.

### Native Tools

| Tool | Description |
|------|-------------|
| `launch_ci_run` | Launch a CI workflow using `rwx run` with optional `--wait` flag |
| `wait_for_ci_run` | Poll the RWX API until a run completes or times out |
| `get_run_results` | Get structured run results via `rwx results --output json` |
| `get_artifacts` | List or download artifacts via `rwx artifacts --output json` |
| `get_task_logs` | Download full logs for a task ID |
| `head_logs` | Return first N lines of logs for a run/task |
| `tail_logs` | Return last N lines of logs for a run/task |
| `grep_logs` | Search logs for a pattern with context lines |
| `validate_workflow` | Validate RWX workflow YAML files using the official RWX parser |

### CLI Commands Used

| Command | Tool | Purpose |
|---------|------|---------|
| `rwx --version` | (init) | Version check |
| `rwx mcp serve` | (proxy) | Start MCP proxy server |
| `rwx run .rwx/ci.yml --output json [--wait] [--target ...]` | `launch_ci_run` | Launch CI runs |
| `rwx results <id> --output json` | `get_run_results` | Get run results |
| `rwx artifacts <id> --output json [--list]` | `get_artifacts` | List/download artifacts |
| `rwx logs <id> --output-dir <dir> --auto-extract --output json` | log tools | Download run logs |

## Architecture

### Initialization Flow

1. **Version check**: Validates `rwx --version` returns >= 3.0.0, logs warning if not
2. **Proxy startup**: Spawns `rwx mcp serve` as subprocess
3. **MCP handshake**: Initializes JSON-RPC 2.0 connection over stdio
4. **Tool discovery**: Fetches tools from proxy and registers them
5. **Native tools**: Registers additional tools (launch, wait, results, logs, artifacts, validation)

### Proxy Pattern

```
Rush MCP Server
    └─▶ RwxPlugin
        ├─▶ McpProxyClient ─▶ [rwx mcp serve subprocess]
        │       └─▶ JSON-RPC 2.0 over stdio
        ├─▶ Native Tools (launch, wait, results, logs, artifacts)
        └─▶ Validation Tools (uses bundled RWX parser)
```

- `ProxyTool` converts JSON Schema to Zod schema for Rush MCP compatibility
- Tool calls are forwarded to `rwx mcp serve` via JSON-RPC

### Tool Implementation Pattern

All native tools implement `IRushMcpTool<T['schema']>`:

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
      // schema definition using session's zod instance
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

## Environment Variables

- `RWX_ACCESS_TOKEN` - Bearer token for RWX Cloud API authentication (required for some tools)

## Constants (src/utils.ts)

```typescript
RWX_ORG = 'curri'           // Organization slug for RWX URLs
MIN_RWX_VERSION = '3.0.0'   // Minimum required rwx CLI version
```

## Key Differences from rwx-mcp-server Package

This plugin is **independent** of the `packages/rwx-mcp-server` package in the monorepo:

| Aspect | rush-mcp-rwx-plugin | packages/rwx-mcp-server |
|--------|---------------------|------------------------|
| Type | Rush MCP plugin | Standalone MCP server |
| Proxy target | `rwx mcp serve` CLI | N/A |
| Native tools | Yes (launch, wait, results, logs, artifacts) | Implements tools directly |
| Version check | Validates rwx >= 3.0.0 | No validation |
| Dependency | None on rwx-mcp-server | Standalone |

## Gotchas

1. **rwx CLI required**: Plugin will fail to initialize if `rwx` is not in PATH or version < 3.0.0

2. **Log tools download files**: `head_logs`, `tail_logs`, `grep_logs`, and `get_task_logs` all download the full logs to a temp directory before processing. This can be slow for large logs.

3. **JSON Schema to Zod conversion**: `ProxyTool.schema` does basic type mapping. Complex JSON Schema features (enums, nested objects) are simplified.

4. **No reconnect**: If the `rwx mcp serve` process dies, pending requests fail and no automatic restart occurs.

5. **Session zod**: All tools must use `this.session.zod` for schema definitions, not a directly imported zod package.

6. **Parser bundle**: The `src/support/parser.js` file is a ~4MB bundled parser from the [rwx-cloud/language-server](https://github.com/rwx-cloud/language-server) repo. It's copied to `lib/support/` during build. Update it by downloading from the GitHub repo.

7. **Validation doesn't require CLI**: The `validate_workflow` tool uses the bundled parser and works without the rwx CLI installed.

8. **--output json**: All CLI commands use `--output json` for machine-readable output (RWX CLI v3.0.0 feature).

## TypeScript Configuration

- **Target**: ES2020
- **Module**: CommonJS
- **Strict mode**: Enabled
- **Output**: `lib/` directory with declarations and source maps
