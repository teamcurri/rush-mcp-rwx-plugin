"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyRwxCliTool = void 0;
const utils_1 = require("../utils");
const elicitation_1 = require("../elicitation");
const child_process_1 = require("child_process");
class VerifyRwxCliTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            confirmed: zod
                .string()
                .optional()
                .describe('Confirmation that the CLI has been installed (value: "installed")'),
        });
    }
    async executeAsync(_input) {
        try {
            // Try to check the CLI version
            const versionCheck = getRwxVersion();
            if (!versionCheck.installed) {
                return (0, elicitation_1.createRwxCliInstallElicitation)(null, utils_1.MIN_RWX_VERSION);
            }
            if (!versionCheck.meetsMinimum) {
                return (0, elicitation_1.createRwxCliInstallElicitation)(versionCheck.version, utils_1.MIN_RWX_VERSION);
            }
            // CLI is installed and meets minimum version
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            message: `rwx CLI version ${versionCheck.version} is installed and ready.`,
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
                        text: `Failed to verify rwx CLI: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    }
}
exports.VerifyRwxCliTool = VerifyRwxCliTool;
function getRwxVersion() {
    try {
        const versionOutput = (0, child_process_1.execFileSync)('rwx', ['--version'], {
            encoding: 'utf-8',
        }).trim();
        const versionMatch = versionOutput.match(/v?(\d+\.\d+\.\d+)/);
        if (!versionMatch) {
            return { installed: true, version: null, meetsMinimum: false };
        }
        const version = versionMatch[1];
        const meetsMinimum = isVersionGte(version, utils_1.MIN_RWX_VERSION);
        return { installed: true, version, meetsMinimum };
    }
    catch {
        return { installed: false, version: null, meetsMinimum: false };
    }
}
function isVersionGte(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const partA = partsA[i] || 0;
        const partB = partsB[i] || 0;
        if (partA > partB)
            return true;
        if (partA < partB)
            return false;
    }
    return true;
}
//# sourceMappingURL=VerifyRwxCliTool.js.map