#!/usr/bin/env node

/**
 * MediaWiki MCP Server - 包含 list_wikis 和 get_page 功能
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 解析命令行参数
const args = process.argv.slice(2);
let envFilePath = path.resolve(__dirname, '../.env'); // 默认路径

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-f' && i + 1 < args.length) {
    envFilePath = path.resolve(args[i + 1]);
    break;
  }
}

// 加载环境变量
config({ path: envFilePath });

const require = createRequire(import.meta.url);
const nodemw = require('nodemw');

// 可用的 wiki 配置
const wikiConfigs: {
  [key: string]: {
    apiUrl: string;
    username?: string;
    password?: string;
  }
} = {
  Jthou: {
    apiUrl: process.env.JTHOU_API_URL || "http://www.jthou.com/mediawiki/api.php",
    username: process.env.JTHOU_USERNAME,
    password: process.env.JTHOU_PASSWORD
  }
};

// MediaWiki 客户端类
class MediaWikiClient {
  private client: any;
  private config: any;
  private isLoggedIn: boolean = false;

  constructor(config: { apiUrl: string; username?: string; password?: string }) {
    const url = new URL(config.apiUrl);

    this.config = {
      protocol: url.protocol.replace(':', ''),
      server: url.hostname,
      path: url.pathname.replace('/api.php', ''),
      debug: false
    };

    if (config.username && config.password) {
      this.config.username = config.username;
      this.config.password = config.password;
    }

    this.client = new nodemw(this.config);
  }

  async login(): Promise<void> {
    if (!this.config.username || !this.config.password) {
      // 无需登录，跳过
      return;
    }

    if (this.isLoggedIn) {
      // 已经登录，跳过
      return;
    }

    return new Promise((resolve, reject) => {
      this.client.logIn((err: Error) => {
        if (err) {
          reject(new Error(`Login failed: ${err.message}`));
        } else {
          this.isLoggedIn = true;
          resolve();
        }
      });
    });
  }

  async getPage(title: string): Promise<string> {
    // 先尝试登录（如果需要）
    await this.login();

    return new Promise((resolve, reject) => {
      this.client.getArticle(title, (err: Error, content: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(content || '');
        }
      });
    });
  }
}

// 工具处理函数
async function handleListWikis(): Promise<any> {
  const wikis = Object.keys(wikiConfigs);
  return {
    content: [{
      type: "text",
      text: `Available MediaWiki instances (${wikis.length}):\n\n` +
        wikis.map(key => `- ${key}: ${wikiConfigs[key].apiUrl}`).join("\n")
    }]
  };
}

async function handleGetPage(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const title = String(args?.title || '');

  if (!wiki || !title) {
    throw new Error("Both 'wiki' and 'title' parameters are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  try {
    const client = new MediaWikiClient(wikiConfigs[wiki]);
    const content = await client.getPage(title);

    // 创建 .jthou_wiki 目录
    const wikiDir = '.jthou_wiki';
    if (!fs.existsSync(wikiDir)) {
      fs.mkdirSync(wikiDir);
    }

    // 写入页面内容到文件
    const filename = `${title}.txt`;
    const filepath = path.join(wikiDir, filename);
    fs.writeFileSync(filepath, content, 'utf8');

    return {
      content: [{
        type: "text",
        text: `Successfully retrieved page "${title}" from ${wiki} and saved to ${filepath}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error retrieving page "${title}" from ${wiki}: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

// 创建 MCP 服务器实例
const server = new Server(
  { name: "mediawiki-mcp", version: "0.1.0" },
  { capabilities: { tools: { listChanged: true } } }
);

// 列出可用工具：list_wikis 和 get_page
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
      },
      {
        name: "get_page",
        description: "Get content of a MediaWiki page from Jthou wiki",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name (currently only 'Jthou' is supported)"
            },
            title: {
              type: "string",
              description: "Page title"
            }
          },
          required: ["wiki", "title"]
        }
      }
    ]
  };
});

// 工具调用处理：处理 list_wikis 和 get_page
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  switch (toolName) {
    case "list_wikis":
      return await handleListWikis();

    case "get_page":
      return await handleGetPage(request.params.arguments);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
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