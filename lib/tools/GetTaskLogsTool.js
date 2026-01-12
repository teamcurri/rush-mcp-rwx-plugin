"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTaskLogsTool = void 0;
const utils_1 = require("../utils");
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
class GetTaskLogsTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            task_id: zod
                .string()
                .describe('RWX task ID (32-char hex) - get from Honeycomb cicd.pipeline.task.run.url.full'),
        });
    }
    async executeAsync(input) {
        try {
            const id = (0, utils_1.extractRunId)(input.task_id);
            const timestamp = Date.now();
            const outputDir = (0, path_1.join)((0, os_1.tmpdir)(), `rwx-logs-${id}-${timestamp}`);
            try {
                (0, utils_1.runRwxCommand)(['logs', id, '--output-dir', outputDir, '--auto-extract']);
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
                const lines = logsContent.split('\n');
                const failureHighlights = lines
                    .filter((line) => line.toLowerCase().includes('error') ||
                    line.toLowerCase().includes('fail') ||
                    line.toLowerCase().includes('✕') ||
                    line.includes('FAIL'))
                    .slice(0, 20);
                const exitCode = failureHighlights.length > 0 ? '1' : '0';
                const response = {
                    exit_code: exitCode,
                    failure_highlights: failureHighlights,
                    logs: logsContent.substring(0, 100000),
                    task_id: id,
                };
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(response, null, 2),
                        },
                    ],
                };
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
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get task logs: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    }
}
exports.GetTaskLogsTool = GetTaskLogsTool;
//# sourceMappingURL=GetTaskLogsTool.js.map