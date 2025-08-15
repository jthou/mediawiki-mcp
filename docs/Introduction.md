# 1小时11分钟：零经验程序员用 CodeBuddy IDE 完成 MediaWiki MCP 服务器开发

> 作为一个没有 MCP 开发经验的程序员，我通过与 CodeBuddy IDE 中的 AI 助手对话，在1小时11分钟内从零开始完成了一个功能完整的 MediaWiki MCP 服务器。本文记录完整的对话过程和关键 Prompt 技巧。

## 🎯 项目背景

**起始状态**：一个名为 "mediawiki-mcp" 的项目，但实际上是笔记系统的 MCP 模板
**目标**：改造为真正的 MediaWiki MCP 服务器，支持 Wikipedia 页面搜索、读取、编辑
**工具**：CodeBuddy IDE + AI 助手对话
**时间**：1小时11分钟

## 🚀 开发过程：AI 对话驱动的编程

### 第一阶段：项目分析（5分钟）

**我的 Prompt**：
```
总结整个项目
```

**AI 的发现**：
- 项目名为 "mediawiki-mcp" 但实际是笔记系统模板
- 与 MediaWiki 功能完全不符
- 需要完全重构

**关键学习**：让 AI 先分析现状，而不是直接开始编码。

### 第二阶段：需求确认（3分钟）

**我的 Prompt**：
```
用户要求将其改造为真正的 MediaWiki MCP 服务器，实现页面读取、编辑、创建等 MediaWiki 操作
```

**AI 的规划**：
1. 替换笔记系统逻辑为 MediaWiki API 调用
2. 实现四个核心工具：search_pages, get_page, edit_page, get_recent_changes
3. 添加中文 Wikipedia 支持
4. 配置代理支持

**关键学习**：明确告诉 AI 具体要实现什么功能。

### 第三阶段：核心代码重构（25分钟）

**我的 Prompt**：
```
开始改造，实现 MediaWiki API 集成
```

**AI 的实现过程**：

1. **创建 MediaWikiClient 类**
```typescript
class MediaWikiClient {
  private axios: AxiosInstance;
  private config: WikiConfig;
  
  constructor(config: WikiConfig) {
    this.config = config;
    this.axios = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
    });
  }
}
```

2. **实现核心方法**
```typescript
async getPage(title: string): Promise<WikiPage | null> {
  const response = await this.axios.get('', {
    params: {
      action: 'query',
      titles: title,
      prop: 'revisions|info',
      rvprop: 'content|timestamp',
      format: 'json'
    }
  });
  // 处理响应...
}
```

