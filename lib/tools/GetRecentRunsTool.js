"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetRecentRunsTool = void 0;
const utils_1 = require("../utils");
class GetRecentRunsTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            branch: zod.string().describe('Git branch name'),
            limit: zod.number().default(5).describe('Number of runs to return'),
        });
    }
    async executeAsync(input) {
        const query = {
            dataset_slug: utils_1.HONEYCOMB_DATASET,
            environment_slug: utils_1.HONEYCOMB_ENV,
            query_spec: {
                breakdowns: [
                    'cicd.pipeline.run.id',
                    'cicd.pipeline.run.url.full',
                    'cicd.pipeline.run.git.sha',
                ],
                calculations: [{ op: 'COUNT' }],
                filters: [
                    { column: 'cicd.pipeline.run.git.branch', op: '=', value: input.branch },
                ],
                limit: input.limit,
                time_range: 604800,
            },
        };
        const response = {
            description: `Query for recent runs on branch: ${input.branch}`,
            params: query,
            tool: 'mcp__honeycomb__run_query',
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
exports.GetRecentRunsTool = GetRecentRunsTool;
//# sourceMappingURL=GetRecentRunsTool.js.map