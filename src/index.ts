#!/usr/bin/env node

/**
 * MediaWiki MCP Server
 * Provides tools and resources for reading and writing MediaWiki pages
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";

/**
 * MediaWiki page interface
 */
interface WikiPage {
  pageid: number;
  title: string;
  content?: string;
  timestamp?: string;
  size?: number;
}

/**
 * MediaWiki configuration
 */
interface WikiConfig {
  apiUrl: string;
  username?: string;
  password?: string;
  token?: string;
}

/**
 * MediaWiki API client
 */
class MediaWikiClient {
  private axios: AxiosInstance;
  private config: WikiConfig;
  private editToken?: string;

  constructor(config: WikiConfig) {
    this.config = config;
    this.axios = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
    });
  }

  /**
   * Login to MediaWiki if credentials are provided
   */
  async login(): Promise<void> {
    if (!this.config.username || !this.config.password) {
      return;
    }

    try {
      // Get login token
      const tokenResponse = await this.axios.get('', {
        params: {
          action: 'query',
          meta: 'tokens',
          type: 'login',
          format: 'json'
        }
      });

      const loginToken = tokenResponse.data.query.tokens.logintoken;

      // Login
      const loginResponse = await this.axios.post('', new URLSearchParams({
        action: 'login',
        lgname: this.config.username,
        lgpassword: this.config.password,
        lgtoken: loginToken,
        format: 'json'
      }));

      if (loginResponse.data.login.result !== 'Success') {
        throw new Error(`Login failed: ${loginResponse.data.login.reason}`);
      }

      // Get edit token
      const editTokenResponse = await this.axios.get('', {
        params: {
          action: 'query',
          meta: 'tokens',
          format: 'json'
        }
      });

      this.editToken = editTokenResponse.data.query.tokens.csrftoken;
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  /**
   * Get page content by title
   */
  async getPage(title: string): Promise<WikiPage | null> {
    try {
      const response = await this.axios.get('', {
        params: {
          action: 'query',
          titles: title,
          prop: 'revisions|info',
          rvprop: 'content|timestamp',
          format: 'json'
        }
      });

      const pages = response.data.query.pages;
      const pageId = Object.keys(pages)[0];
      
      if (pageId === '-1') {
        return null; // Page doesn't exist
      }

      const page = pages[pageId];
      const revision = page.revisions?.[0];

      return {
        pageid: page.pageid,
        title: page.title,
        content: revision?.['*'] || '',
        timestamp: revision?.timestamp,
        size: page.length
      };
    } catch (error) {
      throw new Error(`Failed to get page: ${error}`);
    }
  }

  /**
   * Search for pages
   */
  async searchPages(query: string, limit: number = 10): Promise<WikiPage[]> {
    try {
      const response = await this.axios.get('', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          srlimit: limit,
          format: 'json'
        }
      });

      return response.data.query.search.map((result: any) => ({
        pageid: result.pageid,
        title: result.title,
        size: result.size
      }));
    } catch (error) {
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Create or edit a page
   */
  async editPage(title: string, content: string, summary: string = ''): Promise<void> {
    if (!this.editToken) {
      throw new Error('Not authenticated for editing');
    }

    try {
      const response = await this.axios.post('', new URLSearchParams({
        action: 'edit',
        title: title,
        text: content,
        summary: summary,
        token: this.editToken,
        format: 'json'
      }));

      if (response.data.error) {
        throw new Error(`Edit failed: ${response.data.error.info}`);
      }

      if (response.data.edit.result !== 'Success') {
        throw new Error(`Edit failed: ${response.data.edit.result}`);
      }
    } catch (error) {
      throw new Error(`Failed to edit page: ${error}`);
    }
  }

  /**
   * Get recent changes
   */
  async getRecentChanges(limit: number = 10): Promise<WikiPage[]> {
    try {
      const response = await this.axios.get('', {
        params: {
          action: 'query',
          list: 'recentchanges',
          rcprop: 'title|timestamp|sizes',
          rclimit: limit,
          format: 'json'
        }
      });

      return response.data.query.recentchanges.map((change: any) => ({
        pageid: 0, // Not provided in recent changes
        title: change.title,
        timestamp: change.timestamp,
        size: change.newlen
      }));
    } catch (error) {
      throw new Error(`Failed to get recent changes: ${error}`);
    }
  }
}

// Initialize MediaWiki client with environment variables or defaults
const wikiConfig: WikiConfig = {
  apiUrl: process.env.MEDIAWIKI_API_URL || 'https://zh.wikipedia.org/w/api.php',
  username: process.env.MEDIAWIKI_USERNAME,
  password: process.env.MEDIAWIKI_PASSWORD
};

const wikiClient = new MediaWikiClient(wikiConfig);

// Cache for pages
const pageCache: { [title: string]: WikiPage } = {};

/**
 * Create MCP server with MediaWiki capabilities
 */
const server = new Server(
  {
    name: "mediawiki-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Handler for listing available pages as resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const recentPages = await wikiClient.getRecentChanges(20);
    
    return {
      resources: recentPages.map(page => ({
        uri: `wiki:///${encodeURIComponent(page.title)}`,
        mimeType: "text/plain",
        name: page.title,
        description: `MediaWiki page: ${page.title}`
      }))
    };
  } catch (error) {
    return {
      resources: []
    };
  }
});

