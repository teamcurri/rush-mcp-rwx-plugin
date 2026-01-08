import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Client for proxying requests to the standalone rwx mcp server
 */
export class McpProxyClient extends EventEmitter {
  private _process: ChildProcess | null = null;
  private _nextId = 1;
  private _pendingRequests = new Map<
    number | string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  private _buffer = '';
  private _tools: McpTool[] = [];
  private _initialized = false;

  public async startAsync(rushWorkspacePath: string): Promise<void> {
    // Spawn the standalone rwx-mcp-server from packages/rwx-mcp-server
    const serverPath = `${rushWorkspacePath}/packages/rwx-mcp-server/dist/index.js`;

    this._process = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!this._process.stdout || !this._process.stdin) {
      throw new Error('Failed to spawn rwx mcp process');
    }

    // Handle stdout - parse JSON-RPC responses
    this._process.stdout.on('data', (data: Buffer) => {
      this._buffer += data.toString();
      this._processBuffer();
    });

    // Handle stderr - log errors
    this._process.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message && !message.includes('RWX CI/CD MCP Server running')) {
        console.error('[rwx mcp stderr]:', message);
      }
    });

    // Handle process exit
    this._process.on('exit', (code) => {
      console.error(`[rwx mcp] Process exited with code ${code}`);
      this._rejectAllPending(new Error(`RWX MCP process exited with code ${code}`));
    });

    // Initialize the MCP connection
    await this._initializeAsync();

    // Fetch available tools
    await this._fetchToolsAsync();
  }

  private async _initializeAsync(): Promise<void> {
    const response = (await this._sendRequestAsync('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'rush-mcp-rwx-plugin',
        version: '1.0.0',
      },
    })) as { protocolVersion: string; capabilities: Record<string, unknown> };

    if (!response.protocolVersion) {
      throw new Error('Failed to initialize MCP connection');
    }

    this._initialized = true;
  }

  private async _fetchToolsAsync(): Promise<void> {
    const response = (await this._sendRequestAsync('tools/list', {})) as {
      tools: McpTool[];
    };

    this._tools = response.tools || [];
  }

  public get tools(): McpTool[] {
    return this._tools;
  }

  public async callToolAsync(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this._initialized) {
      throw new Error('MCP proxy client not initialized');
    }

    return await this._sendRequestAsync('tools/call', {
      name,
      arguments: args,
    });
  }

  private async _sendRequestAsync(
    method: string,
    params: unknown
  ): Promise<unknown> {
    if (!this._process?.stdin) {
      throw new Error('RWX MCP process not running');
    }

    const id = this._nextId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this._pendingRequests.set(id, { resolve, reject });

      const requestJson = JSON.stringify(request) + '\n';
      this._process!.stdin!.write(requestJson);
    });
  }

  private _processBuffer(): void {
    const lines = this._buffer.split('\n');
    this._buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line) as JsonRpcResponse;
        this._handleResponse(response);
      } catch (error) {
        console.error('[rwx mcp] Failed to parse response:', line);
      }
    }
  }

  private _handleResponse(response: JsonRpcResponse): void {
    const pending = this._pendingRequests.get(response.id);
    if (!pending) {
      console.error('[rwx mcp] Received response for unknown request:', response.id);
      return;
    }

    this._pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(
        new Error(`RWX MCP error: ${response.error.message}`)
      );
    } else {
      pending.resolve(response.result);
    }
  }

  private _rejectAllPending(error: Error): void {
    for (const pending of this._pendingRequests.values()) {
      pending.reject(error);
    }
    this._pendingRequests.clear();
  }

  public async stopAsync(): Promise<void> {
    if (this._process) {
      this._process.kill();
      this._process = null;
    }
    this._initialized = false;
    this._tools = [];
  }
}
