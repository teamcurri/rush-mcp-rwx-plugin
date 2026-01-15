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
        });
    }
    async executeAsync(input) {
        // Check prerequisites - both CLI and token needed
        const prereqCheck = (0, elicitation_1.checkRwxPrerequisites)();
        if (prereqCheck) {
            return prereqCheck;
        }
        try {
            const args = ['run', '.rwx/ci.yml', '--json'];
            if (input.targets && input.targets.length > 0) {
                input.targets.forEach((t) => args.push('--target', t));
            }
            const result = (0, utils_1.runRwxCommand)(args);
            const parsed = JSON.parse(result);
            const response = {
                next_step: 'Use wait_for_ci_run to wait for completion, or get_run_test_failures to check results',
                run_id: parsed.RunId || parsed.run_id,
                status: 'launched',
                url: parsed.RunURL || parsed.url,
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
            return (0, elicitation_1.handleRwxError)(error, 'launch CI run');
        }
    }
}
exports.LaunchCiRunTool = LaunchCiRunTool;
//# sourceMappingURL=LaunchCiRunTool.js.map