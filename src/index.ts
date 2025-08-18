#!/usr/bin/env node

/**
 * MediaWiki MCP Server - 仅保留 list_wikis 功能
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// 可用的 wiki 配置
const wikiConfigs: { [key: string]: { apiUrl: string } } = {
  wikipedia: { apiUrl: process.env.WIKIPEDIA_API_URL || "https://zh.wikipedia.org/w/api.php" },
  Jthou:     { apiUrl: process.env.JTHOU_API_URL     || "http://www.jthou.com/mediawiki/api.php" }
};

// 创建 MCP 服务器实例
const server = new Server(
  { name: "mediawiki-mcp", version: "0.1.0" },
  { capabilities: { tools: { listChanged: true } } }
);

// 列出可用工具：仅 list_wikis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_wikis",
        description: "List all available MediaWiki instances",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

// 工具调用处理：仅处理 list_wikis
server.setRequestHandler(CallToolRequestSchema, async () => {
  const wikis = Object.keys(wikiConfigs);
  return {
    content: [{
      type: "text",
      text: `Available MediaWiki instances (${wikis.length}):\n\n` +
            wikis.map(key => `- ${key}: ${wikiConfigs[key].apiUrl}`).join("\n")
    }]
  };
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error("Server error:", err);
  process.exit(1);
});