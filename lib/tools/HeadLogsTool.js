"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeadLogsTool = void 0;
const utils_1 = require("../utils");
const elicitation_1 = require("../elicitation");
const MAX_LINES_PER_PAGE = 50;
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
                .coerce.number()
                .default(MAX_LINES_PER_PAGE)
                .describe(`Number of lines to return from the beginning (default: ${MAX_LINES_PER_PAGE}, max: ${MAX_LINES_PER_PAGE})`),
            offset: zod
                .coerce.number()
                .default(0)
                .describe('Line offset to start from (default: 0). Use for pagination.'),
        });
    }
    async executeAsync(input) {
        // Check prerequisites - both CLI and token needed (downloadLogs uses CLI)
        const prereqCheck = (0, elicitation_1.checkRwxPrerequisites)();
        if (prereqCheck) {
            return prereqCheck;
        }
        try {
            const id = (0, utils_1.extractRunId)(input.id);
            const numLines = Math.min(input.lines ?? MAX_LINES_PER_PAGE, MAX_LINES_PER_PAGE);
            const offset = input.offset ?? 0;
            const logs = await (0, utils_1.downloadLogs)(id);
            const allLines = logs.split('\n');
            const headLines = allLines.slice(offset, offset + numLines);
            const linesReturned = headLines.length;
            const hasMore = offset + linesReturned < allLines.length;
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
                            logs: headLines.join('\n'),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return (0, elicitation_1.handleRwxError)(error, 'get head logs');
        }
    }
}
exports.HeadLogsTool = HeadLogsTool;
//# sourceMappingURL=HeadLogsTool.js.map