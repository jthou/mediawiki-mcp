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
// 使用动态导入 nodemw
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nodemw = require('nodemw');
// 导入日志模块
import logger from './logger.js';

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
 * MediaWiki API client using nodemw
 */
class MediaWikiClient {
  private client: any; // nodemw client
  private config: WikiConfig;
  private isLoggedIn: boolean = false;

  constructor(config: WikiConfig) {
    // 从 apiUrl 中提取服务器和路径
    const url = new URL(config.apiUrl);
    
    // 创建 nodemw 客户端配置
    const clientConfig: any = {
      protocol: url.protocol.replace(':', ''),
      server: url.hostname,
      path: url.pathname.replace('/api.php', ''),
      debug: false
    };
    
    // 如果提供了用户名和密码，添加到配置中
    if (config.username && config.password) {
      clientConfig.username = config.username;
      clientConfig.password = config.password;
    }
    
    this.config = config;
    this.client = new nodemw(clientConfig);
  }

  /**
   * 登录到 MediaWiki（如果提供了凭据）
   */
  async login(): Promise<void> {
    if (!this.config.username || !this.config.password) {
      logger.info(`未提供用户名或密码，跳过登录`);
      return;
    }

    // 如果已经登录，直接返回
    if (this.isLoggedIn) {
      logger.info(`已经登录为 ${this.config.username}，跳过重复登录`);
      return;
    }

    logger.info(`尝试登录到 ${this.config.apiUrl} 作为 ${this.config.username}`);
    
    return new Promise<void>((resolve, reject) => {
      this.client.logIn((err: Error) => {
        if (err) {
          logger.error(`登录失败: ${err.message}`);
          logger.error(`登录错误详情: ${JSON.stringify(err)}`);
          reject(new Error(`Authentication failed: ${err.message}`));
        } else {
          this.isLoggedIn = true;
          // 检查客户端状态
          logger.info(`成功登录到 ${this.config.apiUrl} 作为 ${this.config.username}`);
          logger.info(`客户端状态: 已认证=${this.client.isAuthenticated ? this.client.isAuthenticated() : '未知'}, Cookie数量=${Object.keys(this.client.cookies || {}).length}`);
          resolve();
        }
      });
    });
  }

