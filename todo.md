- **总则，在执行后续任何任务之前，先完成以下操作：**
   - **🗂️ 项目管理规范**
     - 在新的 git 分支下执行任务，分支名称为 task1, task2, ...
     - 在执行新任务前，先执行之前所有测试脚本，确保全部通过
     - 新任务结束后，保留新任务测试脚本
     - 提交代码前，执行完整回归测试
   - **🧪 测试脚本规范**
     - 当前目录下 ./test 目录是测试脚本目录
     - 每个任务都有对应测试脚本：./test/task1.sh, ./test/task2.sh 等
     - 测试脚本可以是任何格式：bash, python, js, cjs 等
   - **🔄 TDD开发流程**
     - **阶段1 - 需求澄清**：创建测试文件，明确输入输出和边界条件
     - **阶段2 - 基础框架**：搭建工具schema和函数框架，实现基本逻辑
     - **阶段3 - 测试驱动**：写详细测试用例（功能、边界、异常、集成）
     - **阶段4 - 实现完善**：完成核心算法，让所有测试通过
     - **阶段5 - 重构优化**：在测试保护下优化代码结构和性能
   - **⚠️ Git分支管理规范**
     - 禁止擅自删除开发分支（如 task1, task2, task3 等）
     - 分支删除操作必须先征得明确同意
     - 保留所有历史开发分支用于追溯和回滚
- [x] 任务1：添加list_wikis工具
  -  创建基本的mcp-server，加上一个list_wikis的tool
  - 试用test_mcp_server.sh测试，能正确返回wikis列表:
     - wikipedia.org ✅ 已完成
- [x] 任务2：清理开发环境，保持干净的开发环境
   - 去掉那些尚未通过验证的工具，仅保留list_wikis这一个工具；
   - 用test_mcp_server.sh去检查，确保list_wikis能正常运行；
   - 删除不需要的文件；
- [x] 任务3：使用 nodemw 添加 get_page 工具
   - ✅ 安装并引入 nodemw
   - ✅ 在配置中添加认证字段，专注于 Jthou wiki 支持（移除 Wikipedia 支持）
   - ✅ 在 src/index.ts 中定义 MediaWikiClient 类并实现 login 和 getPage 方法
   - ✅ 在 ListToolsRequestSchema 中添加 get_page 工具定义
   - ✅ 重构代码：将处理逻辑拆分为独立函数（handleListWikis, handleGetPage）
   - ✅ 使用 switch 语句替代 if/else 链，提高代码可扩展性
   - ✅ 添加命令行参数 -f 支持，允许指定自定义 .env 文件路径
   - ✅ 集成 dotenv 支持，从环境文件加载配置
   - ✅ 修改 test_mcp_server.sh 增加 get_page 测试用例，验证 list_wikis 工具不被破坏
   - ✅ 如果获取页面成功：
     - 在当前目录下创建 .jthou_wiki 目录（专门用于 Jthou wiki 内容）
     - 以页面标题为文件名创建 .txt 文件，写入页面内容；若目录已存在，覆盖同名文件
   - ✅ 如果获取页面失败：
     - 输出详细错误提示
     - 不创建目录或文件
   - ✅ 更新 VS Code MCP 配置，支持 -f 参数
   - ✅ 完成代码重构，提高可维护性和扩展性
- [x] 任务4：使用 nodemw 添加 update_page 工具
   - ✅ 在 src/index.ts 中的 MediaWikiClient 定义 updatePage 方法
   - ✅ 修改 ListToolsRequestSchema，添加 update_page 工具定义
   - ✅ 创建 test/task4.sh 测试脚本
   - ✅ 测试：
      - ✅ 用工具 get_page 获取 test2 页面
      - ✅ 修改 test2 页面内容
      - ✅ 用 update_page 工具更新 test2 页面 (生成修订版本 96401)
      - ✅ 再次用 get_page 获取 test2 页面，验证内容已更新
   - ✅ 通过完整回归测试 (task1-4 全部通过)
