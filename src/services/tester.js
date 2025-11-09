/**
 * API Key 测试服务
 * 复用前端的测试逻辑，适配 Cloudflare Workers 环境
 */

/**
 * 统一测试接口
 */
export async function testApiKey(apiType, apiKey, model, proxyUrl) {
  switch (apiType) {
    case 'openai':
      return await testOpenAI(apiKey, model, proxyUrl);
    case 'claude':
      return await testClaude(apiKey, model, proxyUrl);
    case 'gemini':
      return await testGemini(apiKey, model, proxyUrl);
    case 'deepseek':
      return await testDeepSeek(apiKey, model, proxyUrl);
    case 'siliconcloud':
      return await testSiliconCloud(apiKey, model, proxyUrl);
    case 'xai':
      return await testXAI(apiKey, model, proxyUrl);
    case 'openrouter':
      return await testOpenRouter(apiKey, model, proxyUrl);
    default:
      return { valid: false, error: 'Unsupported API type', isRateLimit: false };
  }
}

/**
 * 获取 API URL
 */
function getApiUrl(apiType, endpoint, proxyUrl) {
  if (proxyUrl) {
    const baseUrl = proxyUrl.endsWith('/') ? proxyUrl.slice(0, -1) : proxyUrl;
    return baseUrl + endpoint;
  }

  const defaultUrls = {
    openai: 'https://api.openai.com/v1',
    claude: 'https://api.anthropic.com/v1',
    gemini: 'https://generativelanguage.googleapis.com/v1beta',
    deepseek: 'https://api.deepseek.com/v1',
    siliconcloud: 'https://api.siliconflow.cn/v1',
    xai: 'https://api.x.ai/v1',
    openrouter: 'https://openrouter.ai/api/v1'
  };

  return (defaultUrls[apiType] || '') + endpoint;
}

/**
 * 测试 OpenAI Key
 */
async function testOpenAI(apiKey, model, proxyUrl) {
  try {
    const apiUrl = getApiUrl('openai', '/chat/completions', proxyUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      })
    });

    if (response.status === 401) return { valid: false, error: 'Auth failed (401)', isRateLimit: false };
    if (response.status === 403) return { valid: false, error: 'Permission denied (403)', isRateLimit: false };
    if (response.status === 429) return { valid: false, error: 'Rate limited (429)', isRateLimit: true };

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}`, isRateLimit: false };
    }

    const data = await response.json();
    if (data && data.choices && Array.isArray(data.choices)) {
      return { valid: true, error: null, isRateLimit: false };
    }

    return { valid: false, error: 'Invalid response format', isRateLimit: false };
  } catch (error) {
    return { valid: false, error: error.message, isRateLimit: false };
  }
}

/**
 * 测试 Claude Key
 */
async function testClaude(apiKey, model, proxyUrl) {
  try {
    const apiUrl = getApiUrl('claude', '/messages', proxyUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    if (response.status === 401) return { valid: false, error: 'Auth failed (401)', isRateLimit: false };
    if (response.status === 403) return { valid: false, error: 'Permission denied (403)', isRateLimit: false };
    if (response.status === 429) return { valid: false, error: 'Rate limited (429)', isRateLimit: true };

    if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.error && errorData.error.type === 'invalid_request_error') {
        return { valid: true, error: null, isRateLimit: false };
      }
    }

    if (response.ok) {
      return { valid: true, error: null, isRateLimit: false };
    }

    return { valid: false, error: `HTTP ${response.status}`, isRateLimit: false };
  } catch (error) {
    return { valid: false, error: error.message, isRateLimit: false };
  }
}

/**
 * 测试 Gemini Key
 */
async function testGemini(apiKey, model, proxyUrl) {
  try {
    const apiUrl = getApiUrl('gemini', `/models/${model}:generateContent?key=${apiKey}`, proxyUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hi' }] }]
      })
    });

    if (response.status === 400) return { valid: false, error: 'Invalid API key (400)', isRateLimit: false };
    if (response.status === 401) return { valid: false, error: 'Auth failed (401)', isRateLimit: false };
    if (response.status === 403) return { valid: false, error: 'Permission denied (403)', isRateLimit: false };
    if (response.status === 429) return { valid: false, error: 'Rate limited (429)', isRateLimit: true };

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}`, isRateLimit: false };
    }

    const data = await response.json();
    if (data && data.candidates && Array.isArray(data.candidates)) {
      return { valid: true, error: null, isRateLimit: false };
    }

    return { valid: false, error: 'Invalid response format', isRateLimit: false };
  } catch (error) {
    return { valid: false, error: error.message, isRateLimit: false };
  }
}

/**
 * 测试 DeepSeek Key（OpenAI 兼容）
 */
async function testDeepSeek(apiKey, model, proxyUrl) {
  return await testOpenAICompatible('deepseek', apiKey, model, proxyUrl);
}

/**
 * 测试 SiliconCloud Key（OpenAI 兼容）
 */
async function testSiliconCloud(apiKey, model, proxyUrl) {
  return await testOpenAICompatible('siliconcloud', apiKey, model, proxyUrl);
}

/**
 * 测试 xAI Key（OpenAI 兼容）
 */
async function testXAI(apiKey, model, proxyUrl) {
  return await testOpenAICompatible('xai', apiKey, model, proxyUrl);
}

/**
 * 测试 OpenRouter Key（OpenAI 兼容）
 */
async function testOpenRouter(apiKey, model, proxyUrl) {
  return await testOpenAICompatible('openrouter', apiKey, model, proxyUrl);
}

/**
 * OpenAI 兼容格式测试
 */
async function testOpenAICompatible(apiType, apiKey, model, proxyUrl) {
  try {
    const apiUrl = getApiUrl(apiType, '/chat/completions', proxyUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      })
    });

    if (response.status === 401) return { valid: false, error: 'Auth failed (401)', isRateLimit: false };
    if (response.status === 403) return { valid: false, error: 'Permission denied (403)', isRateLimit: false };
    if (response.status === 429) return { valid: false, error: 'Rate limited (429)', isRateLimit: true };

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}`, isRateLimit: false };
    }

    const data = await response.json();
    if (data && data.choices && Array.isArray(data.choices)) {
      return { valid: true, error: null, isRateLimit: false };
    }

    return { valid: false, error: 'Invalid response format', isRateLimit: false };
  } catch (error) {
    return { valid: false, error: error.message, isRateLimit: false };
  }
}