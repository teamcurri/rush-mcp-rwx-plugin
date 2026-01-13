# rush-mcp-rwx-plugin

Rush MCP plugin for RWX CI/CD integration.

## Prerequisites

- **rwx CLI** version >= 2.3.2 installed and in PATH
- `RWX_ACCESS_TOKEN` environment variable set

The plugin will throw an error on startup if the rwx CLI is not installed or the version is too low.

## Installation

Install this plugin in your Rush monorepo's autoinstaller:

```bash
cd common/autoinstallers/rush-mcp
pnpm add rush-mcp-rwx-plugin
```

## Configuration

Add to your `common/config/rush-mcp/rush-mcp.json`:

```json
{
  "mcpPlugins": [
    {
      "packageName": "rush-mcp-rwx-plugin",
      "autoinstaller": "rush-mcp"
    }
  ]
}
```

## Features

This plugin:

1. **Proxies all tools** from `rwx mcp serve` CLI command
2. **Provides enhanced tools** for CI/CD operations

### Proxied Tools

All tools exposed by `rwx mcp serve` are automatically discovered and made available.

### Native Tools

| Tool | Description |
|------|-------------|
| `launch_ci_run` | Launch a CI workflow for a branch/commit (uses `rwx run`) |
| `wait_for_ci_run` | Poll the RWX API until a run completes or times out |
| `get_task_logs` | Download and return full logs for a task ID |
| `head_logs` | Return first N lines of logs for a run/task |
| `tail_logs` | Return last N lines of logs for a run/task |
| `grep_logs` | Search logs for a pattern with context lines |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Clean build output
npm run clean
```

See [AGENTS.md](./AGENTS.md) for detailed architecture and code patterns.

## License

MIT