/**
 * Handler for reading page content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const title = decodeURIComponent(url.pathname.replace(/^\//, ''));
  
  try {
    let page = pageCache[title];
    if (!page) {
      const fetchedPage = await wikiClient.getPage(title);
      if (!fetchedPage) {
        throw new Error(`Page "${title}" not found`);
      }
      page = fetchedPage;
      pageCache[title] = page;
    }

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "text/plain",
        text: page.content || ''
      }]
    };
  } catch (error) {
    throw new Error(`Failed to read page "${title}": ${error}`);
  }
});

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_pages",
        description: "Search for MediaWiki pages",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query"
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 10)",
              default: 10
            }
          },
          required: ["query"]
        }
      },
      {
        name: "get_page",
        description: "Get content of a specific MediaWiki page",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Page title"
            }
          },
          required: ["title"]
        }
      },
      {
        name: "edit_page",
        description: "Create or edit a MediaWiki page (requires authentication)",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Page title"
            },
            content: {
              type: "string",
              description: "Page content (wikitext)"
            },
            summary: {
              type: "string",
              description: "Edit summary",
              default: "Updated via MCP"
            }
          },
          required: ["title", "content"]
        }
      },
      {
        name: "get_recent_changes",
        description: "Get recent changes from MediaWiki",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of changes (default: 10)",
              default: 10
            }
          }
        }
      }
    ]
  };
});

/**
 * Handler for tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "search_pages": {
        const query = String(request.params.arguments?.query);
        const limit = Number(request.params.arguments?.limit) || 10;
        
        const results = await wikiClient.searchPages(query, limit);
        
        return {
          content: [{
            type: "text",
            text: `Found ${results.length} pages:\n\n` + 
                  results.map(page => `- ${page.title} (${page.size} bytes)`).join('\n')
          }]
        };
      }

      case "get_page": {
        const title = String(request.params.arguments?.title);
        
        const fetchedPage = await wikiClient.getPage(title);
        if (!fetchedPage) {
          return {
            content: [{
              type: "text",
              text: `Page "${title}" not found`
            }]
          };
        }

        // Cache the page
        pageCache[title] = fetchedPage;

        return {
          content: [{
            type: "text",
            text: `Page: ${fetchedPage.title}\nSize: ${fetchedPage.size} bytes\nLast modified: ${fetchedPage.timestamp}\n\nContent:\n${fetchedPage.content}`
          }]
        };
      }

      case "edit_page": {
        const title = String(request.params.arguments?.title);
        const content = String(request.params.arguments?.content);
        const summary = String(request.params.arguments?.summary) || "Updated via MCP";

        // Ensure we're authenticated
        await wikiClient.login();
        
        await wikiClient.editPage(title, content, summary);
        
        // Clear cache for this page
        delete pageCache[title];

        return {
          content: [{
            type: "text",
            text: `Successfully edited page "${title}"`
          }]
        };
      }

      case "get_recent_changes": {
        const limit = Number(request.params.arguments?.limit) || 10;
        
        const changes = await wikiClient.getRecentChanges(limit);
        
        return {
          content: [{
            type: "text",
            text: `Recent changes (${changes.length} items):\n\n` +
                  changes.map(change => `- ${change.title} (${change.size} bytes) - ${change.timestamp}`).join('\n')
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error}`
      }]
    };
  }
});

/**
 * Start the server
 */
async function main() {
  try {
    // Try to authenticate if credentials are provided
    await wikiClient.login();
    console.error("MediaWiki MCP Server authenticated successfully");
  } catch (error) {
    console.error("MediaWiki MCP Server starting without authentication:", error);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MediaWiki MCP Server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});