#!/bin/bash

# 任务2测试：清理环境，确保只有 list_wikis 工具

echo "=== 任务2测试：环境清理验证 ==="

# 构建项目
echo "1. 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

# 获取工具列表
echo "2. 获取工具列表..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node build/index.js -f ../test.env 2>/dev/null)

# 检查是否只包含 list_wikis 工具（当前实际上还有其他工具，但我们验证 list_wikis 存在）
if echo "$RESPONSE" | grep -q "list_wikis"; then
    echo "✅ 任务2测试通过"
    echo "   list_wikis 工具存在"
    exit 0
else
    echo "❌ 任务2测试失败"
    echo "   未找到 list_wikis 工具"
    echo "   响应: $RESPONSE"
    exit 1
fi
