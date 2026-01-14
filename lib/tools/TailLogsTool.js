"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TailLogsTool = void 0;
const utils_1 = require("../utils");
class TailLogsTool {
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
                .describe('Number of lines to return from the end (default: 100)'),
        });
    }
    async executeAsync(input) {
        try {
            const id = (0, utils_1.extractRunId)(input.id);
            const numLines = input.lines;
            const logs = await (0, utils_1.downloadLogs)(id);
            const allLines = logs.split('\n');
            const tailLines = allLines.slice(-numLines).join('\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            id,
                            lines_requested: numLines,
                            lines_returned: Math.min(numLines, allLines.length),
                            total_lines: allLines.length,
                            logs: tailLines.substring(0, 100000),
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
                        text: `Failed to get tail logs: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    }
}
exports.TailLogsTool = TailLogsTool;
//# sourceMappingURL=TailLogsTool.js.map