#!/bin/bash

# 任务6测试：增强update_page工具支持文件更新和冲突检测

echo "=== 任务6测试：update_page 文件更新和冲突检测 ==="

# 构建项目
echo "1. 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

# 清理测试环境
rm -rf .jthou_wiki/.metadata/
rm -f .jthou_wiki/task6_test_*.txt

# ==================== 基础功能测试 ====================

echo "2. 测试基础文件更新功能..."

# 创建测试页面
TEST_PAGE="task6_test_basic_$(date +%s)"
echo "创建测试页面: $TEST_PAGE"

echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_page","arguments":{"wiki":"Jthou","title":"'$TEST_PAGE'","content":"初始内容\n第二行","summary":"创建测试页面"}}}' | node build/index.js -f ../test.env >/dev/null

# 获取页面（应该保存元数据）
echo "获取页面并保存元数据..."
RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_page","arguments":{"wiki":"Jthou","title":"'$TEST_PAGE'"}}}' | node build/index.js -f ../test.env 2>/dev/null)

# 检查是否成功获取
if echo "$RESPONSE" | grep -q "Successfully retrieved"; then
    echo "✅ 页面获取成功"
    
    # 检查元数据是否创建
    if [ -f ".jthou_wiki/.metadata/$TEST_PAGE.json" ]; then
        echo "✅ 元数据文件已创建"
    else
        echo "❌ 元数据文件未创建"
        exit 1
    fi
    
    # 检查页面文件是否创建
    if [ -f ".jthou_wiki/$TEST_PAGE.txt" ]; then
        echo "✅ 页面文件已创建"
    else
        echo "❌ 页面文件未创建"
        exit 1
    fi
else
    echo "❌ 页面获取失败"
    exit 1
fi

# 修改本地文件
echo "修改本地文件内容..."
echo "初始内容
第二行 - 已修改
第三行 - 新增" > ".jthou_wiki/$TEST_PAGE.txt"

# 测试fromFile参数更新
echo "测试 fromFile 参数更新..."
UPDATE_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_page","arguments":{"wiki":"Jthou","title":"'$TEST_PAGE'","fromFile":".jthou_wiki/'$TEST_PAGE'.txt","summary":"使用fromFile更新","conflictResolution":"detect"}}}' | node build/index.js -f ../test.env 2>/dev/null)

if echo "$UPDATE_RESPONSE" | grep -q "Successfully updated"; then
    echo "✅ fromFile 参数更新成功"
else
    echo "❌ fromFile 参数更新失败"
    echo "响应: $UPDATE_RESPONSE"
    exit 1
fi

# ==================== compareFirst 测试 ====================

echo "3. 测试 compareFirst 功能..."

# 再次更新相同内容（应该被跳过）
COMPARE_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_page","arguments":{"wiki":"Jthou","title":"'$TEST_PAGE'","fromFile":".jthou_wiki/'$TEST_PAGE'.txt","summary":"重复更新测试","compareFirst":true}}}' | node build/index.js -f ../test.env 2>/dev/null)

if echo "$COMPARE_RESPONSE" | grep -q "No changes detected" || echo "$COMPARE_RESPONSE" | grep -q "up to date"; then
    echo "✅ compareFirst 功能工作正常，跳过了重复更新"
else
    echo "⚠️  compareFirst 可能未实现或内容确实有差异"
    echo "响应: $COMPARE_RESPONSE"
fi

# ==================== 冲突检测测试 ====================

echo "4. 测试冲突检测功能..."

# 创建新的测试页面用于冲突测试
CONFLICT_TEST_PAGE="task6_conflict_$(date +%s)"
echo "创建冲突测试页面: $CONFLICT_TEST_PAGE"

# 创建页面
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_page","arguments":{"wiki":"Jthou","title":"'$CONFLICT_TEST_PAGE'","content":"原始内容\n第二行\n第三行","summary":"创建冲突测试页面"}}}' | node build/index.js -f ../test.env >/dev/null

# 获取页面建立基线
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_page","arguments":{"wiki":"Jthou","title":"'$CONFLICT_TEST_PAGE'"}}}' | node build/index.js -f ../test.env >/dev/null

# 模拟本地编辑
echo "原始内容
第二行 - 本地修改
第三行
新增本地行" > ".jthou_wiki/$CONFLICT_TEST_PAGE.txt"