3. **注册 MCP 工具**
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_pages",
        description: "Search for MediaWiki pages",
        inputSchema: { /* 参数定义 */ }
      },
      // 其他工具...
    ]
  };
});
```

**关键学习**：AI 能够一次性重构大量代码，但需要明确的指令。

### 第四阶段：环境问题解决（15分钟）

**遇到的问题**：代理环境导致网络连接失败

**我的 Prompt**：
```
用户环境中有代理配置 http://localhost:7890，需要适配
```

**AI 的解决方案**：
```typescript
// 检测代理环境
const proxyUrl = process.env.HTTP_PROXY;
if (proxyUrl && !config.apiUrl.includes('localhost')) {
  const agent = new HttpsProxyAgent(proxyUrl);
  this.axios.defaults.httpsAgent = agent;
}
```

**关键学习**：遇到环境问题时，直接告诉 AI 具体的环境配置。

### 第五阶段：CodeBuddy 集成（8分钟）

**我的 Prompt**：
```
如何在 CodeBuddy IDE 中配置这个 MCP 服务器？
```

**AI 的指导**：
1. 构建项目：`npm run build`
2. 在 CodeBuddy 设置中添加 MCP 服务器配置
3. 配置文件路径和环境变量

**实际配置**：
```json
{
  "name": "mediawiki-mcp",
  "command": "node",
  "args": ["/path/to/mediawiki-mcp/build/index.js"],
  "env": {}
}
```

### 第六阶段：功能验证（10分钟）

**我的 Prompt**：
```
读取 https://zh.wikipedia.org/zh-cn/同时定位与地图构建 这个页面的内容
```

**AI 的操作**：
使用已安装的 MCP 服务器调用 `get_page` 工具，成功读取页面内容。

**验证结果**：
- ✅ 页面读取功能正常
- ✅ 中文 Wikipedia 支持
- ✅ 代理环境下正常工作

### 第七阶段：项目优化（5分钟）

**我的 Prompt**：
```
哪些文件不是项目必要的？
```

**AI 的分析和清理**：
- 删除测试文件：`test-*.mjs`, `manual-test.*`
- 删除调试脚本：`*.sh`
- 删除配置示例：`claude-desktop-config.json`
- 保留核心文件：`src/index.ts`, `package.json`, `README.md` 等

## 💡 关键 Prompt 技巧

### 1. 项目分析型 Prompt
```
总结整个项目
查看当前项目，哪些文件不是项目必要的？
```
**效果**：让 AI 先理解现状，再制定计划

### 2. 功能需求型 Prompt
```
用户要求将其改造为真正的 MediaWiki MCP 服务器
实现页面读取、编辑、创建等 MediaWiki 操作
```
**效果**：明确告诉 AI 要实现什么功能

### 3. 环境适配型 Prompt
```
用户环境中有代理配置 http://localhost:7890，需要适配
如何在 CodeBuddy IDE 中配置这个 MCP 服务器？
```
**效果**：让 AI 解决特定环境问题

### 4. 验证测试型 Prompt
```
读取 https://zh.wikipedia.org/zh-cn/同时定位与地图构建 这个页面的内容
```
**效果**：直接测试功能是否正常

### 5. 项目管理型 Prompt
```
检查项目所有文件，查看有没有开发者个人信息泄露的情况
整理对话历史，总结对话过程
```
**效果**：让 AI 帮助项目管理和文档整理

## 🛠️ CodeBuddy IDE 的优势

### 1. 无缝集成开发环境
- 直接在 IDE 中与 AI 对话
- AI 可以直接操作文件和执行命令
- 实时查看代码变化

### 2. 上下文感知能力
- AI 能够理解整个项目结构
- 记住之前的对话内容
- 根据项目状态调整建议

### 3. 多工具协作
- 文件读写、命令执行、代码分析
- MCP 服务器直接集成测试
- Git 操作和项目管理

## ⚡ 开发效率分析

### 时间分配：
- **项目分析**：5分钟
- **需求确认**：3分钟  
- **核心代码重构**：25分钟
- **环境问题解决**：15分钟
- **CodeBuddy 集成**：8分钟
- **功能验证**：10分钟
- **项目优化**：5分钟

**总计**：1小时11分钟

### 效率关键因素：

1. **AI 驱动的代码生成**
   - 不需要从零写样板代码
   - AI 理解 MCP 协议和 MediaWiki API
   - 自动处理类型定义和错误处理

2. **智能问题解决**
   - AI 能识别环境问题并提供解决方案
   - 自动适配代理配置
   - 提供最佳实践建议

3. **集成开发环境**
   - 无需切换工具
   - 实时测试和验证
   - 直接部署到 CodeBuddy

## 🎯 对程序员的启示

### 1. AI 辅助编程的新模式
- **不是替代编程**，而是**加速编程**
- **重点在于提出正确的问题**，而不是写代码
- **AI 负责实现**，**人负责设计和验证**

### 2. Prompt 工程的重要性
- 清晰的需求描述比复杂的技术实现更重要
- 分步骤的对话比一次性的长指令更有效
- 具体的问题比抽象的要求更容易得到好结果

### 3. 新技能学习的加速
- 零经验也能快速上手新技术
- AI 提供最佳实践和避坑指南
- 通过实际项目学习比看文档更高效

## 🚀 复制这个成功模式

### 适用场景：
- **API 集成项目**：各种第三方服务集成
- **工具开发**：CLI 工具、自动化脚本
- **原型开发**：快速验证想法和概念
- **学习新技术**：通过实际项目掌握新框架

### 关键步骤：
1. **让 AI 分析现状**：`总结整个项目`
2. **明确需求目标**：`实现 XXX 功能`
3. **分步骤实现**：每次专注一个问题
4. **及时测试验证**：`测试 XXX 功能`
5. **优化和清理**：`哪些文件不必要？`

### 成功要素：
- **明确的沟通**：告诉 AI 你想要什么
- **渐进式开发**：一步一步来，不要贪多
- **及时反馈**：遇到问题立即提出
- **善用工具**：充分利用 IDE 的集成能力

## 📊 项目成果

**最终交付**：
- ✅ 功能完整的 MediaWiki MCP 服务器
- ✅ 支持中文 Wikipedia 和代理环境
- ✅ 在 CodeBuddy IDE 中正常运行
- ✅ 完整的文档和项目结构
- ✅ GitHub 开源项目

**技术栈**：
- TypeScript + Node.js
- Model Context Protocol (MCP)
- MediaWiki API
- Axios HTTP 客户端

**项目地址**：https://github.com/jthou/mediawiki-mcp.git

## 🏆 总结

作为一个零 MCP 开发经验的程序员，通过与 CodeBuddy IDE 中的 AI 助手对话，我在1小时11分钟内完成了一个完整的 MediaWiki MCP 服务器开发。

**关键成功因素**：
1. **正确的工具选择**：CodeBuddy IDE 提供了完整的 AI 辅助开发环境
2. **有效的沟通方式**：通过清晰的 Prompt 与 AI 协作
3. **渐进式开发**：分步骤解决问题，及时验证结果
4. **充分利用 AI**：让 AI 处理技术细节，人专注于需求和设计

这种开发模式展示了 AI 时代程序员工作方式的变化：**从写代码到设计和指导**，从**技术实现者到产品架构师**。

对于想要快速学习新技术或提高开发效率的程序员来说，掌握与 AI 协作的技巧将成为一项重要的核心竞争力。

---

*这不仅是一次技术实践，更是对未来编程模式的探索。*