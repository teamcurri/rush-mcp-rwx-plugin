import type { IRushMcpPlugin, RushMcpPluginSession } from './types/rush-mcp-plugin';
export declare class RwxPlugin implements IRushMcpPlugin {
    session: RushMcpPluginSession;
    private _proxyClient;
    private _rwxCliReady;
    constructor(session: RushMcpPluginSession);
    /**
     * Check if the rwx CLI is ready (installed and meets minimum version).
     */
    get rwxCliReady(): boolean;
    onInitializeAsync(): Promise<void>;
    onShutdownAsync(): Promise<void>;
}
declare const _default: (session: RushMcpPluginSession) => RwxPlugin;
export default _default;
//# sourceMappingURL=index.d.ts.map