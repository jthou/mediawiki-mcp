# MediaWiki MCP Server

一个基于 Model Context Protocol (MCP) 的 MediaWiki 服务器，为 AI 助手提供搜索、读取和编辑 MediaWiki 页面的能力。

## 功能特性

- **页面搜索**: 使用关键词搜索 MediaWiki 页面
- **获取页面内容**: 检索特定页面的完整内容
- **编辑页面**: 创建或修改 MediaWiki 页面（需要认证）
- **最近更改**: 获取 wiki 的最近更改记录
- **多语言支持**: 支持任何 MediaWiki 实例（Wikipedia、自定义 wiki）
- **代理支持**: 可配置 HTTP 代理支持

---

## 第一部分：部署与使用

### 环境要求

- Node.js 18+
- npm 或 yarn

### 快速安装

1. 克隆或下载此仓库
2. 安装依赖：
   ```bash
   npm install
   ```
3. 构建项目：
   ```bash
   npm run build
   ```

### 环境配置

创建 `.env` 文件（可选）：

```env
# MediaWiki API 端点（默认：中文维基百科）
MEDIAWIKI_API_URL=https://zh.wikipedia.org/w/api.php

# 可选：HTTP 代理配置
HTTP_PROXY=http://localhost:7890
HTTPS_PROXY=http://localhost:7890

# 可选：认证信息（用于编辑功能）
MEDIAWIKI_USERNAME=your_username
MEDIAWIKI_PASSWORD=your_password
```

### 在 Tencent CodeBuddy IDE 中使用

1. **打开 MCP 设置**
   - 在 CodeBuddy 中，点击设置 → MCP 服务器

2. **添加 MediaWiki MCP 服务器**
   ```json
   {
     "name": "mediawiki-mcp",
     "command": "node",
     "args": ["/path/to/mediawiki-mcp/build/index.js"],
     "env": {}
   }
   ```

3. **启用服务器**
   - 保存配置后，服务器将自动启动
   - 在 AI 对话中即可使用 MediaWiki 功能

### 在 VS Code 中使用

1. **安装 MCP 扩展**
   - 安装支持 MCP 的 AI 扩展（如 Claude、Codeium 等）

2. **配置 MCP 服务器**
   
   在 VS Code 设置中添加：
   ```json
   {
     "mcp.servers": {
       "mediawiki-mcp": {
         "command": "node",
         "args": ["/absolute/path/to/mediawiki-mcp/build/index.js"]
       }
     }
   }
   ```

3. **使用功能**
   - 重启 VS Code
   - 在 AI 助手中使用 MediaWiki 相关命令

### 可用工具

| 工具名称 | 功能 | 参数 |
|---------|------|------|
| `search_pages` | 搜索页面 | `query`(必需), `limit`(可选) |
| `get_page` | 获取页面内容 | `title`(必需) |
| `edit_page` | 编辑页面 | `title`(必需), `content`(必需), `summary`(可选) |
| `get_recent_changes` | 获取最近更改 | `limit`(可选) |

### 使用示例

```
搜索人工智能相关页面：
- 工具：search_pages
- 查询：人工智能
- 限制：5

获取特定页面内容：
- 工具：get_page
- 标题：机器学习

编辑页面：
- 工具：edit_page
- 标题：我的测试页面
- 内容：这是 wikitext 格式的页面内容
- 摘要：更新内容
```

### 支持的 MediaWiki 实例

- Wikipedia（所有语言版本）
- Wikimedia 项目（Wiktionary、Wikiquote 等）
- 自定义 MediaWiki 安装
- 企业 MediaWiki 实例

---

## 第二部分：开发与测试配置

### 开发环境设置

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd mediawiki-mcp
   ```

2. **安装开发依赖**
   ```bash
   npm install
   ```

3. **开发模式构建**
   ```bash
   npm run build
   # 或监听模式
   npm run build -- --watch
   ```

### 项目结构

```
mediawiki-mcp/
├── src/
│   └── index.ts          # 主服务器实现
├── build/
│   └── index.js          # 编译后的 JavaScript
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── .gitignore           # Git 忽略规则
├── README.md            # 项目文档
└── TESTING_GUIDE.md     # 测试指南
```

### 测试配置

#### 1. 基础功能测试

```bash
# 测试服务器基本功能
node -e "
const { MediaWikiClient } = require('./build/index.js');
const client = new MediaWikiClient();
client.searchPages('人工智能', 3).then(console.log);
"
```

#### 2. 中文页面测试

```bash
# 测试中文维基百科页面读取
node -e "
const { MediaWikiClient } = require('./build/index.js');
const client = new MediaWikiClient();
client.getPage('人工智能').then(result => {
  console.log('标题:', result.title);
  console.log('内容长度:', result.content.length);
});
"
```

#### 3. MCP Inspector 调试

```bash
# 启动 MCP Inspector（用于调试）
npx @modelcontextprotocol/inspector node build/index.js
```

### 代理环境配置

如果在需要代理的环境中开发：

```bash
# 设置代理环境变量
export HTTP_PROXY=http://localhost:7890
export HTTPS_PROXY=http://localhost:7890

# 构建和测试
npm run build
```

### 调试模式

启用详细日志：

```bash
DEBUG=mediawiki-mcp node build/index.js
```

### 常见开发问题

1. **TypeScript 编译错误**
   - 检查 `tsconfig.json` 配置
   - 确保所有依赖已安装

2. **代理连接问题**
   - 验证代理服务器是否运行
   - 检查代理 URL 格式
   - 确认 localhost 是否需要绕过代理

3. **MCP 协议调试**
   - 使用 MCP Inspector 工具
   - 检查 JSON-RPC 消息格式
   - 验证工具参数类型

### 故障排除

#### 常见问题

1. **连接超时**
   - 检查网络连接
   - 验证代理设置
   - 确保 MediaWiki API URL 正确

2. **认证错误**
   - 验证用户名和密码
   - 检查 MediaWiki 实例是否需要特殊认证

3. **代理问题**
   - 确保代理服务器正在运行
   - 验证代理 URL 格式
   - 检查 localhost 是否应绕过代理

### 贡献指南

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m "Add new feature"`
4. 推送分支：`git push origin feature/new-feature`
5. 创建 Pull Request

## 许可证

MIT License - 详见 LICENSE 文件

## 技术支持

如有问题或疑问：
- 查看故障排除部分
- 参考 TESTING_GUIDE.md 中的详细测试示例
- 在项目仓库中提交 issue