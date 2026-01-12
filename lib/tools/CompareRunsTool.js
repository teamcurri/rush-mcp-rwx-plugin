"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompareRunsTool = void 0;
const utils_1 = require("../utils");
class CompareRunsTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            run_id_1: zod.string().describe('First run ID'),
            run_id_2: zod.string().describe('Second run ID'),
        });
    }
    async executeAsync(input) {
        const id1 = (0, utils_1.extractRunId)(input.run_id_1);
        const id2 = (0, utils_1.extractRunId)(input.run_id_2);
        const query = {
            dataset_slug: utils_1.HONEYCOMB_DATASET,
            environment_slug: utils_1.HONEYCOMB_ENV,
            query_spec: {
                breakdowns: ['cicd.pipeline.run.id', 'cicd.pipeline.task.name'],
                calculations: [{ column: 'duration_ms', op: 'MAX' }],
                filters: [
                    { column: 'cicd.pipeline.run.id', op: 'in', value: [id1, id2] },
                ],
                time_range: 604800,
            },
        };
        const response = {
            analysis_tip: 'Group results by task name to compare duration differences',
            description: `Compare runs ${id1} vs ${id2}`,
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
exports.CompareRunsTool = CompareRunsTool;
//# sourceMappingURL=CompareRunsTool.js.map