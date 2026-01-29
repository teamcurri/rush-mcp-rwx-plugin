import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { runRwxCommand, extractRunId, RWX_ORG } from '../utils';
import { checkRwxPrerequisites, handleRwxError } from '../elicitation';

interface ArtifactInfo {
  key: string;
  task_key: string;
  size_bytes?: number;
  path?: string;
}

interface RwxArtifactsOutput {
  run_id: string;
  artifacts: ArtifactInfo[];
}

export class GetArtifactsTool implements IRushMcpTool<GetArtifactsTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
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

  public async executeAsync(input: zodModule.infer<GetArtifactsTool['schema']>): Promise<CallToolResult> {
    // Check prerequisites - CLI needed
    const prereqCheck = checkRwxPrerequisites();
    if (prereqCheck) {
      return prereqCheck;
    }

    try {
      const id = extractRunId(input.run_id);
      const runUrl = `https://cloud.rwx.com/mint/${RWX_ORG}/runs/${id}`;

      if (input.download) {
        // Download artifacts
        const args = ['artifacts', id, '--output', 'json'];
        if (input.artifact_key) {
          args.push('--key', input.artifact_key);
        }
        
        const result = runRwxCommand(args);
        const parsed = JSON.parse(result) as RwxArtifactsOutput;

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
      } else {
        // List artifacts only
        const result = runRwxCommand(['artifacts', id, '--output', 'json', '--list']);
        const parsed = JSON.parse(result) as RwxArtifactsOutput;

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
    } catch (error) {
      return handleRwxError(error, 'get artifacts');
    }
  }
}
