/**
 * services/agentService.js
 *
 * The core agent loop. Acts as an MCP client that:
 * 1. Discovers tools from the MCP server
 * 2. Translates MCP tool schemas → Gemini function declarations
 * 3. Runs a multi-step reasoning loop with Gemini
 * 4. Routes Gemini's tool calls back through MCP
 * 5. Returns a final grounded answer
 *
 * This replaces the old single-shot llmService.js
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { server as mcpServer } from '../mcp/server.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const MAX_ITERATIONS = 5;
const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a Firebase developer support agent. Your job is to help developers solve problems with Firebase products including Auth, Firestore, Realtime Database, Cloud Functions, Hosting, Storage, and Cloud Messaging.

You have access to tools that let you search Firebase documentation, look up error codes, check Firebase service status, analyze security rules, and create bug reports.

Guidelines:
- ALWAYS use the search_docs tool first to find relevant documentation before answering questions.
- If the developer mentions an error code, use lookup_error_code to get specific resolution steps.
- If the developer shares security rules, use analyze_security_rules to check for issues.
- If the developer reports widespread failures, use check_firebase_status to check for outages.
- Include code examples in your answers when relevant.
- Cite the documentation source when referencing specific docs.
- If you cannot resolve the issue after using tools, offer to create a bug report.
- Keep answers concise and developer-friendly.
- Focus on JavaScript/Web/Node.js unless the developer specifies another platform.`;

// ─── Singleton Gemini client ─────────────────────────────────────────────────

let genAI = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// ─── MCP Client setup ────────────────────────────────────────────────────────

let mcpClient = null;
let mcpTools = null;

async function getMcpClient() {
  if (mcpClient) return { client: mcpClient, tools: mcpTools };

  // Create in-memory transport pair for client ↔ server communication
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  // Connect MCP server to its transport
  await mcpServer.server.connect(serverTransport);

  // Create and connect MCP client
  mcpClient = new Client({ name: 'firebase-agent', version: '1.0.0' });
  await mcpClient.connect(clientTransport);

  // Discover available tools
  const toolsResult = await mcpClient.listTools();
  mcpTools = toolsResult.tools;

  console.log(`MCP Client connected. Discovered ${mcpTools.length} tools:`);
  mcpTools.forEach((t) => console.log(`  - ${t.name}: ${t.description?.substring(0, 60)}...`));

  return { client: mcpClient, tools: mcpTools };
}

// ─── Convert MCP tool schemas → Gemini function declarations ─────────────────

function mcpToolsToGeminiFunctions(tools) {
  return tools.map((tool) => {
    // Convert Zod/JSON Schema to Gemini's format
    const properties = {};
    const required = [];

    if (tool.inputSchema?.properties) {
      for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
        properties[key] = {
          type: schema.type || 'string',
          description: schema.description || '',
        };
        // If there's an enum, add it
        if (schema.enum) {
          properties[key].enum = schema.enum;
        }
      }
    }

    if (tool.inputSchema?.required) {
      required.push(...tool.inputSchema.required);
    }

    return {
      name: tool.name,
      description: tool.description || '',
      parameters: {
        type: 'object',
        properties,
        required,
      },
    };
  });
}

// ─── Execute a tool call through MCP ─────────────────────────────────────────

async function executeTool(client, toolName, args) {
  const result = await client.callTool({ name: toolName, arguments: args });

  // Extract text content from MCP response
  const textContent = result.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  return textContent;
}

// ─── Main agent loop ─────────────────────────────────────────────────────────

/**
 * Run the agent loop for a developer's message.
 *
 * @param {string} userMessage - The developer's question
 * @param {Array} conversationHistory - Previous messages [{role, text}]
 * @returns {string} The agent's final response
 */
async function runAgent(userMessage, conversationHistory = []) {
  const { client, tools } = await getMcpClient();
  const geminiFunctions = mcpToolsToGeminiFunctions(tools);

  const model = getGenAI().getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: geminiFunctions }],
  });

  // Build message history for Gemini
  const history = conversationHistory.map((msg) => ({
    role: msg.role === 'bot' ? 'model' : 'user',
    parts: [{ text: msg.text }],
  }));

  const chat = model.startChat({ history });

  // Start the reasoning loop
  let response = await chat.sendMessage(userMessage);
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    const candidate = response.response.candidates?.[0];
    if (!candidate) break;

    const parts = candidate.content?.parts || [];

    // Check if the model wants to call a tool
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      // No tool calls — model has a final answer
      const textParts = parts.filter((p) => p.text);
      return textParts.map((p) => p.text).join('\n');
    }

    // Execute each tool call through MCP
    const toolResults = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      console.log(`  [Agent] Calling tool: ${name}(${JSON.stringify(args).substring(0, 100)}...)`);

      try {
        const result = await executeTool(client, name, args);
        toolResults.push({
          functionResponse: {
            name,
            response: { content: result },
          },
        });
      } catch (err) {
        console.error(`  [Agent] Tool error: ${name} — ${err.message}`);
        toolResults.push({
          functionResponse: {
            name,
            response: { error: err.message },
          },
        });
      }
    }

    // Send tool results back to Gemini and continue the loop
    response = await chat.sendMessage(toolResults);
    iterations++;
  }

  // If we exhausted iterations, return whatever we have
  const finalParts = response.response.candidates?.[0]?.content?.parts || [];
  const finalText = finalParts
    .filter((p) => p.text)
    .map((p) => p.text)
    .join('\n');

  return finalText || 'I was unable to find a complete answer. Would you like me to create a bug report?';
}

export { runAgent, getMcpClient };