const app = require("./express-app");

const { randomUUID } = require("crypto");
const {
  McpServer,
  ResourceTemplate,
} = require("@modelcontextprotocol/sdk/server/mcp.js");

const {
  StreamableHTTPServerTransport,
} = require("@modelcontextprotocol/sdk/server/streamableHttp.js");

const { isInitializeRequest } = require("@modelcontextprotocol/sdk/types.js");

/**
 * In-memory session store:
 *   sessions[sessionId] = {
 *     server:   McpServer instance for this session,
 *     transport: StreamableHTTPServerTransport bound to this session
 *     latestHeader: Request Headers refreshed in each post
 *   }
 */
const sessions = {};

/**
 * Handler for POST /mcp:
 *   1. If "mcp-session-id" header exists and matches a stored session, reuse that session.
 *   2. If no "mcp-session-id" and request is initialize, create new session and handshake.
 *   3. Otherwise, return a 400 error.
 */

app.post("/mcp", async (req, res) => {
  const sessionIdHeader = req.headers["mcp-session-id"];
  let sessionEntry = null;

  // Case 1: Existing session found
  if (sessionIdHeader && sessions[sessionIdHeader]) {
    sessionEntry = sessions[sessionIdHeader];
    sessionEntry.latestHeaders = { ...req.headers };
    // Case 2: Initialization request → create new transport + server
  } else if (!sessionIdHeader && isInitializeRequest(req.body)) {
    const newSessionId = randomUUID();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
      onsessioninitialized: (sid) => {
        console.log(`Session ${sid} initialized`);
      },
    });

    // When this transport closes, clean up the session entry
    transport.onclose = () => {
      if (transport.sessionId && sessions[transport.sessionId]) {
        console.log(`Cleaning up session ${transport.sessionId}`);
        const session = sessions[transport.sessionId];

        // Clear any references
        if (session.server) {
          session.server = null;
        }
        if (session.transport) {
          session.transport = null;
        }

        delete sessions[transport.sessionId];
      }
    };

    const initialHeaders = { ...req.headers };

    // Create server but don't register tools yet
    const server = new McpServer({
      name: process.env.PROJECT_NAME + "-mcp-server",
      version: "1.0.0",
      capabilities: {
        tools: { listChanged: true },
      },
    });

    // register mcp routers as tools
    const {
      // main Database Crud Object Mcp Routers
      userMcpRouter,
      getLoginRouter,
      getVerificationServicesRouter,
    } = require("mcpLayer")(initialHeaders);

    const sessionRouter = getLoginRouter(initialHeaders);
    const verificationServicesRouter =
      getVerificationServicesRouter(initialHeaders);

    userMcpRouter.forEach((mcpTool) =>
      server.tool(
        mcpTool.name,
        mcpTool.description,
        mcpTool.parameters,
        mcpTool.controller,
      ),
    );

    // register session routes
    sessionRouter.forEach((mcpTool) =>
      server.tool(
        mcpTool.name,
        mcpTool.description,
        mcpTool.parameters,
        mcpTool.controller,
      ),
    );

    // Connect first
    await server.connect(transport);

    // After `onsessioninitialized` fires, `sessions[newSessionId]` is set.
    // But we can also assign it here for immediate access.
    sessions[newSessionId] = {
      server,
      transport,
      latestHeaders: initialHeaders,
    };
    sessionEntry = sessions[newSessionId];
  } else {
    // Neither a valid session nor an initialize request → return error
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
    return;
  }

  // Forward the request to the transport of the retrieved/created session
  await sessionEntry.transport.handleRequest(req, res, req.body);
});

/**
 * Handler for GET/DELETE /mcp:
 *   Used for server-to-client notifications (SSE) and session termination.
 */
async function handleSessionRequest(req, res) {
  const sessionIdHeader = req.headers["mcp-session-id"];
  if (!sessionIdHeader || !sessions[sessionIdHeader]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  const { transport } = sessions[sessionIdHeader];
  await transport.handleRequest(req, res);
}

app.get("/mcp", handleSessionRequest);
app.delete("/mcp", handleSessionRequest);

module.exports = sessions;
