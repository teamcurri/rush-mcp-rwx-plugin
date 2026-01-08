# rush-mcp-rwx-plugin

Rush MCP plugin for RWX CI/CD integration.

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

This plugin provides MCP tools for interacting with RWX CI/CD system:

- **GetRecentRuns**: Get recent CI runs
- **LaunchCiRun**: Launch a new CI run
- **WaitForCiRun**: Wait for a CI run to complete
- **GetTaskLogs**: Get logs for specific tasks
- **AnalyzeCiRun**: Analyze a CI run's results
- **CompareRuns**: Compare two CI runs

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Clean build output
npm run clean
```

## License

MIT
