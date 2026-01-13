#!/usr/bin/env node
/**
 * CLI utility for testing rush-mcp-rwx-plugin tools locally.
 * 
 * Usage:
 *   node cli.js <tool_name> [args_json]
 *   node cli.js --list
 * 
 * Examples:
 *   node cli.js --list
 *   node cli.js get_recent_runs '{"ref":"master","limit":3}'
 *   node cli.js launch_ci_run '{"ref":"my-branch"}'
 *   node cli.js tail_logs '{"id":"abc123","lines":50}'
 */

const { execFileSync } = require('child_process');
const path = require('path');

// Minimal zod-like implementation for schema parsing
const zod = {
  string: () => ({
    describe: () => zod.string(),
    default: (v) => ({ ...zod.string(), _default: v }),
    optional: () => ({ ...zod.string(), _optional: true }),
  }),
  number: () => ({
    describe: () => zod.number(),
    default: (v) => ({ ...zod.number(), _default: v }),
    optional: () => ({ ...zod.number(), _optional: true }),
  }),
  boolean: () => ({
    describe: () => zod.boolean(),
    default: (v) => ({ ...zod.boolean(), _default: v }),
    optional: () => ({ ...zod.boolean(), _optional: true }),
  }),
  array: (inner) => ({
    describe: () => zod.array(inner),
    default: (v) => ({ ...zod.array(inner), _default: v }),
    optional: () => ({ ...zod.array(inner), _optional: true }),
  }),
  object: (shape) => shape,
};

// Mock session for tool instantiation
const mockSession = {
  zod,
  registerTool: () => {},
};

// Import tools directly
const { LaunchCiRunTool } = require('./lib/tools/LaunchCiRunTool');
const { WaitForCiRunTool } = require('./lib/tools/WaitForCiRunTool');
const { GetTaskLogsTool } = require('./lib/tools/GetTaskLogsTool');
const { HeadLogsTool } = require('./lib/tools/HeadLogsTool');
const { TailLogsTool } = require('./lib/tools/TailLogsTool');
const { GrepLogsTool } = require('./lib/tools/GrepLogsTool');
const { GetRecentRunsTool } = require('./lib/tools/GetRecentRunsTool');

// Mock plugin
const mockPlugin = {
  session: mockSession,
};

// Available tools
const tools = {
  launch_ci_run: new LaunchCiRunTool(mockPlugin),
  wait_for_ci_run: new WaitForCiRunTool(mockPlugin),
  get_task_logs: new GetTaskLogsTool(mockPlugin),
  head_logs: new HeadLogsTool(mockPlugin),
  tail_logs: new TailLogsTool(mockPlugin),
  grep_logs: new GrepLogsTool(mockPlugin),
  get_recent_runs: new GetRecentRunsTool(mockPlugin),
};

// Tool descriptions
const toolDescriptions = {
  launch_ci_run: 'Launch a CI run for a git ref',
  wait_for_ci_run: 'Wait for a CI run to complete',
  get_task_logs: 'Get full logs for a task',
  head_logs: 'Get first N lines of logs',
  tail_logs: 'Get last N lines of logs',
  grep_logs: 'Search logs for a pattern',
  get_recent_runs: 'Get recent CI runs for a branch',
};

function printUsage() {
  console.log(`
rush-mcp-rwx-plugin CLI

Usage:
  node cli.js <tool_name> [args_json]
  node cli.js --list

Options:
  --list    List all available tools

Tools:`);
  
  for (const [name, desc] of Object.entries(toolDescriptions)) {
    console.log(`  ${name.padEnd(20)} ${desc}`);
  }
  
  console.log(`
Examples:
  node cli.js --list
  node cli.js get_recent_runs '{"ref":"master","limit":3}'
  node cli.js launch_ci_run '{"ref":"my-branch"}'
  node cli.js tail_logs '{"id":"abc123","lines":50}'
  node cli.js grep_logs '{"id":"abc123","pattern":"error"}'
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }
  
  if (args[0] === '--list') {
    console.log('Available tools:');
    for (const [name, desc] of Object.entries(toolDescriptions)) {
      console.log(`  ${name}: ${desc}`);
    }
    process.exit(0);
  }
  
  const toolName = args[0];
  const argsJson = args[1] || '{}';
  
  if (!tools[toolName]) {
    console.error(`Unknown tool: ${toolName}`);
    console.error(`Available tools: ${Object.keys(tools).join(', ')}`);
    process.exit(1);
  }
  
  let input;
  try {
    input = JSON.parse(argsJson);
  } catch (e) {
    console.error(`Invalid JSON arguments: ${e.message}`);
    process.exit(1);
  }
  
  const tool = tools[toolName];
  
  try {
    console.error(`Executing ${toolName}...`);
    const result = await tool.executeAsync(input);
    
    if (result.isError) {
      console.error('Error:');
    }
    
    for (const content of result.content) {
      if (content.type === 'text') {
        // Try to pretty-print JSON
        try {
          const parsed = JSON.parse(content.text);
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          console.log(content.text);
        }
      }
    }
    
    process.exit(result.isError ? 1 : 0);
  } catch (e) {
    console.error(`Execution failed: ${e.message}`);
    process.exit(1);
  }
}

main();
