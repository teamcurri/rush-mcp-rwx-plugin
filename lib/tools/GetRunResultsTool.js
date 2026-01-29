"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetRunResultsTool = void 0;
const utils_1 = require("../utils");
const elicitation_1 = require("../elicitation");
class GetRunResultsTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            run_id: zod
                .string()
                .describe('RWX run ID or full URL to get results for'),
        });
    }
    async executeAsync(input) {
        // Check prerequisites - CLI needed
        const prereqCheck = (0, elicitation_1.checkRwxPrerequisites)();
        if (prereqCheck) {
            return prereqCheck;
        }
        try {
            const id = (0, utils_1.extractRunId)(input.run_id);
            const result = (0, utils_1.runRwxCommand)(['results', id, '--output', 'json']);
            const parsed = JSON.parse(result);
            const runUrl = `https://cloud.rwx.com/mint/${utils_1.RWX_ORG}/runs/${id}`;
            // Categorize tasks by status
            const failedTasks = parsed.tasks?.filter(t => t.status?.toLowerCase() === 'failed') || [];
            const succeededTasks = parsed.tasks?.filter(t => t.status?.toLowerCase() === 'succeeded') || [];
            const skippedTasks = parsed.tasks?.filter(t => t.status?.toLowerCase() === 'skipped') || [];
            const cachedTasks = parsed.tasks?.filter(t => t.cache_hit) || [];
            const resultStatus = parsed.result?.toLowerCase();
            let status;
            if (resultStatus === 'succeeded') {
                status = 'success';
            }
            else if (resultStatus === 'failed') {
                status = 'failure';
            }
            else {
                status = resultStatus || 'unknown';
            }
            const response = {
                run_id: id,
                url: runUrl,
                status,
                execution: parsed.execution,
                duration_seconds: parsed.duration_seconds,
                summary: {
                    total: parsed.tasks?.length || 0,
                    succeeded: succeededTasks.length,
                    failed: failedTasks.length,
                    skipped: skippedTasks.length,
                    cached: cachedTasks.length,
                },
                failed_tasks: failedTasks.map(t => t.key),
                tasks: parsed.tasks,
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(response, null, 2),
                    },
                ],
                isError: status === 'failure',
            };
        }
        catch (error) {
            return (0, elicitation_1.handleRwxError)(error, 'get run results');
        }
    }
}
exports.GetRunResultsTool = GetRunResultsTool;
//# sourceMappingURL=GetRunResultsTool.js.map