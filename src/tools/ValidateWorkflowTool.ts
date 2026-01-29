import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import * as fs from 'fs';
import * as path from 'path';

// Import the RWX YAML parser from the support directory
import { YamlParser, type UserMessage, type PartialTaskDefinition } from '../support/parser';

export interface ValidationDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  advice?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationDiagnostic[];
  warnings: ValidationDiagnostic[];
  taskCount?: number;
  taskKeys?: string[];
}

/**
 * Converts a UserMessage from the parser to a ValidationDiagnostic
 */
function toValidationDiagnostic(msg: UserMessage): ValidationDiagnostic {
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

export class ValidateWorkflowTool implements IRushMcpTool<ValidateWorkflowTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      file_path: zod
        .string()
        .optional()
        .describe(
          'Path to the RWX workflow YAML file to validate. If not provided, content must be specified.'
        ),
      content: zod
        .string()
        .optional()
        .describe(
          'YAML content to validate directly. If not provided, file_path must be specified.'
        ),
    });
  }

  public async executeAsync(
    input: zodModule.infer<ValidateWorkflowTool['schema']>
  ): Promise<CallToolResult> {
    try {
      let yamlContent: string;
      let fileName: string;

      if (input.content) {
        yamlContent = input.content;
        fileName = 'inline.yml';
      } else if (input.file_path) {
        // Resolve the file path
        const resolvedPath = path.isAbsolute(input.file_path)
          ? input.file_path
          : path.resolve(process.cwd(), input.file_path);

        if (!fs.existsSync(resolvedPath)) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    isValid: false,
                    errors: [
                      {
                        severity: 'error',
                        message: `File not found: ${resolvedPath}`,
                      },
                    ],
                    warnings: [],
                  } satisfies ValidationResult,
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        yamlContent = fs.readFileSync(resolvedPath, 'utf-8');
        fileName = resolvedPath;
      } else {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  isValid: false,
                  errors: [
                    {
                      severity: 'error',
                      message: 'Either file_path or content must be provided',
                    },
                  ],
                  warnings: [],
                } satisfies ValidationResult,
                null,
                2
              ),
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                isValid: false,
                errors: [
                  {
                    severity: 'error',
                    message: `Validation failed: ${errorMessage}`,
                  },
                ],
                warnings: [],
              } satisfies ValidationResult,
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  private async validateWorkflow(fileName: string, yamlContent: string): Promise<ValidationResult> {
    const errors: ValidationDiagnostic[] = [];
    const warnings: ValidationDiagnostic[] = [];

    try {
      // Parse the workflow using the RWX parser
      const snippets = new Map();
      const parseResult = await YamlParser.safelyParseRun(fileName, yamlContent, snippets);

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
        ?.map((task: PartialTaskDefinition) => task.key)
        .filter((key: string) => key && key !== '#fake') ?? [];

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        taskCount: taskKeys.length,
        taskKeys,
      };
    } catch (parseError) {
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
