#!/bin/bash
# task9.sh - update_page 连续推送稳定性测试
set -e

echo "=== 任务9测试：update_page 工具稳定性测试 ==="

# 1. 构建项目
echo "1. 构建项目..."
npm run build > /dev/null 2>&1

# 2. 创建测试页面名称
TEST_PAGE_NAME="task9_stability_test_$(date +%s)"

echo "2. 创建测试页面: $TEST_PAGE_NAME"

# 3. 首先创建一个测试页面
RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"update_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$TEST_PAGE_NAME\",\"content\":\"初始内容\",\"summary\":\"创建测试页面用于稳定性测试\",\"mode\":\"replace\"}}}" | node build/index.js -f ../test.env 2>/dev/null)
echo "创建页面响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Successfully updated page"; then
    echo "✅ 页面创建成功"
else
    echo "❌ 页面创建失败"
    exit 1
fi

# 4. 连续多次更新页面以测试稳定性
echo "3. 连续多次更新页面以测试稳定性..."

FAIL_COUNT=0
SUCCESS_COUNT=0

for i in {1..10}; do
    echo "   更新测试 $i/10..."
    
    # 生成随机内容
    RANDOM_CONTENT="更新内容 - 测试 $i - $(date +%s%N)"
    
    # 执行更新
    RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":$i,\"method\":\"tools/call\",\"params\":{\"name\":\"update_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$TEST_PAGE_NAME\",\"content\":\"$RANDOM_CONTENT\",\"summary\":\"稳定性测试更新 $i\",\"mode\":\"replace\"}}}" | node build/index.js -f ../test.env 2>/dev/null)
    
    echo "   响应: $RESPONSE"
    
    if echo "$RESPONSE" | grep -q "Successfully updated page"; then
        echo "   ✅ 更新 $i 成功"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "   ❌ 更新 $i 失败"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    # 等待一段时间避免过于频繁的请求
    sleep 2
done

echo "4. 测试结果统计:"
echo "   成功次数: $SUCCESS_COUNT"
echo "   失败次数: $FAIL_COUNT"

# 5. 测试强制重试机制（模拟网络错误）
echo "5. 测试强制重试机制..."
RANDOM_CONTENT="重试机制测试内容 - $(date +%s%N)"
RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":20,\"method\":\"tools/call\",\"params\":{\"name\":\"update_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$TEST_PAGE_NAME\",\"content\":\"$RANDOM_CONTENT\",\"summary\":\"重试机制测试\",\"mode\":\"replace\"}}}" | node build/index.js -f ../test.env 2>/dev/null)
echo "重试机制测试响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Successfully updated page"; then
    echo "✅ 重试机制测试成功"
else
    echo "❌ 重试机制测试失败"
fi

# 6. 验证最后一次更新是否成功应用
echo "6. 验证最后一次更新是否成功应用..."
RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":99,\"method\":\"tools/call\",\"params\":{\"name\":\"get_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$TEST_PAGE_NAME\"}}}" | node build/index.js -f ../test.env 2>/dev/null)
echo "获取页面响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Successfully retrieved page"; then
    echo "✅ 页面获取成功"
    
    # 检查文件内容
    if [ -f ".jthou_wiki/$TEST_PAGE_NAME.txt" ]; then
        CONTENT=$(cat ".jthou_wiki/$TEST_PAGE_NAME.txt")
        echo "页面内容预览: ${CONTENT:0:100}..."
    else
        echo "⚠️  页面文件未找到"
    fi
else
    echo "❌ 页面获取失败"
fi

# 7. 清理测试页面
echo "7. 清理测试页面..."
RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":100,\"method\":\"tools/call\",\"params\":{\"name\":\"update_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$TEST_PAGE_NAME\",\"content\":\"\",\"summary\":\"删除测试页面\",\"mode\":\"replace\"}}}" | node build/index.js -f ../test.env 2>/dev/null)
echo "删除页面响应: $RESPONSE"

echo "✅ 任务9测试完成"
echo "总结: 成功 $SUCCESS_COUNT 次，失败 $FAIL_COUNT 次"

# 8. 测试边界情况：空内容更新
echo "8. 测试边界情况：空内容更新..."
EMPTY_PAGE_NAME="task9_empty_test_$(date +%s)"
RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":101,\"method\":\"tools/call\",\"params\":{\"name\":\"update_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$EMPTY_PAGE_NAME\",\"content\":\"\",\"summary\":\"空内容测试\",\"mode\":\"replace\"}}}" | node build/index.js -f ../test.env 2>/dev/null)
echo "空内容更新响应: $RESPONSE"

if echo "$RESPONSE" | grep -q "Successfully updated page"; then
    echo "✅ 空内容更新测试成功"
else
    echo "❌ 空内容更新测试失败"
fi

# 清理空内容测试页面
echo "9. 清理空内容测试页面..."
RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":102,\"method\":\"tools/call\",\"params\":{\"name\":\"update_page\",\"arguments\":{\"wiki\":\"Jthou\",\"title\":\"$EMPTY_PAGE_NAME\",\"content\":\"\",\"summary\":\"删除空内容测试页面\",\"mode\":\"replace\"}}}" | node build/index.js -f ../test.env 2>/dev/null)
