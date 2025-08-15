# MediaWiki MCP Server

一个基于 TypeScript 的 MCP 服务器，用于读取和写入 MediaWiki 页面。提供了完整的 MediaWiki API 集成，支持页面搜索、读取、编辑和监控功能。

## 功能特性

### 资源 (Resources)
- 通过 `wiki://` URI 方案访问 MediaWiki 页面
- 自动列出最近更改的页面作为可用资源
- 支持页面内容的纯文本访问
- 智能缓存机制提高性能

### 工具 (Tools)
- `search_pages` - 搜索 MediaWiki 页面
  - 支持全文搜索
  - 可配置结果数量限制
- `get_page` - 获取特定页面内容
  - 返回完整的页面内容和元数据
  - 包含页面大小和最后修改时间
- `edit_page` - 创建或编辑页面（需要认证）
  - 支持 wikitext 格式
  - 可自定义编辑摘要
- `get_recent_changes` - 获取最近更改
  - 监控 wiki 的最新活动
  - 可配置返回条目数量

## 配置

### 环境变量
设置以下环境变量来配置 MediaWiki 连接：

```bash
# MediaWiki API 端点（必需）
export MEDIAWIKI_API_URL="https://your-wiki.com/w/api.php"

# 认证信息（编辑功能需要）
export MEDIAWIKI_USERNAME="your-username"
export MEDIAWIKI_PASSWORD="your-password"
```

### 支持的 MediaWiki 实例
- Wikipedia（只读访问）
- 私有 MediaWiki 安装
- Fandom/Wikia 站点
- 其他兼容 MediaWiki API 的站点

## 安装和开发

安装依赖：
```bash
npm install
```

构建服务器：
```bash
npm run build
```

开发模式（自动重建）：
```bash
npm run watch
```

## 部署配置

### Claude Desktop 配置

在 macOS 上编辑：`~/Library/Application Support/Claude/claude_desktop_config.json`
在 Windows 上编辑：`%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mediawiki-mcp": {
      "command": "/path/to/mediawiki-mcp/build/index.js",
      "env": {
        "MEDIAWIKI_API_URL": "https://your-wiki.com/w/api.php",
        "MEDIAWIKI_USERNAME": "your-username",
        "MEDIAWIKI_PASSWORD": "your-password"
      }
    }
  }
}
```

### 只读配置示例（Wikipedia）
```json
{
  "mcpServers": {
    "wikipedia-mcp": {
      "command": "/path/to/mediawiki-mcp/build/index.js",
      "env": {
        "MEDIAWIKI_API_URL": "https://en.wikipedia.org/w/api.php"
      }
    }
  }
}
```

## 使用示例

### 搜索页面
```
搜索关于"人工智能"的页面
```

### 读取页面内容
```
获取"Machine Learning"页面的内容
```

### 编辑页面（需要认证）
```
在我的 wiki 上创建一个新页面，标题为"测试页面"，内容为"这是一个测试页面"
```

### 监控最近更改
```
显示最近的10个页面更改
```

## 安全注意事项

- 编辑功能需要有效的 MediaWiki 账户凭据
- 建议为 MCP 使用专门的机器人账户
- 在生产环境中使用环境变量存储敏感信息
- 某些 MediaWiki 实例可能有 API 速率限制

## 调试

由于 MCP 服务器通过 stdio 通信，调试可能比较困难。推荐使用 [MCP Inspector](https://github.com/modelcontextprotocol/inspector)：

```bash
npm run inspector
```

Inspector 会提供一个 URL，在浏览器中打开即可使用调试工具。

## 错误处理

服务器包含完整的错误处理机制：
- 网络连接错误
- 认证失败
- 页面不存在
- API 限制和权限问题
- 无效的 wikitext 格式

## 技术架构

- **语言**: TypeScript
- **运行时**: Node.js (ES2022)
- **HTTP 客户端**: Axios
- **协议**: Model Context Protocol (MCP)
- **通信**: 标准输入/输出流

## 许可证

本项目遵循 MIT 许可证。