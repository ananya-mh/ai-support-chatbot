/**
 * mcp/server.js
 *
 * MCP Server that registers all Firebase developer support tools.
 * Tools are exposed as a standardized catalog that any MCP client
 * (including our agent loop) can discover and call.
 *
 * Uses stdio transport for in-process communication with the agent.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchDocs } from '../services/embeddingService.js';

// ─── Create MCP Server ──────────────────────────────────────────────────────

const server = new McpServer({
  name: 'firebase-support-bot',
  version: '1.0.0',
});

// ─── Tool: search_docs ──────────────────────────────────────────────────────

server.registerTool(
  'search_docs',
  {
    title: 'Search Firebase Documentation',
    description:
      'Search the Firebase documentation knowledge base for relevant guides, API references, and code examples. Use this tool when a developer asks how to do something with Firebase, needs code examples, or wants to understand a Firebase feature.',
    inputSchema: {
      query: z.string().describe('The developer question or search query'),
      product: z
        .string()
        .optional()
        .describe(
          'Optional Firebase product filter: auth, firestore, rtdb, functions, hosting, storage, fcm, general'
        ),
      topK: z
        .number()
        .optional()
        .describe('Number of results to return (default 5)'),
    },
  },
  async ({ query, product, topK }) => {
    const results = await searchDocs(query, {
      topK: topK || 5,
      product: product || null,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }
);

// ─── Tool: lookup_error_code ─────────────────────────────────────────────────

server.registerTool(
  'lookup_error_code',
  {
    title: 'Lookup Firebase Error Code',
    description:
      'Look up a specific Firebase error code to get its cause, resolution steps, and related documentation. Use this when a developer shares an error message or error code from Firebase.',
    inputSchema: {
      errorCode: z
        .string()
        .describe(
          'The Firebase error code, e.g. "auth/user-not-found", "permission-denied", "UNAUTHENTICATED"'
        ),
    },
  },
  async ({ errorCode }) => {
    // Search docs specifically for this error code
    const results = await searchDocs(`Firebase error ${errorCode} cause resolution`, {
      topK: 3,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              errorCode,
              results: results.map((r) => ({
                text: r.text,
                product: r.product,
                source: r.source,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ─── Tool: check_firebase_status ─────────────────────────────────────────────

server.registerTool(
  'check_firebase_status',
  {
    title: 'Check Firebase Service Status',
    description:
      'Check the current operational status of Firebase services. Use this when a developer reports widespread issues that might be caused by a Firebase outage.',
    inputSchema: {},
  },
  async () => {
    try {
      const response = await fetch('https://status.firebase.google.com/incidents.json');
      const incidents = await response.json();

      // Get the 3 most recent incidents
      const recent = Array.isArray(incidents) ? incidents.slice(0, 3) : [];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: recent.length > 0 ? 'Recent incidents found' : 'No recent incidents',
                incidents: recent,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Unable to fetch Firebase status', message: err.message }),
          },
        ],
      };
    }
  }
);

// ─── Tool: analyze_security_rules ────────────────────────────────────────────

server.registerTool(
  'analyze_security_rules',
  {
    title: 'Analyze Firebase Security Rules',
    description:
      'Analyze Firestore or Realtime Database security rules for common issues, anti-patterns, and best practices. Use this when a developer shares their security rules or has permission-denied errors.',
    inputSchema: {
      rules: z.string().describe('The security rules code to analyze'),
      dbType: z
        .enum(['firestore', 'rtdb'])
        .optional()
        .describe('Database type: firestore or rtdb (default: firestore)'),
    },
  },
  async ({ rules, dbType }) => {
    // Check for common anti-patterns
    const issues = [];
    const dbLabel = dbType === 'rtdb' ? 'Realtime Database' : 'Firestore';

    if (rules.includes('allow read, write: if true') || rules.includes('allow read, write;')) {
      issues.push({
        severity: 'critical',
        issue: 'Rules allow unrestricted read/write access to all users',
        fix: 'Add authentication checks: allow read, write: if request.auth != null',
      });
    }

    if (rules.includes('allow read, write: if false')) {
      issues.push({
        severity: 'warning',
        issue: 'Rules block all access — nothing can read or write',
        fix: 'Add appropriate conditions for authorized users',
      });
    }

    if (!rules.includes('request.auth') && !rules.includes('.auth')) {
      issues.push({
        severity: 'warning',
        issue: 'No authentication checks found in rules',
        fix: 'Consider adding request.auth != null to restrict access to authenticated users',
      });
    }

    if (rules.includes('{document=**}') && !rules.includes('request.auth')) {
      issues.push({
        severity: 'critical',
        issue: 'Wildcard match on all documents without authentication',
        fix: 'Narrow the wildcard scope or add auth checks',
      });
    }

    if (rules.includes('request.resource.data') && !rules.includes('.size()') && !rules.includes('.hasAll')) {
      issues.push({
        severity: 'info',
        issue: 'No data validation on incoming writes',
        fix: 'Consider validating field types and required fields with request.resource.data.keys().hasAll()',
      });
    }

    // Also search docs for security rules best practices
    const docs = await searchDocs(`${dbLabel} security rules best practices`, { topK: 2 });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              dbType: dbLabel,
              issuesFound: issues.length,
              issues,
              bestPractices: docs.map((d) => ({ text: d.text, source: d.source })),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ─── Tool: create_bug_report ─────────────────────────────────────────────────

server.registerTool(
  'create_bug_report',
  {
    title: 'Create Bug Report',
    description:
      'Generate a structured bug report from the conversation. Use this when the developer has an issue that cannot be resolved and needs to be tracked.',
    inputSchema: {
      title: z.string().describe('Brief title of the bug'),
      product: z.string().describe('Firebase product affected'),
      description: z.string().describe('Detailed description of the issue'),
      stepsToReproduce: z.string().describe('Steps to reproduce the issue'),
      expectedBehavior: z.string().describe('What should happen'),
      actualBehavior: z.string().describe('What actually happens'),
      sdkVersion: z.string().optional().describe('Firebase SDK version if known'),
    },
  },
  async ({ title, product, description, stepsToReproduce, expectedBehavior, actualBehavior, sdkVersion }) => {
    const report = {
      title,
      product,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      sdkVersion: sdkVersion || 'unknown',
      createdAt: new Date().toISOString(),
      status: 'open',
    };

    // TODO: In production, POST this to GitHub Issues API or internal tracker
    // For now, return the formatted report

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  }
);

export { server };