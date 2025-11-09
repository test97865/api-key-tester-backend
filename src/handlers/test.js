/**
 * 批量测试处理器
 */

import { testApiKey } from '../services/tester.js';
import { createTestSession, saveTestResult, updateTestSession } from '../db/queries.js';
import { hashKey, maskKey } from '../utils/crypto.js';
import { successResponse } from '../index.js';

/**
 * 处理批量测试请求
 */
export async function handleTest(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return errorResponse('Invalid JSON body', 400);
  }

  // 验证请求参数
  const { api_type, model, proxy_url, keys, concurrency = 5, retry_count = 2 } = body;

  if (!api_type || !model || !keys || !Array.isArray(keys)) {
    return errorResponse('Missing required fields: api_type, model, keys', 400);
  }

  if (keys.length === 0) {
    return errorResponse('keys array cannot be empty', 400);
  }

  if (keys.length > 1000) {
    return errorResponse('Maximum 1000 keys per request', 400);
  }

  // 验证 API 类型
  const validApiTypes = ['openai', 'claude', 'gemini', 'deepseek', 'siliconcloud', 'xai', 'openrouter'];
  if (!validApiTypes.includes(api_type)) {
    return errorResponse(`Invalid api_type. Must be one of: ${validApiTypes.join(', ')}`, 400);
  }

  // 生成测试 ID
  const testId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    // 创建测试会话
    await createTestSession(env.DB, {
      test_id: testId,
      api_type,
      model,
      total_keys: keys.length
    });

    // 并发测试（简化版本，实际应使用 Promise 控制并发）
    const results = [];
    let validCount = 0;
    let invalidCount = 0;
    let rateLimitedCount = 0;

    // 批量测试
    for (const key of keys) {
      try {
        // 测试 API Key
        const result = await testApiKey(api_type, key, model, proxy_url);

        // 计算 hash 和 masked 版本
        const keyHash = await hashKey(key);
        const keyMasked = maskKey(key);

        // 确定状态
        let status = 'invalid';
        if (result.valid) {
          status = 'valid';
          validCount++;
        } else if (result.isRateLimit) {
          status = 'rate_limited';
          rateLimitedCount++;
        } else {
          invalidCount++;
        }

        // 保存到数据库
        await saveTestResult(env.DB, {
          test_id: testId,
          key_hash: keyHash,
          key_masked: keyMasked,
          status,
          api_type,
          model,
          error: result.error || null,
          is_rate_limit: result.isRateLimit ? 1 : 0,
          is_paid: result.isPaid === undefined ? null : (result.isPaid ? 1 : 0)
        });

        // 添加到结果
        results.push({
          key: key, // 注意：响应中包含完整 key，仅用于即时显示
          key_masked: keyMasked,
          status,
          api_type,
          model,
          error: result.error,
          is_rate_limit: result.isRateLimit || false,
          is_paid: result.isPaid,
          tested_at: new Date().toISOString()
        });

      } catch (error) {
        console.error(`Error testing key:`, error);
        // 测试失败，记录为 invalid
        const keyHash = await hashKey(key);
        const keyMasked = maskKey(key);

        await saveTestResult(env.DB, {
          test_id: testId,
          key_hash: keyHash,
          key_masked: keyMasked,
          status: 'invalid',
          api_type,
          model,
          error: 'Test failed: ' + error.message,
          is_rate_limit: 0
        });

        invalidCount++;

        results.push({
          key: key,
          key_masked: keyMasked,
          status: 'invalid',
          api_type,
          model,
          error: 'Test failed: ' + error.message,
          is_rate_limit: false,
          tested_at: new Date().toISOString()
        });
      }
    }

    // 更新测试会话
    await updateTestSession(env.DB, testId, {
      valid_count: validCount,
      invalid_count: invalidCount,
      rate_limited_count: rateLimitedCount,
      status: 'completed'
    });

    // 返回结果
    return successResponse({
      success: true,
      test_id: testId,
      total: keys.length,
      results: {
        valid: validCount,
        invalid: invalidCount,
        rate_limited: rateLimitedCount
      },
      items: results
    });

  } catch (error) {
    console.error('Test handler error:', error);
    return errorResponse('Test execution failed: ' + error.message, 500);
  }
}

function errorResponse(message, status = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}