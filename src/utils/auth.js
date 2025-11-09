/**
 * 认证中间件
 */

/**
 * Bearer Token 认证
 */
export function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      success: false,
      error: 'Missing Authorization header'
    };
  }

  // 检查格式: Bearer {token}
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      success: false,
      error: 'Invalid Authorization header format. Expected: Bearer {token}'
    };
  }

  const token = parts[1];

  // 验证 token
  // 从环境变量获取正确的 token
  const validToken = env.API_AUTH_TOKEN;

  if (!validToken) {
    console.error('API_AUTH_TOKEN not configured');
    return {
      success: false,
      error: 'Server configuration error'
    };
  }

  if (token !== validToken) {
    return {
      success: false,
      error: 'Invalid authentication token'
    };
  }

  return { success: true };
}