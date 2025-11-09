/**
 * Cloudflare Workers 入口文件
 * REST API for API Key Testing
 */

import { handleTest } from './handlers/test.js';
import { handleResults } from './handlers/results.js';
import { handleHealth } from './handlers/health.js';
import { authenticate } from './utils/auth.js';

/**
 * CORS headers
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * 处理 OPTIONS 请求（CORS preflight）
 */
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

/**
 * 错误响应
 */
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
        ...CORS_HEADERS
      }
    }
  );
}

/**
 * 成功响应
 */
export function successResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    }
  );
}

/**
 * 路由处理
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // OPTIONS 请求（CORS）
  if (method === 'OPTIONS') {
    return handleOptions();
  }

  // 健康检查（无需认证）
  if (path === '/api/health' && method === 'GET') {
    return handleHealth();
  }

  // 认证检查
  const authResult = authenticate(request, env);
  if (!authResult.success) {
    return errorResponse(authResult.error, 401);
  }

  // 路由分发
  try {
    // POST /api/test - 批量测试 API Keys
    if (path === '/api/test' && method === 'POST') {
      return await handleTest(request, env);
    }

    // GET /api/results/{test_id} - 获取测试结果
    if (path.startsWith('/api/results/') && method === 'GET') {
      const testId = path.split('/')[3];
      return await handleResults(testId, url.searchParams, env);
    }

    // 404
    return errorResponse('Not Found', 404);

  } catch (error) {
    console.error('Request handling error:', error);
    return errorResponse(
      'Internal Server Error: ' + error.message,
      500
    );
  }
}

/**
 * Cloudflare Workers fetch handler
 */
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};