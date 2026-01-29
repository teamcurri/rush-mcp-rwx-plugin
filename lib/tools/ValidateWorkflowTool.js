"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateWorkflowTool = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Import the RWX YAML parser from the support directory
const parser_1 = require("../support/parser");
/**
 * Converts a UserMessage from the parser to a ValidationDiagnostic
 */
function toValidationDiagnostic(msg) {
    const stackEntry = msg.stackTrace?.[0];
    return {
        severity: msg.type === 'warning' ? 'warning' : 'error',
        message: msg.message,
        advice: msg.advice,
        line: stackEntry?.line ?? msg.line,
        column: stackEntry?.column ?? msg.column,
        endLine: stackEntry?.endLine,
        endColumn: stackEntry?.endColumn,
    };
}
class ValidateWorkflowTool {
    constructor(plugin) {
        this.plugin = plugin;
        this.session = plugin.session;
    }
    get schema() {
        const zod = this.session.zod;
        return zod.object({
            file_path: zod
                .string()
                .optional()
                .describe('Path to the RWX workflow YAML file to validate. If not provided, content must be specified.'),
            content: zod
                .string()
                .optional()
                .describe('YAML content to validate directly. If not provided, file_path must be specified.'),
        });
    }
    async executeAsync(input) {
        try {
            let yamlContent;
            let fileName;
            if (input.content) {
                yamlContent = input.content;
                fileName = 'inline.yml';
            }
            else if (input.file_path) {
                // Resolve the file path
                const resolvedPath = path.isAbsolute(input.file_path)
                    ? input.file_path
                    : path.resolve(process.cwd(), input.file_path);
                if (!fs.existsSync(resolvedPath)) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    isValid: false,
                                    errors: [
                                        {
                                            severity: 'error',
                                            message: `File not found: ${resolvedPath}`,
                                        },
                                    ],
                                    warnings: [],
                                }, null, 2),
                            },
                        ],
                        isError: true,
                    };
                }
                yamlContent = fs.readFileSync(resolvedPath, 'utf-8');
                fileName = resolvedPath;
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                isValid: false,
                                errors: [
                                    {
                                        severity: 'error',
                                        message: 'Either file_path or content must be provided',
                                    },
                                ],
                                warnings: [],
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
            // Validate using the RWX YAML parser
            const result = await this.validateWorkflow(fileName, yamlContent);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
                isError: !result.isValid,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            isValid: false,
                            errors: [
                                {
                                    severity: 'error',
                                    message: `Validation failed: ${errorMessage}`,
                                },
                            ],
                            warnings: [],
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
    async validateWorkflow(fileName, yamlContent) {
        const errors = [];
        const warnings = [];
        try {
            // Parse the workflow using the RWX parser
            const snippets = new Map();
            const parseResult = await parser_1.YamlParser.safelyParseRun(fileName, yamlContent, snippets);
            // Convert parser errors to diagnostics
            for (const error of parseResult.errors) {
                errors.push(toValidationDiagnostic(error));
            }
            // Extract warnings from the partial run definition
            if (parseResult.partialRunDefinition?.warningMessages) {
                for (const warning of parseResult.partialRunDefinition.warningMessages) {
                    warnings.push(toValidationDiagnostic(warning));
                }
            }
            // Extract warnings from individual tasks
            if (parseResult.partialRunDefinition?.tasks) {
                for (const task of parseResult.partialRunDefinition.tasks) {
                    if (task.warningMessages) {
                        for (const warning of task.warningMessages) {
                            warnings.push(toValidationDiagnostic(warning));
                        }
                    }
                }
            }
            // Extract task information for the response
            const taskKeys = parseResult.partialRunDefinition?.tasks
                ?.map((task) => task.key)
                .filter((key) => key && key !== '#fake') ?? [];
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                taskCount: taskKeys.length,
                taskKeys,
            };
        }
        catch (parseError) {
            // If there's a catastrophic parsing error, return it
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            errors.push({
                severity: 'error',
                message: `Parser error: ${errorMessage}`,
                line: 1,
                column: 1,
            });
            return {
                isValid: false,
                errors,
                warnings,
            };
        }
    }
}
exports.ValidateWorkflowTool = ValidateWorkflowTool;
//# sourceMappingURL=ValidateWorkflowTool.js.map