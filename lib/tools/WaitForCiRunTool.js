"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitForCiRunTool = void 0;
const utils_1 = require("../utils");
const elicitation_1 = require("../elicitation");
class WaitForCiRunTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            run_id: zod.string().describe('RWX run ID or full URL to wait for'),
            timeout_seconds: zod
                .coerce.number()
                .default(1800)
                .describe('Maximum time to wait in seconds (default: 1800 = 30 min)'),
            poll_interval_seconds: zod
                .coerce.number()
                .default(30)
                .describe('Seconds between status checks (default: 30)'),
        });
    }
    async executeAsync(input) {
        // Check prerequisites - token only (this tool uses API, not CLI)
        const tokenCheck = (0, elicitation_1.checkRwxToken)();
        if (tokenCheck) {
            return tokenCheck;
        }
        const id = (0, utils_1.extractRunId)(input.run_id);
        const runUrl = `https://cloud.rwx.com/mint/${utils_1.RWX_ORG}/runs/${id}`;
        const startTime = Date.now();
        const maxTime = input.timeout_seconds * 1000;
        let pollCount = 0;
        try {
            while (Date.now() - startTime < maxTime) {
                pollCount++;
                const status = await (0, utils_1.fetchRunStatus)(id);
                if (status.isComplete) {
                    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
                    const response = {
                        completed: true,
                        elapsed_seconds: elapsedSeconds,
                        polls: pollCount,
                        run_id: id,
                        run_url: runUrl,
                        status: status.status,
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
                await new Promise((resolve) => setTimeout(resolve, input.poll_interval_seconds * 1000));
            }
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const response = {
                completed: false,
                elapsed_seconds: elapsedSeconds,
                message: `Run did not complete within ${input.timeout_seconds} seconds`,
                polls: pollCount,
                run_id: id,
                run_url: runUrl,
                timeout: true,
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
            return (0, elicitation_1.handleRwxError)(error, 'wait for run');
        }
    }
}
exports.WaitForCiRunTool = WaitForCiRunTool;
//# sourceMappingURL=WaitForCiRunTool.js.map