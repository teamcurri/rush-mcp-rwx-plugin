"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpProxyClient = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
/**
 * Client for proxying requests to the standalone rwx mcp server
 */
class McpProxyClient extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this._process = null;
        this._nextId = 1;
        this._pendingRequests = new Map();
        this._buffer = '';
        this._tools = [];
        this._initialized = false;
    }
    async startAsync(rushWorkspacePath) {
        // Spawn the standalone rwx-mcp-server from packages/rwx-mcp-server
        const serverPath = `${rushWorkspacePath}/packages/rwx-mcp-server/dist/index.js`;
        this._process = (0, child_process_1.spawn)('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        if (!this._process.stdout || !this._process.stdin) {
            throw new Error('Failed to spawn rwx mcp process');
        }
        // Handle stdout - parse JSON-RPC responses
        this._process.stdout.on('data', (data) => {
            this._buffer += data.toString();
            this._processBuffer();
        });
        // Handle stderr - log errors
        this._process.stderr?.on('data', (data) => {
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
    async _initializeAsync() {
        const response = (await this._sendRequestAsync('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
                name: 'rush-mcp-rwx-plugin',
                version: '1.0.0',
            },
        }));
        if (!response.protocolVersion) {
            throw new Error('Failed to initialize MCP connection');
        }
        this._initialized = true;
    }
    async _fetchToolsAsync() {
        const response = (await this._sendRequestAsync('tools/list', {}));
        this._tools = response.tools || [];
    }
    get tools() {
        return this._tools;
    }
    async callToolAsync(name, args) {
        if (!this._initialized) {
            throw new Error('MCP proxy client not initialized');
        }
        return await this._sendRequestAsync('tools/call', {
            name,
            arguments: args,
        });
    }
    async _sendRequestAsync(method, params) {
        if (!this._process?.stdin) {
            throw new Error('RWX MCP process not running');
        }
        const id = this._nextId++;
        const request = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };
        return new Promise((resolve, reject) => {
            this._pendingRequests.set(id, { resolve, reject });
            const requestJson = JSON.stringify(request) + '\n';
            this._process.stdin.write(requestJson);
        });
    }
    _processBuffer() {
        const lines = this._buffer.split('\n');
        this._buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.trim())
                continue;
            try {
                const response = JSON.parse(line);
                this._handleResponse(response);
            }
            catch (error) {
                console.error('[rwx mcp] Failed to parse response:', line);
            }
        }
    }
    _handleResponse(response) {
        const pending = this._pendingRequests.get(response.id);
        if (!pending) {
            console.error('[rwx mcp] Received response for unknown request:', response.id);
            return;
        }
        this._pendingRequests.delete(response.id);
        if (response.error) {
            pending.reject(new Error(`RWX MCP error: ${response.error.message}`));
        }
        else {
            pending.resolve(response.result);
        }
    }
    _rejectAllPending(error) {
        for (const pending of this._pendingRequests.values()) {
            pending.reject(error);
        }
        this._pendingRequests.clear();
    }
    async stopAsync() {
        if (this._process) {
            this._process.kill();
            this._process = null;
        }
        this._initialized = false;
        this._tools = [];
    }
}
exports.McpProxyClient = McpProxyClient;
//# sourceMappingURL=McpProxyClient.js.map