- [x] 任务5: 使用 nodemw 添加 search_pages 工具
   - [x] **前置准备**：
     - [x] 在新的 git 分支 task5 下执行任务
     - [x] 执行回归测试：运行 task1.sh, task2.sh, task3.sh, task4.sh，确保全部通过
   - [x] **代码实现**：
     - [x] 在 MediaWikiClient 类中添加 searchPages 方法
       - [x] 使用 nodemw 的 search 方法实现搜索功能
       - [x] 支持参数：query(搜索词), limit(结果数量), namespace(命名空间)
       - [x] 返回格式化的搜索结果
     - [x] 在 ListToolsRequestSchema 中添加 search_pages 工具定义
     - [x] 在主处理逻辑中添加 handleSearchPages 函数
   - [x] **搜索结果处理**：
     - [x] 直接在MCP对话中显示搜索结果（不保存文件）
     - [x] 格式化输出：标题、片段、页面大小等信息
     - [x] 支持结果数量统计和分页提示
   - [x] **测试脚本开发**：
     - [x] 创建 test/task5.sh 测试脚本
     - [x] 测试用例：
       - [x] 基础搜索测试：搜索已知存在的页面
       - [x] 空结果测试：搜索不存在的内容
       - [x] 参数测试：不同的limit值
       - [x] 参数验证测试：缺少必要参数的处理
     - [x] 验证搜索结果在对话中正确显示
   - [x] **回归测试和提交**：
     - [x] 执行完整回归测试：task1.sh → task5.sh 全部通过
     - [x] 验证现有功能未被破坏
     - [x] 准备提交代码到 task5 分支
- [x] 任务6: 增强 update_page 工具支持文件更新和冲突检测
   - [x] **前置准备**：
     - [x] 在新的 git 分支 task6 下执行任务
     - [x] 执行回归测试：运行 task1.sh → task5.sh，确保全部通过
   - [x] **增强 update_page 工具**：
     - [x] 扩展 update_page 工具参数，添加 fromFile 和 compareFirst 支持
       - [x] fromFile: 从本地文件读取内容（替代 content 参数）
       - [x] compareFirst: 更新前先比较内容，避免无意义更新
       - [x] conflictResolution: 冲突解决策略 (detect/force/abort)
     - [x] 修改 update_page 工具的 inputSchema，支持 content 和 fromFile 二选一
     - [x] 在 handleUpdatePage 函数中实现文件读取逻辑
   - [x] **元数据管理**：
     - [x] 增强 get_page 功能，保存页面元数据到 .jthou_wiki/.metadata/ 目录
       - [x] 保存页面标题、修订版本号、获取时间、原始内容
       - [x] 元数据格式：JSON 文件，包含冲突检测所需信息
     - [x] 在 handleGetPage 函数中添加元数据保存逻辑
   - [x] **冲突检测机制**：
     - [x] 实现冲突检测函数 detectConflicts()
       - [x] 比较本地元数据中的修订版本与当前wiki版本
       - [x] 检测是否有并发修改冲突
     - [x] 当检测到冲突时，自动获取最新远程版本
     - [x] 生成三路合并文档，标记冲突区域
   - [x] **合并文档生成**：
     - [x] 实现 generateMergeDocument() 函数
       - [x] 支持基于行的三路合并算法
       - [x] 使用标准冲突标记：<<<<<<< LOCAL / ======= / >>>>>>> REMOTE
       - [x] 生成 .merge.txt 文件供用户手动解决冲突
     - [x] 保存最新远程版本到 .remote.txt 文件作为参考
   - [x] **冲突解决工作流**：
     - [x] conflictResolution="detect" (默认)：检测冲突并生成合并文档
     - [x] conflictResolution="force"：强制覆盖远程更改
     - [x] conflictResolution="abort"：中止更新操作 (通过异常处理实现)
     - [x] 提供清晰的用户指导信息和下一步操作建议
     - [x] 提供详细的冲突报告，包含时间线和修改者信息
     - [x] 清晰的错误消息和操作建议
     - [x] 支持批量文件更新的冲突处理
   - [x] **测试脚本开发和验证策略**：
     - [x] 创建 test/task6.sh 主测试脚本
     - [x] **基础功能测试**：
       - [x] 基础文件更新测试：fromFile 参数正常工作
       - [x] 无冲突更新测试：compareFirst 避免重复更新
       - [x] 强制更新测试：conflictResolution="force" 覆盖远程更改
       - [x] 元数据管理测试：验证 .metadata 目录和文件创建
     - [x] **冲突检测和合并测试**：
       - [x] 自动化冲突模拟：创建测试页面 → 获取建立基线 → 模拟本地编辑 → 直接在wiki更新页面（模拟远程用户修改）→ 本地尝试更新，验证冲突检测机制
       - [x] 合并文档生成测试：验证冲突标记格式（<<<<<<< LOCAL / ======= / >>>>>>> REMOTE）
       - [x] 手动冲突验证：获取测试页面 → 提示用户手动在wiki上修改 → 本地修改后尝试更新 → 验证冲突检测和合并文档生成
     - [x] **单元测试风格验证**：
       - [x] test_no_conflict(): 验证无冲突情况下的正常更新
       - [x] test_conflict_detection(): 验证冲突检测机制
       - [x] test_compare_first(): 验证compareFirst跳过重复更新
       - [x] test_force_override(): 验证强制覆盖功能
       - [x] test_merge_document(): 验证合并文档格式和冲突标记
     - [x] **边界条件和异常测试**：
       - [x] 空文件冲突测试
       - [x] 大文件冲突测试
       - [x] 特殊字符和编码冲突测试
       - [x] 元数据损坏情况的处理测试
   - [x] **回归测试和提交**：
     - [x] 执行完整回归测试：task1.sh → task6.sh 全部通过
     - [x] 验证现有功能未被破坏，向后兼容性良好
     - [x] 准备提交代码到 task6 分支
