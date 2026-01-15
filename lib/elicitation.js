"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRwxTokenElicitation = createRwxTokenElicitation;
exports.createRwxCliInstallElicitation = createRwxCliInstallElicitation;
exports.checkRwxToken = checkRwxToken;
exports.checkRwxCli = checkRwxCli;
exports.checkRwxPrerequisites = checkRwxPrerequisites;
exports.createRwxTokenInvalidElicitation = createRwxTokenInvalidElicitation;
exports.is401Error = is401Error;
exports.handleRwxError = handleRwxError;
/**
 * Create an elicitation response that prompts the user for the RWX access token.
 */
function createRwxTokenElicitation() {
    const response = {
        status: 'needs_user_input',
        kind: 'elicitation',
        question: 'RWX access token is required. Please provide your RWX access token.',
        instructions: `To get an RWX access token:
1. Go to https://cloud.rwx.com/settings/access-tokens
2. Click "Create Access Token"
3. Give it a descriptive name (e.g., "MCP Plugin")
4. Copy the generated token

The token will be stored for this session only.`,
        input_schema: {
            type: 'object',
            properties: {
                token: {
                    type: 'string',
                    description: 'Your RWX access token',
                },
            },
            required: ['token'],
        },
        next_tool: 'set_rwx_access_token',
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
/**
 * Create an elicitation response that prompts the user to install or upgrade the rwx CLI.
 */
function createRwxCliInstallElicitation(currentVersion, requiredVersion) {
    const isUpgrade = currentVersion !== null;
    const question = isUpgrade
        ? `rwx CLI version ${currentVersion} is installed, but version >= ${requiredVersion} is required. Please upgrade.`
        : `rwx CLI is not installed. Please install version >= ${requiredVersion}.`;
    const response = {
        status: 'needs_user_input',
        kind: 'elicitation',
        question,
        instructions: `To install or upgrade the rwx CLI:

**Download from releases:**
https://github.com/rwx-research/rwx-cli/releases

**Or install via package manager:**

macOS (Homebrew):
  brew install rwx-research/tap/rwx

Linux (apt):
  curl -fsSL https://apt.rwx.com/public.key | sudo gpg --dearmor -o /usr/share/keyrings/rwx-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/rwx-archive-keyring.gpg] https://apt.rwx.com stable main" | sudo tee /etc/apt/sources.list.d/rwx.list
  sudo apt update && sudo apt install rwx

After installation, confirm by running: rwx --version`,
        input_schema: {
            type: 'object',
            properties: {
                confirmed: {
                    type: 'string',
                    description: 'Type "installed" after you have installed/upgraded the rwx CLI',
                    enum: ['installed'],
                },
            },
            required: ['confirmed'],
        },
        next_tool: 'verify_rwx_cli',
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
/**
 * Check if RWX_ACCESS_TOKEN is set.
 * Returns an elicitation response if not set, null otherwise.
 */
function checkRwxToken() {
    if (!process.env.RWX_ACCESS_TOKEN) {
        return createRwxTokenElicitation();
    }
    return null;
}
/**
 * Check if the rwx CLI is installed and meets minimum version.
 * Returns an elicitation response if not ready, null otherwise.
 */
function checkRwxCli() {
    // Dynamic import to avoid circular dependency
    const { getRwxCliVersion, MIN_RWX_VERSION } = require('./utils');
    const check = getRwxCliVersion();
    if (!check.installed) {
        return createRwxCliInstallElicitation(null, MIN_RWX_VERSION);
    }
    if (!check.meetsMinimum) {
        return createRwxCliInstallElicitation(check.version, MIN_RWX_VERSION);
    }
    return null;
}
/**
 * Check all RWX prerequisites (CLI and token).
 * Returns the first elicitation response needed, or null if all ready.
 * Checks CLI first, then token.
 */
function checkRwxPrerequisites() {
    // Check CLI first
    const cliCheck = checkRwxCli();
    if (cliCheck) {
        return cliCheck;
    }
    // Then check token
    const tokenCheck = checkRwxToken();
    if (tokenCheck) {
        return tokenCheck;
    }
    return null;
}
/**
 * Create an elicitation response for an invalid/expired RWX token (401 error).
 */
function createRwxTokenInvalidElicitation() {
    const response = {
        status: 'needs_user_input',
        kind: 'elicitation',
        question: 'RWX access token is invalid or expired. Please provide a new RWX access token.',
        instructions: `Your current RWX access token was rejected (401 Unauthorized).

To get a new RWX access token:
1. Go to https://cloud.rwx.com/settings/access-tokens
2. Click "Create Access Token"
3. Give it a descriptive name (e.g., "MCP Plugin")
4. Copy the generated token

The token will be stored for this session only.`,
        input_schema: {
            type: 'object',
            properties: {
                token: {
                    type: 'string',
                    description: 'Your RWX access token',
                },
            },
            required: ['token'],
        },
        next_tool: 'set_rwx_access_token',
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
/**
 * Check if an error is a 401 Unauthorized error.
 */
function is401Error(error) {
    if (error instanceof Error) {
        return error.message.includes('401') || error.message.includes('Unauthorized');
    }
    return false;
}
/**
 * Handle an error, returning an elicitation response for 401 errors
 * or a standard error response otherwise.
 */
function handleRwxError(error, operation) {
    if (is401Error(error)) {
        return createRwxTokenInvalidElicitation();
    }
    return {
        content: [
            {
                type: 'text',
                text: `Failed to ${operation}: ${error}`,
            },
        ],
        isError: true,
    };
}
//# sourceMappingURL=elicitation.js.map