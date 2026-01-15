import type { IRushMcpTool, RushMcpPluginSession, CallToolResult, zodModule } from '../types/rush-mcp-plugin';
import type { RwxPlugin } from '../index';
import { checkRwxCliVersion, MIN_RWX_VERSION } from '../utils';
import { createRwxCliInstallElicitation } from '../elicitation';
import { execFileSync } from 'child_process';

export class VerifyRwxCliTool implements IRushMcpTool<VerifyRwxCliTool['schema']> {
  public readonly plugin: RwxPlugin;
  public readonly session: RushMcpPluginSession;

  public constructor(plugin: RwxPlugin) {
    this.plugin = plugin;
    this.session = plugin.session;
  }

  public get schema() {
    const zod: typeof zodModule = this.session.zod;
    return zod.object({
      confirmed: zod
        .string()
        .optional()
        .describe('Confirmation that the CLI has been installed (value: "installed")'),
    });
  }

  public async executeAsync(_input: zodModule.infer<VerifyRwxCliTool['schema']>): Promise<CallToolResult> {
    try {
      // Try to check the CLI version
      const versionCheck = getRwxVersion();
      
      if (!versionCheck.installed) {
        return createRwxCliInstallElicitation(null, MIN_RWX_VERSION);
      }

      if (!versionCheck.meetsMinimum) {
        return createRwxCliInstallElicitation(versionCheck.version, MIN_RWX_VERSION);
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
    } catch (error) {
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

interface RwxVersionCheck {
  installed: boolean;
  version: string | null;
  meetsMinimum: boolean;
}

function getRwxVersion(): RwxVersionCheck {
  try {
    const versionOutput = execFileSync('rwx', ['--version'], {
      encoding: 'utf-8',
    }).trim();

    const versionMatch = versionOutput.match(/v?(\d+\.\d+\.\d+)/);
    if (!versionMatch) {
      return { installed: true, version: null, meetsMinimum: false };
    }

    const version = versionMatch[1];
    const meetsMinimum = isVersionGte(version, MIN_RWX_VERSION);
    
    return { installed: true, version, meetsMinimum };
  } catch {
    return { installed: false, version: null, meetsMinimum: false };
  }
}

function isVersionGte(a: string, b: string): boolean {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;

    if (partA > partB) return true;
    if (partA < partB) return false;
  }

  return true;
}
