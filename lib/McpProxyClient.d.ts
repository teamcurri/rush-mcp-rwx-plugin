import { EventEmitter } from 'events';
interface McpTool {
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
}
/**
 * Client for proxying requests to the standalone rwx mcp server
 */
export declare class McpProxyClient extends EventEmitter {
    private _process;
    private _nextId;
    private _pendingRequests;
    private _buffer;
    private _tools;
    private _initialized;
    startAsync(rushWorkspacePath: string): Promise<void>;
    private _initializeAsync;
    private _fetchToolsAsync;
    get tools(): McpTool[];
    callToolAsync(name: string, args: Record<string, unknown>): Promise<unknown>;
    private _sendRequestAsync;
    private _processBuffer;
    private _handleResponse;
    private _rejectAllPending;
    stopAsync(): Promise<void>;
}
export {};
//# sourceMappingURL=McpProxyClient.d.ts.map