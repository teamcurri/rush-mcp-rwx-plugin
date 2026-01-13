"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeadLogsTool = void 0;
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
class HeadLogsTool {
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
            lines: zod
                .number()
                .default(100)
                .describe('Number of lines to return from the beginning (default: 100)'),
        });
    }
    async executeAsync(input) {
        try {
            const id = (0, utils_1.extractRunId)(input.id);
            const numLines = input.lines;
            const logs = downloadLogs(id);
            const allLines = logs.split('\n');
            const headLines = allLines.slice(0, numLines).join('\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            id,
                            lines_requested: numLines,
                            lines_returned: Math.min(numLines, allLines.length),
                            total_lines: allLines.length,
                            logs: headLines.substring(0, 100000),
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
                        text: `Failed to get head logs: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    }
}
exports.HeadLogsTool = HeadLogsTool;
//# sourceMappingURL=HeadLogsTool.js.map