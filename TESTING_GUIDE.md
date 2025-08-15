# MediaWiki MCP 服务器测试指南

## 使用 MCP Inspector 测试

访问：http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=8cbd04d87452190fbfb09711f755f40ea4aad85a408f6357aea9c15f65c7adaf

### 1. 基础页面读取测试

**工具**: `get_page`
**参数**:
```json
{
  "title": "Wikipedia"
}
```
**预期结果**: 返回 Wikipedia 主页的完整内容

### 2. 搜索功能测试

**工具**: `search_pages`
**参数**:
```json
{
  "query": "machine learning",
  "limit": 5
}
```
**预期结果**: 返回相关页面列表

### 3. 最近更改测试

**工具**: `get_recent_changes`
**参数**:
```json
{
  "limit": 10
}
```
**预期结果**: 返回最近10个页面更改

### 4. 中文页面测试

**工具**: `get_page`
**参数**:
```json
{
  "title": "人工智能"
}
```
**预期结果**: 返回中文 Wikipedia 页面内容

### 5. 不存在页面测试

**工具**: `get_page`
**参数**:
```json
{
  "title": "ThisPageDoesNotExist12345"
}
```
**预期结果**: 返回页面不存在的错误信息

### 6. 资源访问测试

1. 点击 "Resources" 标签
2. 查看可用资源列表（最近更改的页面）
3. 点击任意资源查看内容

### 7. 编辑功能测试（需要认证）

**注意**: 编辑功能需要设置用户名和密码环境变量

**工具**: `edit_page`
**参数**:
```json
{
  "title": "User:YourUsername/Test",
  "content": "这是一个测试页面\n\n== 标题 ==\n测试内容",
  "summary": "通过 MCP 创建测试页面"
}
```

## 测试不同的 MediaWiki 实例

### Wikipedia（英文）
```bash
export MEDIAWIKI_API_URL="https://en.wikipedia.org/w/api.php"
```

### Wikipedia（中文）
```bash
export MEDIAWIKI_API_URL="https://zh.wikipedia.org/w/api.php"
```

### 私有 MediaWiki
```bash
export MEDIAWIKI_API_URL="https://your-wiki.com/w/api.php"
export MEDIAWIKI_USERNAME="your-username"
export MEDIAWIKI_PASSWORD="your-password"
```

## 常见测试场景

### 场景1：内容研究
1. 搜索相关主题
2. 读取具体页面内容
3. 获取最新信息

### 场景2：监控更改
1. 获取最近更改列表
2. 读取特定更改的页面
3. 跟踪内容变化

### 场景3：内容管理（需要认证）
1. 创建新页面
2. 编辑现有页面
3. 添加编辑摘要

## 故障排除

### 问题1：连接超时
- 检查网络连接
- 确认 API URL 正确

### 问题2：认证失败
- 检查用户名和密码
- 确认账户有编辑权限

### 问题3：页面不存在
- 检查页面标题拼写
- 确认页面在目标 wiki 中存在

### 问题4：权限错误
- 检查账户权限
- 某些页面可能受保护