  /**
   * 通过标题获取页面内容
   */
  async getPage(title: string): Promise<WikiPage | null> {
    // 确保已登录
    logger.info(`准备获取页面 "${title}"，先检查登录状态`);
    await this.login();
    
    return new Promise<WikiPage | null>((resolve, reject) => {
      logger.info(`开始获取页面: "${title}"，认证状态: ${this.isLoggedIn ? '已登录' : '未登录'}`);
      
      try {
        // 检查客户端状态
        logger.info(`客户端状态: 已认证=${this.client.isAuthenticated ? this.client.isAuthenticated() : '未知'}, Cookie数量=${Object.keys(this.client.cookies || {}).length}`);
        if (this.client.cookies) {
          logger.info(`Cookie详情: ${JSON.stringify(this.client.cookies)}`);
        }
        
        // 直接使用 API 调用，而不是 getArticle 方法
        logger.info(`尝试使用直接 API 调用获取页面内容`);
        logger.info(`API请求参数: { action: 'query', titles: '${title}', prop: 'revisions', rvprop: 'content' }`);
        
        this.client.api.call({
          action: 'query',
          prop: 'revisions',
          rvprop: 'content',
          titles: title,
          format: 'json'
        }, (err: Error, info: any) => {
          if (err) {
            logger.error(`API 调用失败: ${err.message}`);
            logger.error(`错误详情: ${JSON.stringify(err)}`);
            reject(new Error(`Failed to get page: ${err.message}`));
            return;
          }
          
          // 打印API响应的摘要
          logger.info(`API 响应收到，开始解析`);
          
          try {
            // 更灵活地处理响应格式
            let pageContent = null;
            let pageId = null;
            let pageTitle = title;
            let pageTimestamp = new Date().toISOString();
            
            // 检查是否有直接的 pages 对象（nodemw 可能已经解析了部分响应）
            if (info.pages) {
              logger.info(`找到直接的 pages 对象，包含 ${Object.keys(info.pages).length} 个页面`);
              const firstPageId = Object.keys(info.pages)[0];
              const page = info.pages[firstPageId];
              
              if (page) {
                pageId = firstPageId;
                pageTitle = page.title || title;
                
                if (page.revisions && page.revisions[0]) {
                  pageContent = page.revisions[0]['*'] || page.revisions[0].content;
                  pageTimestamp = page.revisions[0].timestamp || pageTimestamp;
                }
              }
            }
            // 检查标准的 MediaWiki API 响应格式
            else if (info.query && info.query.pages) {
              logger.info(`找到标准 API 响应格式，包含 ${Object.keys(info.query.pages).length} 个页面`);
              const firstPageId = Object.keys(info.query.pages)[0];
              const page = info.query.pages[firstPageId];
              
              if (page) {
                pageId = firstPageId;
                pageTitle = page.title || title;
                
                if (page.revisions && page.revisions[0]) {
                  pageContent = page.revisions[0]['*'] || page.revisions[0].content;
                  pageTimestamp = page.revisions[0].timestamp || pageTimestamp;
                }
              }
            }
            // 检查是否直接返回了内容（某些 API 实现可能这样做）
            else if (typeof info === 'string') {
              logger.info(`API 直接返回了字符串内容`);
              pageContent = info;
            }
            // 检查其他可能的响应格式
            else {
              logger.info(`尝试从未知格式的响应中提取内容`);
              logger.info(`响应顶层键: ${Object.keys(info).join(', ')}`);
              
              // 尝试递归查找可能的内容
              const findContent = (obj: any): string | null => {
                if (!obj || typeof obj !== 'object') return null;
                
                // 检查常见的内容字段名
                for (const key of ['*', 'content', 'text', 'wikitext']) {
                  if (typeof obj[key] === 'string') return obj[key];
                }
                
                // 递归检查所有对象属性
                for (const key of Object.keys(obj)) {
                  if (typeof obj[key] === 'object') {
                    const found = findContent(obj[key]);
                    if (found) return found;
                  }
                }
                
                return null;
              };
              
              pageContent = findContent(info);
            }
            
            // 如果找到了内容，返回页面对象
            if (pageContent) {
              const contentPreview = pageContent.length > 100 ? pageContent.substring(0, 100) + '...' : pageContent;
              logger.info(`成功获取页面内容，长度: ${pageContent.length}，内容预览: ${contentPreview}`);
              
              resolve({
                pageid: pageId ? parseInt(pageId) : 0,
                title: pageTitle,
                content: pageContent,
                timestamp: pageTimestamp,
                size: pageContent.length
              });
            } else {
              logger.info(`页面 "${title}" 不存在或无法访问`);
              resolve(null); // 页面不存在
            }
          } catch (parseError) {
            logger.error(`解析页面数据时出错: ${parseError}`);
            logger.error(`解析错误详情: ${JSON.stringify(parseError)}`);
            logger.error(`原始响应: ${JSON.stringify(info).substring(0, 500)}...`);
            reject(new Error(`Failed to parse page data: ${parseError}`));
          }
        });
      } catch (error) {
        logger.error(`获取页面时发生异常: ${error}`);
        logger.error(`异常详情: ${JSON.stringify(error)}`);
        reject(new Error(`Exception while getting page: ${error}`));
      }
    });
  }

