"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrepLogsTool = void 0;
const utils_1 = require("../utils");
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
/**
 * Download logs for a run or task and return the content
 */
function downloadLogs(id) {
    const outputDir = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), `rwx-logs-${id}-`));
    try {
        (0, utils_1.runRwxCommand)(['logs', id, '--output-dir', outputDir, '--auto-extract']);
        // Try to find the log file
        const possiblePaths = [
            (0, path_1.join)(outputDir, `${id}.log`),
            (0, path_1.join)(outputDir, 'output.log'),
            (0, path_1.join)(outputDir, 'logs.txt'),
        ];
        let logsContent = '';
        for (const logPath of possiblePaths) {
            try {
                logsContent = (0, fs_1.readFileSync)(logPath, 'utf-8');
                break;
            }
            catch {
                continue;
            }
        }
        if (!logsContent) {
            const files = (0, fs_1.readdirSync)(outputDir);
            const logFile = files.find((f) => f.endsWith('.log') || f.endsWith('.txt'));
            if (logFile) {
                logsContent = (0, fs_1.readFileSync)((0, path_1.join)(outputDir, logFile), 'utf-8');
            }
        }
        if (!logsContent) {
            throw new Error('No log files found in downloaded output');
        }
        return logsContent;
    }
    finally {
        try {
            (0, fs_1.rmSync)(outputDir, { force: true, recursive: true });
        }
        catch (cleanupError) {
            console.error('Failed to cleanup temp directory:', cleanupError);
        }
    }
}
class GrepLogsTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            id: zod
                .string()
                .describe('RWX run ID or task ID'),
            pattern: zod
                .string()
                .describe('Pattern to search for in the logs (case-insensitive)'),
            context: zod
                .number()
                .default(3)
                .describe('Number of context lines before and after matches (default: 3)'),
        });
    }
    async executeAsync(input) {
        try {
            const id = (0, utils_1.extractRunId)(input.id);
            const pattern = input.pattern;
            const context = input.context;
            const logs = downloadLogs(id);
            const allLines = logs.split('\n');
            // Find matching lines with context
            const regex = new RegExp(pattern, 'i');
            const matchingIndices = [];
            for (let i = 0; i < allLines.length; i++) {
                if (regex.test(allLines[i])) {
                    matchingIndices.push(i);
                }
            }
            // Build output with context
            const outputLines = [];
            const includedIndices = new Set();
            for (const matchIdx of matchingIndices) {
                const startIdx = Math.max(0, matchIdx - context);
                const endIdx = Math.min(allLines.length - 1, matchIdx + context);
                for (let i = startIdx; i <= endIdx; i++) {
                    if (!includedIndices.has(i)) {
                        includedIndices.add(i);
                        const prefix = i === matchIdx ? '>>> ' : '    ';
                        outputLines.push(`${prefix}${i + 1}: ${allLines[i]}`);
                    }
                }
                // Add separator between match groups
                if (matchIdx !== matchingIndices[matchingIndices.length - 1]) {
                    outputLines.push('---');
                }
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            id,
                            pattern,
                            context,
                            matches_found: matchingIndices.length,
                            total_lines: allLines.length,
                            logs: outputLines.join('\n').substring(0, 100000),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to grep logs: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    }
}
exports.GrepLogsTool = GrepLogsTool;
//# sourceMappingURL=GrepLogsTool.js.map