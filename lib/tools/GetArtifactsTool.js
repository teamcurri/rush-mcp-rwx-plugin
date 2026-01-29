"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetArtifactsTool = void 0;
const utils_1 = require("../utils");
const elicitation_1 = require("../elicitation");
class GetArtifactsTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            run_id: zod
                .string()
                .describe('RWX run ID or full URL to get artifacts for'),
            download: zod
                .boolean()
                .default(false)
                .describe('Download artifacts to current directory (default: false, just list)'),
            artifact_key: zod
                .string()
                .optional()
                .describe('Specific artifact key to download (optional, downloads all if not specified)'),
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
            const runUrl = `https://cloud.rwx.com/mint/${utils_1.RWX_ORG}/runs/${id}`;
            if (input.download) {
                // Download artifacts
                const args = ['artifacts', id, '--output', 'json'];
                if (input.artifact_key) {
                    args.push('--key', input.artifact_key);
                }
                const result = (0, utils_1.runRwxCommand)(args);
                const parsed = JSON.parse(result);
                const response = {
                    run_id: id,
                    url: runUrl,
                    action: 'downloaded',
                    artifacts: parsed.artifacts,
                    count: parsed.artifacts?.length || 0,
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
            else {
                // List artifacts only
                const result = (0, utils_1.runRwxCommand)(['artifacts', id, '--output', 'json', '--list']);
                const parsed = JSON.parse(result);
                const response = {
                    run_id: id,
                    url: runUrl,
                    action: 'listed',
                    artifacts: parsed.artifacts,
                    count: parsed.artifacts?.length || 0,
                    hint: 'Set download=true to download artifacts',
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
            return (0, elicitation_1.handleRwxError)(error, 'get artifacts');
        }
    }
}
exports.GetArtifactsTool = GetArtifactsTool;
//# sourceMappingURL=GetArtifactsTool.js.map