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

  async updatePage(title: string, content: string, summary: string, mode: 'replace' | 'append' | 'prepend' = 'replace', minor: boolean = false): Promise<any> {
    // 先尝试登录（如果需要）
    await this.login();

    return new Promise((resolve, reject) => {
      const callback = (err: Error, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      };

      switch (mode) {
        case 'append':
          this.client.append(title, content, summary, callback);
          break;
        case 'prepend':
          this.client.prepend(title, content, summary, callback);
          break;
        case 'replace':
        default:
          this.client.edit(title, content, summary, minor, callback);
          break;
      }
    });
  }

  async deletePage(title: string, reason: string): Promise<any> {
    await this.login();

    return new Promise((resolve, reject) => {
      this.client.delete(title, reason, (err: Error, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async movePage(fromTitle: string, toTitle: string, summary: string): Promise<any> {
    await this.login();

    return new Promise((resolve, reject) => {
      this.client.move(fromTitle, toTitle, summary, (err: Error, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}

// 通用 wiki 操作处理函数
async function handleWikiOperation(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const action = String(args?.action || '');
  const title = String(args?.title || '');
  const content = String(args?.content || '');
  const summary = String(args?.summary || '');
  const options = args?.options || {};

  if (!wiki || !action || !title) {
    throw new Error("Parameters 'wiki', 'action', and 'title' are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  const client = new MediaWikiClient(wikiConfigs[wiki]);

  try {
    let result: any;

    switch (action) {
      case 'get':
        const pageContent = await client.getPage(title);

        // 获取输出目录：优先使用环境变量，然后使用当前工作目录
        const outputBaseDir = process.env.WIKI_OUTPUT_DIR || process.cwd();
        const wikiDir = path.join(outputBaseDir, '.jthou_wiki');

        if (!fs.existsSync(wikiDir)) {
          fs.mkdirSync(wikiDir, { recursive: true });
        }

        // 写入页面内容到文件
        const filename = `${title}.txt`;
        const filepath = path.join(wikiDir, filename);
        fs.writeFileSync(filepath, pageContent, 'utf8');

        return {
          content: [{
            type: "text",
            text: `Successfully retrieved page "${title}" from ${wiki} and saved to ${filepath}`
          }]
        };

      case 'create':
      case 'update':
      case 'append':
      case 'prepend':
        if (!content) {
          throw new Error("Content is required for create/update operations");
        }
        if (!summary) {
          throw new Error("Summary is required for create/update operations");
        }

        const mode = action === 'create' ? 'replace' :
          action === 'update' ? 'replace' : action as 'append' | 'prepend';
        const minor = options.minor || false;

        result = await client.updatePage(title, content, summary, mode, minor);

        return {
          content: [{
            type: "text",
            text: `Successfully ${action}d page "${title}" on ${wiki}. Revision ID: ${result.newrevid}`
          }]
        };

      case 'delete':
        const reason = options.reason || summary || 'Deleted via MCP';
        result = await client.deletePage(title, reason);

        return {
          content: [{
            type: "text",
            text: `Successfully deleted page "${title}" from ${wiki}. Reason: ${reason}`
          }]
        };

      case 'move':
        const newTitle = options.newTitle;
        if (!newTitle) {
          throw new Error("newTitle is required in options for move operation");
        }

        result = await client.movePage(title, newTitle, summary || 'Moved via MCP');

        return {
          content: [{
            type: "text",
            text: `Successfully moved page "${title}" to "${newTitle}" on ${wiki}`
          }]
        };

      default:
        throw new Error(`Unknown action: ${action}. Supported actions: get, create, update, append, prepend, delete, move`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error performing ${action} on page "${title}" from ${wiki}: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

// 工具处理函数
async function handleUpdatePage(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const title = String(args?.title || '');
  const content = String(args?.content || '');
  const summary = String(args?.summary || '');
  const mode = String(args?.mode || 'replace') as 'replace' | 'append' | 'prepend';
  const minor = Boolean(args?.minor || false);

  if (!wiki || !title || !content || !summary) {
    throw new Error("Parameters 'wiki', 'title', 'content', and 'summary' are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  if (!['replace', 'append', 'prepend'].includes(mode)) {
    throw new Error("Mode must be one of: replace, append, prepend");
  }

  try {
    const client = new MediaWikiClient(wikiConfigs[wiki]);
    const result = await client.updatePage(title, content, summary, mode, minor);

    return {
      content: [{
        type: "text",
        text: `Successfully updated page "${title}" on ${wiki} (mode: ${mode}). Revision ID: ${result.newrevid}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error updating page "${title}" on ${wiki}: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

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

    // 获取输出目录：优先使用环境变量，然后使用当前工作目录
    const outputBaseDir = process.env.WIKI_OUTPUT_DIR || process.cwd();
    const wikiDir = path.join(outputBaseDir, '.jthou_wiki');

    if (!fs.existsSync(wikiDir)) {
      fs.mkdirSync(wikiDir, { recursive: true });
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

// 列出可用工具：list_wikis 和 wiki_operation
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
        name: "wiki_operation",
        description: "Perform various operations on MediaWiki pages (get, create, update, append, prepend, delete, move)",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["Jthou"]
            },
            action: {
              type: "string",
              description: "Operation to perform",
              enum: ["get", "create", "update", "append", "prepend", "delete", "move"]
            },
            title: {
              type: "string",
              description: "Page title"
            },
            content: {
              type: "string",
              description: "Page content (required for create/update/append/prepend operations)"
            },
            summary: {
              type: "string",
              description: "Edit summary (required for create/update/append/prepend/move operations)"
            },
            options: {
              type: "object",
              description: "Additional options specific to the operation",
              properties: {
                minor: {
                  type: "boolean",
                  description: "Mark as minor edit (for update operations)",
                  default: false
                },
                newTitle: {
                  type: "string",
                  description: "New title for move operation"
                },
                reason: {
                  type: "string",
                  description: "Reason for delete operation (fallback to summary if not provided)"
                }
              }
            }
          },
          required: ["wiki", "action", "title"]
        }
      },
      {
        name: "update_page",
        description: "Update content of a MediaWiki page from Jthou wiki",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["Jthou"]
            },
            title: {
              type: "string",
              description: "Page title"
            },
            content: {
              type: "string",
              description: "New page content"
            },
            summary: {
              type: "string",
              description: "Edit summary describing the changes"
            },
            mode: {
              type: "string",
              description: "Update mode",
              enum: ["replace", "append", "prepend"],
              default: "replace"
            },
            minor: {
              type: "boolean",
              description: "Mark as minor edit",
              default: false
            }
          },
          required: ["wiki", "title", "content", "summary"]
        }
      },
      {
        name: "get_page",
        description: "Get content of a MediaWiki page from Jthou wiki (legacy, use wiki_operation with action='get' instead)",
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

// 工具调用处理：处理 list_wikis, wiki_operation, update_page 和 get_page（向后兼容）
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  switch (toolName) {
    case "list_wikis":
      return await handleListWikis();

    case "wiki_operation":
      return await handleWikiOperation(request.params.arguments);

    case "update_page":
      return await handleUpdatePage(request.params.arguments);

    case "get_page":
      // 向后兼容：将 get_page 调用转换为 wiki_operation
      return await handleWikiOperation({
        ...request.params.arguments,
        action: 'get'
      });

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