- [x] 任务7：添加 upload_file 工具（最小可用版：返回可插入引用）
  - [x] 前置准备
    - [x] 在新的 git 分支 task7 下执行任务
    - [x] 回归 task1~6 全部通过
    - [x] 确认 test.env 账户具备"上传文件"权限；如需 fromUrl，MediaWiki 已开启相关配置（如 $wgAllowCopyUploads）
    - [x] 准备测试资源 ./test/fixtures/（small.png、another.png、remote.jpg 等）
  - [x] 工具定义（ListToolsRequestSchema）
    - [x] 新增 upload_file 工具；参数：wiki, fromFile|fromUrl（二选一）, title?, comment?
    - [x] 工具描述明确"仅返回一个可直接粘贴到页面的引用：[[File:XXX]]"
  - [x] 代码实现（src/index.ts）
    - [x] MediaWikiClient：getFileInfoMinimal(title)（是否存在、sha1）
    - [x] MediaWikiClient：uploadFileMinimal(localPath,title,comment)
    - [x] MediaWikiClient：uploadByUrlMinimal(url,title,comment)（下载→上传→清理）
    - [x] 处理器 handleUploadFileMinimal：
      - [x] 标题规范化：补"File:"、清理空格与扩展名大小写
      - [x] 校验：类型白名单/大小上限/路径安全/URL scheme
      - [x] 预检：同名且 sha1 相同→跳过；同名不同→自动改名（-yyyyMMdd-HHmmss）
      - [x] 执行上传；返回 fileRef
    - [x] 在工具路由中注册 case "upload_file"
  - [x] 返回契约
    - [x] 仅返回：fileRef（形如 [[File:FinalTitle]]）
  - [x] 测试脚本（./test/task7.sh）
    - [x] case1：fromFile 首次上传 → 返回 [[File:xxx]]
    - [x] case2：再次上传相同文件 → 返回同一引用（跳过）
    - [x] case3：同名不同内容 → 自动改名并返回新引用
    - [x] case4：fromUrl 上传 → 返回引用并清理临时文件
    - [x] case5：非法类型/超限大小 → 正确报错（不上传）
  - [x] 文档与配置
    - [x] 在 todo.md 增加使用示例（JSON-RPC 调用样例）
    - [x] .gitignore 增加 .jthou_tmp/（下载临时目录）
  - [x] 回归测试与提交
    - [x] 运行 task1~7 全部通过
    - [x] 使用中文提交信息："feat(upload): 新增 upload_file，返回 [[File:...]]"

## 📌 使用示例

### JSON-RPC 调用样例

#### 1. 从本地文件上传
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "upload_file",
    "arguments": {
      "wiki": "Jthou",
      "fromFile": "/path/to/local/file.png",
      "comment": "Upload test image"
    }
  }
}
```

#### 2. 从URL上传
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "upload_file",
    "arguments": {
      "wiki": "Jthou",
      "fromUrl": "https://example.com/image.jpg",
      "title": "MyImage.jpg",
      "comment": "Upload image from URL"
    }
  }
}
```

#### 3. 响应示例
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "File uploaded successfully: [[File:filename.png]]"
    }]
  }
}
```