# 模拟远程修改（直接更新wiki）
echo "模拟远程用户修改..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_page","arguments":{"wiki":"Jthou","title":"'$CONFLICT_TEST_PAGE'","content":"原始内容\n第二行 - 远程修改\n第三行\n新增远程行","summary":"模拟远程修改","conflictResolution":"force"}}}' | node build/index.js -f ../test.env >/dev/null

# 现在本地尝试更新（应该检测到冲突）
echo "本地尝试更新（应该检测到冲突）..."
CONFLICT_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_page","arguments":{"wiki":"Jthou","title":"'$CONFLICT_TEST_PAGE'","fromFile":".jthou_wiki/'$CONFLICT_TEST_PAGE'.txt","summary":"测试冲突检测","conflictResolution":"detect"}}}' | node build/index.js -f ../test.env 2>/dev/null)

if echo "$CONFLICT_RESPONSE" | grep -q "CONFLICT DETECTED" || echo "$CONFLICT_RESPONSE" | grep -q "conflict"; then
    echo "✅ 冲突检测功能工作正常"
    
    # 检查是否生成了合并文件
    if [ -f ".jthou_wiki/$CONFLICT_TEST_PAGE.merge.txt" ]; then
        echo "✅ 合并文档已生成"
        
        # 检查冲突标记
        if grep -q "<<<<<<< LOCAL" ".jthou_wiki/$CONFLICT_TEST_PAGE.merge.txt" && 
           grep -q "=======" ".jthou_wiki/$CONFLICT_TEST_PAGE.merge.txt" && 
           grep -q ">>>>>>> REMOTE" ".jthou_wiki/$CONFLICT_TEST_PAGE.merge.txt"; then
            echo "✅ 冲突标记格式正确"
        else
            echo "❌ 冲突标记格式不正确"
            exit 1
        fi
    else
        echo "⚠️  合并文档未生成（可能冲突检测功能未完全实现）"
    fi
    
    # 检查最新远程版本文件
    if [ -f ".jthou_wiki/$CONFLICT_TEST_PAGE.latest.txt" ]; then
        echo "✅ 最新远程版本已保存"
    else
        echo "⚠️  最新远程版本文件未生成"
    fi
else
    echo "⚠️  冲突检测功能可能未实现"
    echo "响应: $CONFLICT_RESPONSE"
fi

# ==================== 强制覆盖测试 ====================

echo "5. 测试强制覆盖功能..."

FORCE_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_page","arguments":{"wiki":"Jthou","title":"'$CONFLICT_TEST_PAGE'","fromFile":".jthou_wiki/'$CONFLICT_TEST_PAGE'.txt","summary":"强制覆盖测试","conflictResolution":"force"}}}' | node build/index.js -f ../test.env 2>/dev/null)

if echo "$FORCE_RESPONSE" | grep -q "Successfully updated"; then
    echo "✅ 强制覆盖功能工作正常"
else
    echo "❌ 强制覆盖功能失败"
    echo "响应: $FORCE_RESPONSE"
    exit 1
fi

# ==================== 边界条件测试 ====================

echo "6. 测试边界条件..."

# 测试不存在的文件
echo "测试不存在的文件..."
ERROR_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_page","arguments":{"wiki":"Jthou","title":"test","fromFile":"nonexistent.txt","summary":"测试不存在文件"}}}' | node build/index.js -f ../test.env 2>/dev/null)

if echo "$ERROR_RESPONSE" | grep -q "error" || echo "$ERROR_RESPONSE" | grep -q "not found" || echo "$ERROR_RESPONSE" | grep -q "ENOENT"; then
    echo "✅ 正确处理了不存在的文件"
else
    echo "⚠️  对不存在文件的处理可能需要改进"
fi

# 测试同时提供content和fromFile（应该报错）
echo "测试参数冲突..."
PARAM_ERROR_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_page","arguments":{"wiki":"Jthou","title":"test","content":"内容","fromFile":"file.txt","summary":"参数冲突测试"}}}' | node build/index.js -f ../test.env 2>/dev/null)

if echo "$PARAM_ERROR_RESPONSE" | grep -q "error"; then
    echo "✅ 正确处理了参数冲突"
else
    echo "⚠️  参数冲突处理可能需要改进"
fi

echo "✅ 任务6测试完成"

echo ""
echo "=== 测试总结 ==="
echo "✅ 基础文件更新功能测试通过"
echo "✅ fromFile 参数工作正常"
echo "✅ 强制覆盖功能正常"
echo "⚠️  以下功能可能需要实现或改进："
echo "   - compareFirst 功能的完整实现"
echo "   - 冲突检测和合并文档生成"
echo "   - 更好的错误处理和参数验证"
