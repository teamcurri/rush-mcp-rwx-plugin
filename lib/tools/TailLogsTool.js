"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TailLogsTool = void 0;
const utils_1 = require("../utils");
const MAX_LINES_PER_PAGE = 50;
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
                .default(MAX_LINES_PER_PAGE)
                .describe(`Number of lines to return from the end (default: ${MAX_LINES_PER_PAGE}, max: ${MAX_LINES_PER_PAGE})`),
            offset: zod
                .number()
                .default(0)
                .describe('Line offset from the end (default: 0). Use for pagination to see earlier lines.'),
        });
    }
    async executeAsync(input) {
        try {
            const id = (0, utils_1.extractRunId)(input.id);
            const numLines = Math.min(input.lines ?? MAX_LINES_PER_PAGE, MAX_LINES_PER_PAGE);
            const offset = input.offset ?? 0;
            const logs = await (0, utils_1.downloadLogs)(id);
            const allLines = logs.split('\n');
            // Calculate the range from the end, accounting for offset
            // offset=0 means the last `numLines` lines
            // offset=50 means the 50 lines before the last 50
            const endIndex = allLines.length - offset;
            const startIndex = Math.max(0, endIndex - numLines);
            const tailLines = allLines.slice(startIndex, endIndex);
            const linesReturned = tailLines.length;
            const hasMore = startIndex > 0;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            id,
                            offset,
                            lines_requested: numLines,
                            lines_returned: linesReturned,
                            total_lines: allLines.length,
                            has_more: hasMore,
                            next_offset: hasMore ? offset + linesReturned : null,
                            start_line: startIndex + 1,
                            end_line: endIndex,
                            logs: tailLines.join('\n'),
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