  /**
   * 搜索页面
   */
  async searchPages(query: string, limit: number = 10): Promise<WikiPage[]> {
    // 确保已登录
    await this.login();
    
    return new Promise<WikiPage[]>((resolve, reject) => {
      this.client.search(query, (err: Error, results: any[]) => {
        if (err) {
          reject(new Error(`Search failed: ${err.message}`));
          return;
        }

        // 限制结果数量
        const limitedResults = results ? results.slice(0, limit) : [];
        
        // 转换为 WikiPage 格式
        const pages = limitedResults.map(result => ({
          pageid: result.pageid || 0,
          title: result.title || '',
          size: result.size || 0
        }));

        resolve(pages);
      });
    });
  }

  /**
   * 创建或编辑页面
   */
  async editPage(title: string, content: string, summary: string = ''): Promise<void> {
    // 确保已登录
    await this.login();

    return new Promise<void>((resolve, reject) => {
      this.client.edit(title, content, summary, (err: Error) => {
        if (err) {
          reject(new Error(`Failed to edit page: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 获取最近更改
   */
  async getRecentChanges(limit: number = 10): Promise<WikiPage[]> {
    // 确保已登录
    await this.login();
    
    return new Promise<WikiPage[]>((resolve, reject) => {
      this.client.getRecentChanges(limit, (err: Error, changes: any[]) => {
        if (err) {
          reject(new Error(`Failed to get recent changes: ${err.message}`));
          return;
        }

        const pages = changes ? changes.map(change => ({
          pageid: change.pageid || 0,
          title: change.title || '',
          timestamp: change.timestamp || new Date().toISOString(),
          size: change.newlen || 0
        })) : [];

        resolve(pages);
      });
    });
  }
}

// 定义可用的 wiki 配置
const wikiConfigs: { [key: string]: WikiConfig } = {
  wikipedia: {
    apiUrl: process.env.WIKIPEDIA_API_URL || 'https://zh.wikipedia.org/w/api.php',
    username: process.env.WIKIPEDIA_USERNAME,
    password: process.env.WIKIPEDIA_PASSWORD
  },
  Jthou: {
    apiUrl: process.env.JTHOU_API_URL || 'http://www.jthou.com/mediawiki/api.php',
    username: process.env.JTHOU_USERNAME,
    password: process.env.JTHOU_PASSWORD
  }
};

// 打印环境变量，用于调试
logger.info(`JTHOU_API_URL: ${process.env.JTHOU_API_URL}`);
logger.info(`JTHOU_USERNAME: ${process.env.JTHOU_USERNAME}`);
logger.info(`JTHOU_PASSWORD: ${process.env.JTHOU_PASSWORD ? '已设置' : '未设置'}`);

// 创建 MediaWiki 客户端实例映射
const wikiClients: { [key: string]: MediaWikiClient } = {};
for (const [name, config] of Object.entries(wikiConfigs)) {
  wikiClients[name] = new MediaWikiClient(config);
}

// 默认使用 Jthou 客户端
const wikiClient = wikiClients.Jthou;

// Cache for pages
const pageCache: { [title: string]: WikiPage } = {};

/**
 * Create MCP server with MediaWiki capabilities
 */
// 创建服务器实例
const server = new Server(
  {
    name: "mediawiki-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {
        listChanged: true,
        subscribe: false
      },
      tools: {
        listChanged: true
      }
    }
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
            wiki: {
              type: "string",
              description: "Wiki to search in (wikipedia, Jthou)",
              enum: ["wikipedia", "Jthou"]
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 10)",
              default: 10
            }
          },
          required: ["query", "wiki"]
        }
      },
      {
        name: "get_pages_wikipedia",
        description: "Get content of a specific Wikipedia page (no login required)",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Page title"
            },
            limit: {
              type: "number",
              description: "Maximum content length (default: 10000)",
              default: 10000
            }
          },
          required: ["title"]
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
            },
            wiki: {
              type: "string",
              description: "Wiki to get page from (wikipedia, Jthou)",
              enum: ["wikipedia", "Jthou"]
            }
          },
          required: ["title", "wiki"]
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
            wiki: {
              type: "string",
              description: "Wiki to edit page in (wikipedia, Jthou)",
              enum: ["wikipedia", "Jthou"]
            },
            summary: {
              type: "string",
              description: "Edit summary",
              default: "Updated via MCP"
            }
          },
          required: ["title", "content", "wiki"]
        }
      },
      {
        name: "get_recent_changes",
        description: "Get recent changes from MediaWiki",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki to get changes from (wikipedia, Jthou)",
              enum: ["wikipedia", "Jthou"]
            },
            limit: {
              type: "number",
              description: "Maximum number of changes (default: 10)",
              default: 10
            }
          },
          required: ["wiki"]
        }
      },
      {
        name: "list_wikis",
        description: "List all available MediaWiki instances",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "test_connection",
        description: "Test the connection between MCP server and client",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Optional message to echo back",
              default: "Hello from client"
            }
          }
        }
      },
      {
        name: "get_crisis_document",
        description: "Get a crisis document from the server",
        inputSchema: {
          type: "object",
          properties: {
            crisis_type: {
              type: "string",
              description: "Type of crisis (natural, political, economic, social)",
              enum: ["natural", "political", "economic", "social"]
            },
            severity: {
              type: "number",
              description: "Severity level (1-5)",
              minimum: 1,
              maximum: 5
            }
          },
          required: ["crisis_type"]
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
    const toolName = request.params.name;
    logger.info(`CallTool: ${toolName} params: ${JSON.stringify(request.params.arguments || {})}`);
    
    if (toolName === "get_pages_wikipedia") {
      logger.info(`收到 get_pages_wikipedia 工具调用请求: ${JSON.stringify(request.params)}`);
      
      try {
        // 检查参数
        if (!request.params.arguments) {
          logger.error(`get_pages_wikipedia 工具调用缺少参数`);
          return {
            content: [{
              type: "text",
              text: `错误: get_pages_wikipedia 工具调用缺少参数`
            }]
          };
        }
        
        const title = String(request.params.arguments?.title || "");
        const limit = Number(request.params.arguments?.limit) || 10000;
        
        logger.info(`处理 get_pages_wikipedia 工具调用: title="${title}", limit=${limit}`);
        
        if (!title) {
          logger.error(`get_pages_wikipedia 工具调用缺少 title 参数`);
          return {
            content: [{
              type: "text",
              text: `错误: 缺少页面标题参数`
            }]
          };
        }
        
        // 获取Wikipedia客户端
        const client = wikiClients["wikipedia"];
        logger.info(`使用 wikipedia 客户端获取页面`);
        
        logger.info(`开始获取页面 "${title}"`);
        const fetchedPage = await client.getPage(title);
        
        if (!fetchedPage) {
          logger.info(`页面 "${title}" 在维基百科中未找到`);
          return {
            content: [{
              type: "text",
              text: `页面 "${title}" 在维基百科中未找到`
            }]
          };
        }

        // 缓存页面
        pageCache[title] = fetchedPage;
        logger.info(`成功获取并缓存页面 "${title}"，大小: ${fetchedPage.size} 字节`);

        // 限制内容长度
        let content = fetchedPage.content || "";
        if (content.length > limit) {
          content = content.substring(0, limit) + `\n\n... (内容已截断，完整内容共 ${content.length} 字符)`;
        }

        // 返回页面内容
        const response = {
          content: [{
            type: "text",
            text: `页面: ${fetchedPage.title}\n大小: ${fetchedPage.size} 字节\n最后修改: ${fetchedPage.timestamp}\n\n内容:\n${content}`
          }]
        };
        
        logger.info(`返回 get_pages_wikipedia 响应: ${JSON.stringify(response).substring(0, 100)}...`);
        return response;
      } catch (error) {
        logger.error(`获取维基百科页面失败，错误详情:`, error);
        logger.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈'}`);
        return {
          content: [{
            type: "text",
            text: `获取维基百科页面时出错: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
    else if (toolName === "search_pages") {
      const query = String(request.params.arguments?.query);
      const limit = Number(request.params.arguments?.limit) || 10;
      const wiki = String(request.params.arguments?.wiki) || "wikipedia";
      
      // 获取指定 wiki 的客户端
      const client = wikiClients[wiki] || wikiClient;
      
      const results = await client.searchPages(query, limit);
      
      return {
        content: [{
          type: "text",
          text: `Found ${results.length} pages in ${wiki}:\n\n` + 
                results.map(page => `- ${page.title} (${page.size} bytes)`).join('\n')
        }]
      };
    }
    else if (toolName === "get_page") {
      logger.info(`收到 get_page 工具调用请求: ${JSON.stringify(request.params)}`);
      
      try {
        // 检查参数
        if (!request.params.arguments) {
          logger.error(`get_page 工具调用缺少参数`);
          return {
            content: [{
              type: "text",
              text: `Error: Missing arguments for get_page tool`
            }]
          };
        }
        
        const title = String(request.params.arguments?.title || "");
        const wiki = String(request.params.arguments?.wiki || "wikipedia");
        
        logger.info(`处理 get_page 工具调用: title="${title}", wiki="${wiki}"`);
        
        if (!title) {
          logger.error(`get_page 工具调用缺少 title 参数`);
          return {
            content: [{
              type: "text",
              text: `Error: Missing title parameter for get_page tool`
            }]
          };
        }
        
        // 获取指定 wiki 的客户端
        const client = wikiClients[wiki] || wikiClient;
        logger.info(`使用 ${wiki} 客户端获取页面`);
        
        // 确保客户端已登录
        logger.info(`确保客户端已登录`);
        await client.login();
        
        logger.info(`开始获取页面 "${title}"`);
        const fetchedPage = await client.getPage(title);
        
        if (!fetchedPage) {
          logger.info(`页面 "${title}" 在 ${wiki} 中未找到`);
          return {
            content: [{
              type: "text",
              text: `Page "${title}" not found in ${wiki}`
            }]
          };
        }

        // 缓存页面
        pageCache[title] = fetchedPage;
        logger.info(`成功获取并缓存页面 "${title}"，大小: ${fetchedPage.size} 字节`);

        // 返回页面内容
        const response = {
          content: [{
            type: "text",
            text: `Page: ${fetchedPage.title} (${wiki})\nSize: ${fetchedPage.size} bytes\nLast modified: ${fetchedPage.timestamp}\n\nContent:\n${fetchedPage.content}`
          }]
        };
        
        logger.info(`返回 get_page 响应: ${JSON.stringify(response).substring(0, 100)}...`);
        return response;
      } catch (error) {
        logger.error(`获取页面失败，错误详情:`, error);
        logger.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈'}`);
        return {
          content: [{
            type: "text",
            text: `Error getting page: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
    else if (toolName === "edit_page") {
      const title = String(request.params.arguments?.title);
      const content = String(request.params.arguments?.content);
      const summary = String(request.params.arguments?.summary) || "Updated via MCP";
      const wiki = String(request.params.arguments?.wiki) || "wikipedia";
      
      // 获取指定 wiki 的客户端
      const client = wikiClients[wiki] || wikiClient;

      // 确保已经认证
      await client.login();
      
      await client.editPage(title, content, summary);
      
      // 清除此页面的缓存
      delete pageCache[title];

      return {
        content: [{
          type: "text",
          text: `Successfully edited page "${title}" in ${wiki}`
        }]
      };
    }
    else if (toolName === "get_recent_changes") {
      const limit = Number(request.params.arguments?.limit) || 10;
      const wiki = String(request.params.arguments?.wiki) || "wikipedia";
      
      // 获取指定 wiki 的客户端
      const client = wikiClients[wiki] || wikiClient;
      
      const changes = await client.getRecentChanges(limit);
      
      return {
        content: [{
          type: "text",
          text: `Recent changes in ${wiki} (${changes.length} items):\n\n` +
                changes.map(change => `- ${change.title} (${change.size} bytes) - ${change.timestamp}`).join('\n')
        }]
      };
    }
    else if (toolName === "list_wikis") {
      // 列出所有可用的 wiki 实例
      const wikis = Object.keys(wikiConfigs);
      
      return {
        content: [{
          type: "text",
          text: `Available MediaWiki instances (${wikis.length}):\n\n` +
                wikis.map(wiki => {
                  const config = wikiConfigs[wiki];
                  return `- ${wiki}: ${config.apiUrl}${config.username ? ' (authenticated)' : ' (anonymous)'}`;
                }).join('\n')
        }]
      };
    }
    else if (toolName === "test_connection") {
      // 测试连接工具，简单地返回一个响应
      const message = String(request.params.arguments?.message || "Hello from client");
      logger.info(`收到测试连接请求，消息: "${message}"`);
      
      return {
        content: [{
          type: "text",
          text: `连接测试成功！服务器收到消息: "${message}"\n\n响应时间: ${new Date().toISOString()}\n服务器状态: 正常运行中`
        }]
      };
    }
    else if (toolName === "get_crisis_document") {
      // 危机文档工具，返回一个模拟的危机文档
      const crisisType = String(request.params.arguments?.crisis_type || "natural");
      const severity = Number(request.params.arguments?.severity || 3);
      
      logger.info(`收到危机文档请求，类型: "${crisisType}", 严重程度: ${severity}`);
      
      // 根据危机类型和严重程度生成不同的文档
      let documentTitle = "";
      let documentContent = "";
      let responseLevel = "";
      let actionItems = [];
      
      switch (crisisType) {
        case "natural":
          documentTitle = `自然灾害应急预案 (等级 ${severity})`;
          responseLevel = severity >= 4 ? "紧急" : (severity >= 2 ? "警戒" : "观察");
          
          if (severity >= 4) {
            documentContent = `## 特大型自然灾害应急响应方案\n\n当前状态: **${responseLevel}**\n\n本文档详细说明了在面对特大型自然灾害时的应急响应流程、资源调配和指挥系统。`;
            actionItems = [
              "立即启动国家级应急响应机制",
              "调动军队和应急救援队伍",
              "疏散受影响地区居民",
              "建立临时避难所和医疗中心",
              "启动国际救援请求程序"
            ];
          } else if (severity >= 2) {
            documentContent = `## 中型自然灾害应急响应方案\n\n当前状态: **${responseLevel}**\n\n本文档概述了应对中型自然灾害的标准操作流程和资源协调方案。`;
            actionItems = [
              "启动省级应急响应机制",
              "调动地方应急救援队伍",
              "准备疏散计划",
              "设立临时指挥中心",
              "监控灾情发展"
            ];
          } else {
            documentContent = `## 小型自然灾害监测方案\n\n当前状态: **${responseLevel}**\n\n本文档提供了对小型自然灾害的监测指南和初步响应建议。`;
            actionItems = [
              "密切监测灾情发展",
              "准备应急物资",
              "检查应急设备",
              "通知相关部门待命",
              "更新应急联系人名单"
            ];
          }
          break;
          
        case "political":
          documentTitle = `政治危机应对策略 (等级 ${severity})`;
          responseLevel = severity >= 4 ? "国家安全威胁" : (severity >= 2 ? "重大关切" : "需要关注");
          
          if (severity >= 4) {
            documentContent = `## 重大政治危机应对方案\n\n安全级别: **${responseLevel}**\n\n本文档详细说明了在面对重大政治危机时的国家安全保障措施和外交应对策略。`;
            actionItems = [
              "召开国家安全委员会紧急会议",
              "启动外交渠道进行危机沟通",
              "准备多种应对预案",
              "加强关键基础设施保护",
              "组建跨部门危机应对小组"
            ];
          } else if (severity >= 2) {
            documentContent = `## 中等政治危机应对方案\n\n安全级别: **${responseLevel}**\n\n本文档概述了应对中等政治危机的标准操作流程和沟通策略。`;
            actionItems = [
              "密切监控事态发展",
              "准备官方声明和立场文件",
              "与相关国家和组织保持沟通",
              "评估潜在影响和风险",
              "制定媒体沟通策略"
            ];
          } else {
            documentContent = `## 轻微政治事件监测方案\n\n安全级别: **${responseLevel}**\n\n本文档提供了对轻微政治事件的监测指南和初步评估建议。`;
            actionItems = [
              "常规监测相关动态",
              "收集相关信息和分析",
              "更新情况简报",
              "保持内部沟通渠道畅通",
              "准备必要的背景资料"
            ];
          }
          break;
          
        case "economic":
          documentTitle = `经济危机应对方案 (等级 ${severity})`;
          responseLevel = severity >= 4 ? "系统性风险" : (severity >= 2 ? "显著风险" : "潜在风险");
          
          if (severity >= 4) {
            documentContent = `## 重大经济危机应对方案\n\n风险等级: **${responseLevel}**\n\n本文档详细说明了在面对重大经济危机时的金融稳定措施和经济刺激政策。`;
            actionItems = [
              "召开金融稳定委员会紧急会议",
              "准备实施货币政策干预措施",
              "启动金融市场稳定机制",
              "协调国际金融合作",
              "制定经济刺激计划"
            ];
          } else if (severity >= 2) {
            documentContent = `## 中等经济风险应对方案\n\n风险等级: **${responseLevel}**\n\n本文档概述了应对中等经济风险的监管措施和市场干预策略。`;
            actionItems = [
              "加强市场监测和预警",
              "准备针对性的行业支持政策",
              "评估财政政策调整空间",
              "加强与市场主体沟通",
              "制定风险缓释预案"
            ];
          } else {
            documentContent = `## 经济波动监测方案\n\n风险等级: **${responseLevel}**\n\n本文档提供了对经济波动的监测指南和初步应对建议。`;
            actionItems = [
              "常规监测经济指标",
              "分析潜在风险因素",
              "更新经济形势分析报告",
              "评估政策工具有效性",
              "保持与市场的沟通"
            ];
          }
          break;
          
        case "social":
          documentTitle = `社会危机应对方案 (等级 ${severity})`;
          responseLevel = severity >= 4 ? "严重社会动荡" : (severity >= 2 ? "社会不稳定" : "社会关切");
          
          if (severity >= 4) {
            documentContent = `## 重大社会危机应对方案\n\n状态评估: **${responseLevel}**\n\n本文档详细说明了在面对重大社会危机时的社会稳定措施和公共服务保障策略。`;
            actionItems = [
              "启动社会稳定应急机制",
              "加强重点地区社会治安",
              "建立多方沟通协调机制",
              "确保基本公共服务不中断",
              "制定社会舆情引导方案"
            ];
          } else if (severity >= 2) {
            documentContent = `## 中等社会问题应对方案\n\n状态评估: **${responseLevel}**\n\n本文档概述了应对中等社会问题的沟通策略和服务保障措施。`;
            actionItems = [
              "加强社会动态监测",
              "开展针对性沟通和解释",
              "协调相关部门联动响应",
              "评估潜在扩散风险",
              "准备必要的公共服务保障"
            ];
          } else {
            documentContent = `## 社会关切监测方案\n\n状态评估: **${responseLevel}**\n\n本文档提供了对社会关切问题的监测指南和初步回应建议。`;
            actionItems = [
              "常规监测社会舆情",
              "收集相关信息和分析",
              "更新情况简报",
              "保持与相关社区的沟通",
              "准备必要的回应材料"
            ];
          }
          break;
          
        default:
          documentTitle = "未知类型危机应对方案";
          documentContent = "无法识别的危机类型，请提供有效的危机类型参数。";
          actionItems = ["重新评估危机类型", "联系系统管理员"];
      }
      
      // 构建完整的文档
      const timestamp = new Date().toISOString();
      const documentId = `CRISIS-${crisisType.toUpperCase()}-${severity}-${Date.now().toString(36)}`;
      
      const fullDocument = `# ${documentTitle}\n\n` +
        `文档ID: ${documentId}\n` +
        `生成时间: ${timestamp}\n` +
        `危机类型: ${crisisType}\n` +
        `严重程度: ${severity}/5\n` +
        `响应级别: ${responseLevel}\n\n` +
        `${documentContent}\n\n` +
        `## 行动项目\n\n` +
        actionItems.map((item, index) => `${index + 1}. ${item}`).join('\n') + '\n\n' +
        `## 免责声明\n\n` +
        `本文档仅用于测试MCP服务器和客户端之间的通信，不代表实际的危机应对策略。` +
        `在真实危机情况下，请遵循官方发布的应急预案和指导。`;
      
      return {
        content: [{
          type: "text",
          text: fullDocument
        }]
      };
    }
    else {
      throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
});

/**
 * Start the server
 */
async function main() {
  try {
    // 记录所有可用的 wiki 配置到日志文件
    logger.info(`可用的 Wiki 配置: ${Object.keys(wikiConfigs).join(', ')}`);
    for (const [name, config] of Object.entries(wikiConfigs)) {
      logger.info(`Wiki ${name}: ${config.apiUrl}, 用户名: ${config.username || '未设置'}`);
    }
    
    // 尝试认证（如果提供了凭据）
    logger.info("尝试进行 MediaWiki 认证...");
    await wikiClient.login();
    logger.info("MediaWiki MCP Server authenticated successfully");
    
    // 尝试获取一个测试页面，验证认证是否有效
    try {
      logger.info("测试获取页面以验证认证...");
      const testPage = await wikiClient.getPage("Main Page");
      logger.info(`测试页面获取${testPage ? '成功' : '失败'}, 页面大小: ${testPage?.size || 0}`);
    } catch (testError) {
      logger.error("测试页面获取失败:", testError);
    }
  } catch (error) {
    logger.error("MediaWiki MCP Server starting without authentication:", error);
  }

  // 打印请求处理器信息
  logger.info("注册的请求处理器:");
  for (const [method, handler] of Object.entries(server)) {
    if (typeof handler === 'function' && method.startsWith('_on')) {
      logger.info(`- ${method.substring(3)}`);
    }
  }
  
  // 打印请求模式信息
  logger.info("请求模式:");
  logger.info(`- ListToolsRequestSchema: ${ListToolsRequestSchema}`);
  logger.info(`- CallToolRequestSchema: ${CallToolRequestSchema}`);
  logger.info(`- ListResourcesRequestSchema: ${ListResourcesRequestSchema}`);
  logger.info(`- ReadResourceRequestSchema: ${ReadResourceRequestSchema}`);

  // 打印服务器内部的请求处理器映射
  // @ts-ignore - 访问私有属性
  const requestHandlers = server._requestHandlers;
  if (requestHandlers && requestHandlers instanceof Map) {
    logger.info(`服务器注册的请求处理器映射 (${requestHandlers.size} 个):`);
    for (const [method, handler] of requestHandlers.entries()) {
      logger.info(`- ${method}`);
    }
  } else {
    logger.info("无法访问服务器的请求处理器映射");
  }

  // 初始化 MCP 服务器传输层
  const transport = new StdioServerTransport();
  
  // 连接到传输层
  await server.connect(transport);
  
  // 记录服务器启动信息到日志文件
  logger.info("MediaWiki MCP Server started");
}

main().catch((error) => {
  logger.error(`Server error: ${error}`);
  process.exit(1);
});