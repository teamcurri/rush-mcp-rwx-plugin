"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetRwxAccessTokenTool = void 0;
class SetRwxAccessTokenTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            token: zod
                .string()
                .describe('The RWX access token to configure'),
        });
    }
    async executeAsync(input) {
        try {
            if (!input.token || input.token.trim() === '') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Error: Token cannot be empty.',
                        },
                    ],
                    isError: true,
                };
            }
            // Set the token in the current process environment
            process.env.RWX_ACCESS_TOKEN = input.token.trim();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            message: 'RWX access token configured successfully for this session.',
                            hint: 'You can now proceed with your previous request.',
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
                        text: `Failed to set RWX access token: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    }
}
exports.SetRwxAccessTokenTool = SetRwxAccessTokenTool;
//# sourceMappingURL=SetRwxAccessTokenTool.js.map