"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchCiRunTool = void 0;
const utils_1 = require("../utils");
const elicitation_1 = require("../elicitation");
class LaunchCiRunTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            targets: zod
                .array(zod.string())
                .optional()
                .describe('Specific tasks to target (optional)'),
            wait: zod
                .boolean()
                .default(false)
                .describe('Wait for the run to complete before returning (default: false)'),
        });
    }
    async executeAsync(input) {
        // Check prerequisites - both CLI and token needed
        const prereqCheck = (0, elicitation_1.checkRwxPrerequisites)();
        if (prereqCheck) {
            return prereqCheck;
        }
        try {
            const args = ['run', '.rwx/ci.yml', '--output', 'json'];
            if (input.wait) {
                args.push('--wait');
            }
            if (input.targets && input.targets.length > 0) {
                input.targets.forEach((t) => args.push('--target', t));
            }
            const result = (0, utils_1.runRwxCommand)(args);
            const parsed = JSON.parse(result);
            const runId = parsed.run_id;
            const runUrl = parsed.run_url || `https://cloud.rwx.com/mint/${utils_1.RWX_ORG}/runs/${runId}`;
            if (input.wait) {
                // Run completed - include result status
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
                    completed: true,
                    next_step: status === 'failure'
                        ? 'Use get_run_results to see task failures, or grep_logs to search for errors'
                        : 'Run completed successfully',
                    run_id: runId,
                    status,
                    url: runUrl,
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
            else {
                // Run launched but not waited for
                const response = {
                    completed: false,
                    next_step: 'Use wait_for_ci_run to wait for completion, or launch with wait=true',
                    run_id: runId,
                    status: 'launched',
                    url: runUrl,
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
        }
        catch (error) {
            return (0, elicitation_1.handleRwxError)(error, 'launch CI run');
        }
    }
}
exports.LaunchCiRunTool = LaunchCiRunTool;
//# sourceMappingURL=LaunchCiRunTool.js.map