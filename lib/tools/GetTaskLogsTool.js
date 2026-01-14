"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTaskLogsTool = void 0;
const utils_1 = require("../utils");
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
            const logsContent = await (0, utils_1.downloadLogs)(id);
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