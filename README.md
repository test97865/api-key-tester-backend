# API Server for API Key Tester

这是一个独立的 REST API 服务，基于 Cloudflare Workers 实现，提供 API Key 批量测试接口。

## 功能特性

- ✅ 批量测试多个 API Key
- ✅ 支持所有主流 AI API 提供商（OpenAI、Claude、Gemini、DeepSeek 等）
- ✅ 简单的 Bearer Token 认证
- ✅ 多种输出格式（JSON、CSV、TXT）
- ✅ 结果过滤（按 API 类型、状态）
- ✅ 使用 Cloudflare D1 数据库存储测试结果
- ✅ 完全免费部署（Cloudflare Workers Free Tier）

## 部署到 Cloudflare

### 前置要求

- Cloudflare 账号
- Node.js >= 18
- npm >= 8

### 安装步骤

```bash
# 1. 安装 Wrangler CLI
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 创建 D1 数据库
wrangler d1 create api-key-tester-db

# 4. 复制数据库 ID 到 wrangler.toml
# 将输出的 database_id 填入 wrangler.toml 中

# 5. 初始化数据库表
wrangler d1 execute api-key-tester-db --file=./schema.sql

# 6. 部署到 Cloudflare Workers
wrangler deploy
```

### 配置认证密钥

```bash
# 设置 API 认证 Token（Cloudflare Secret）
wrangler secret put API_AUTH_TOKEN
# 输入你的密钥，例如: my-secret-token-12345
```

## API 文档

### 1. 批量测试 API Keys

**请求**

```http
POST /api/test
Content-Type: application/json
Authorization: Bearer {your_auth_token}

{
  "api_type": "openai",
  "model": "gpt-4o-mini",
  "proxy_url": "https://api.openai.com/v1",
  "keys": [
    "sk-proj-xxxxx",
    "sk-proj-yyyyy",
    "sk-proj-zzzzz"
  ],
  "concurrency": 5,
  "retry_count": 2
}
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| api_type | string | 是 | API 类型：openai/claude/gemini/deepseek/siliconcloud/xai/openrouter |
| model | string | 是 | 模型名称 |
| proxy_url | string | 否 | 代理服务器 URL（默认使用官方地址） |
| keys | array | 是 | API Key 列表 |
| concurrency | number | 否 | 并发数（默认 5，范围 1-20） |
| retry_count | number | 否 | 重试次数（默认 2，范围 0-5） |

**响应 (JSON)**

```json
{
  "success": true,
  "test_id": "test_1234567890",
  "total": 3,
  "results": {
    "valid": 1,
    "invalid": 1,
    "rate_limited": 1
  },
  "items": [
    {
      "key": "sk-proj-xxxxx...xxxxx",
      "key_masked": "sk-proj-xxx***xxx",
      "status": "valid",
      "api_type": "openai",
      "model": "gpt-4o-mini",
      "error": null,
      "is_rate_limit": false,
      "is_paid": null,
      "tested_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "key": "sk-proj-yyyyy...yyyyy",
      "key_masked": "sk-proj-yyy***yyy",
      "status": "invalid",
      "api_type": "openai",
      "model": "gpt-4o-mini",
      "error": "errorMessages.authFailed401",
      "is_rate_limit": false,
      "is_paid": null,
      "tested_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "key": "sk-proj-zzzzz...zzzzz",
      "key_masked": "sk-proj-zzz***zzz",
      "status": "rate_limited",
      "api_type": "openai",
      "model": "gpt-4o-mini",
      "error": "errorMessages.rateLimited429",
      "is_rate_limit": true,
      "is_paid": null,
      "tested_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. 获取测试结果

**请求**

```http
GET /api/results/{test_id}?format=json&filter_status=valid&filter_api_type=openai
Authorization: Bearer {your_auth_token}
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| test_id | string | 是 | 测试 ID（从测试接口返回） |
| format | string | 否 | 输出格式：json/csv/txt（默认 json） |
| filter_status | string | 否 | 过滤状态：valid/invalid/rate_limited |
| filter_api_type | string | 否 | 过滤 API 类型 |
| page | number | 否 | 页码（默认 1） |
| page_size | number | 否 | 每页数量（默认 50，最大 100） |

**响应 (JSON)**

```json
{
  "total": 100,
  "page": 1,
  "page_size": 50,
  "returned": 50,
  "items": [
    {
      "key_masked": "sk-proj-xxx***xxx",
      "status": "valid",
      "api_type": "openai",
      "model": "gpt-4o-mini",
      "error": null,
      "is_rate_limit": false,
      "tested_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**响应 (CSV)**

```csv
key_masked,status,api_type,model,error,is_rate_limit,tested_at
sk-proj-xxx***xxx,valid,openai,gpt-4o-mini,,false,2024-01-01T00:00:00.000Z
sk-proj-yyy***yyy,invalid,openai,gpt-4o-mini,errorMessages.authFailed401,false,2024-01-01T00:00:00.000Z
```

**响应 (TXT)** - 仅输出完整 Key（需要权限）

```
sk-proj-xxxxxxxxxxxxxxxxxxxxx
sk-proj-yyyyyyyyyyyyyyyyyyyyy
sk-proj-zzzzzzzzzzzzzzzzzzzzz
```

### 3. 健康检查

**请求**

```http
GET /api/health
```

**响应**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 错误响应

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**常见错误码**

| HTTP 状态码 | 错误 | 说明 |
|------------|------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 认证失败 |
| 404 | Not Found | 资源不存在 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器错误 |

## 使用示例

### cURL

```bash
# 测试 API Keys
curl -X POST https://your-worker.your-subdomain.workers.dev/api/test \
  -H "Authorization: Bearer your-auth-token" \
  -H "Content-Type: application/json" \
  -d '{
    "api_type": "openai",
    "model": "gpt-4o-mini",
    "keys": ["sk-proj-xxx", "sk-proj-yyy"]
  }'

# 获取结果（JSON）
curl -X GET "https://your-worker.your-subdomain.workers.dev/api/results/test_1234567890?format=json" \
  -H "Authorization: Bearer your-auth-token"

# 获取结果（CSV）
curl -X GET "https://your-worker.your-subdomain.workers.dev/api/results/test_1234567890?format=csv&filter_status=valid" \
  -H "Authorization: Bearer your-auth-token"

# 获取结果（TXT - 仅有效 Key）
curl -X GET "https://your-worker.your-subdomain.workers.dev/api/results/test_1234567890?format=txt&filter_status=valid&filter_api_type=gemini" \
  -H "Authorization: Bearer your-auth-token"
```

### Python

```python
import requests

API_URL = "https://your-worker.your-subdomain.workers.dev"
AUTH_TOKEN = "your-auth-token"

# 测试 API Keys
response = requests.post(
    f"{API_URL}/api/test",
    headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
    json={
        "api_type": "openai",
        "model": "gpt-4o-mini",
        "keys": ["sk-proj-xxx", "sk-proj-yyy"],
        "concurrency": 5
    }
)

result = response.json()
test_id = result["test_id"]
print(f"Test ID: {test_id}")

# 获取结果
response = requests.get(
    f"{API_URL}/api/results/{test_id}",
    headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
    params={
        "format": "json",
        "filter_status": "valid"
    }
)

results = response.json()
print(f"Valid keys: {results['returned']}")
```

### JavaScript

```javascript
const API_URL = 'https://your-worker.your-subdomain.workers.dev';
const AUTH_TOKEN = 'your-auth-token';

// 测试 API Keys
const testResponse = await fetch(`${API_URL}/api/test`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    api_type: 'openai',
    model: 'gpt-4o-mini',
    keys: ['sk-proj-xxx', 'sk-proj-yyy'],
    concurrency: 5
  })
});

const testResult = await testResponse.json();
const testId = testResult.test_id;
console.log('Test ID:', testId);

// 获取结果
const resultsResponse = await fetch(
  `${API_URL}/api/results/${testId}?format=json&filter_status=valid`,
  {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  }
);

const results = await resultsResponse.json();
console.log('Valid keys:', results.returned);
```

## 数据存储

### Cloudflare D1 数据库

测试结果存储在 Cloudflare D1（SQLite）数据库中：

**表结构**

```sql
CREATE TABLE test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,          -- SHA-256 hash of the key
  key_masked TEXT NOT NULL,        -- Masked key for display
  status TEXT NOT NULL,            -- valid/invalid/rate_limited
  api_type TEXT NOT NULL,
  model TEXT NOT NULL,
  error TEXT,
  is_rate_limit BOOLEAN DEFAULT 0,
  is_paid BOOLEAN,
  tested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_test_id (test_id),
  INDEX idx_status (status),
  INDEX idx_api_type (api_type)
);
```

**注意**：
- 完整的 API Key 不会存储在数据库中
- 仅存储 Key 的 SHA-256 hash 用于查重
- 支持通过 test_id 查询历史测试结果

## 免费额度

Cloudflare Workers Free Tier:
- ✅ 每天 100,000 次请求
- ✅ 免费 D1 数据库（100MB 存储，500 万行）
- ✅ 全球 CDN 加速
- ✅ 10ms CPU 时间/请求

对于个人和小团队使用完全免费！

## 安全建议

1. **强密码**：使用强随机字符串作为 `API_AUTH_TOKEN`
2. **HTTPS**：Cloudflare Workers 自动提供 HTTPS
3. **速率限制**：可以在代码中添加 IP 级别的速率限制
4. **Key 保护**：
   - 数据库中不存储完整 Key
   - TXT 格式输出需要额外权限验证
   - 使用 hash 防止重复测试

## 架构优势

### 与前端应用分离

- ✅ 前端应用保持纯静态（无需修改）
- ✅ API 服务独立部署和扩展
- ✅ 可以同时使用 Web UI 和 REST API
- ✅ 不影响现有功能

### Cloudflare Workers 优势

- ✅ 无服务器架构，无需管理服务器
- ✅ 全球 CDN，低延迟
- ✅ 自动扩展
- ✅ 成本极低（免费额度充足）

## 项目结构

```
api-server/
├── src/
│   ├── index.js              # Worker 入口
│   ├── handlers/             # 请求处理器
│   │   ├── test.js           # 测试接口
│   │   ├── results.js        # 结果查询接口
│   │   └── health.js         # 健康检查
│   ├── services/             # 复用前端的 API 测试逻辑
│   │   └── api/              # 各 API 提供商的测试函数
│   ├── utils/
│   │   ├── auth.js           # 认证中间件
│   │   ├── format.js         # 格式化输出（JSON/CSV/TXT）
│   │   └── crypto.js         # Key hash
│   └── db/
│       └── queries.js        # 数据库查询
├── schema.sql                # D1 数据库表结构
├── wrangler.toml             # Cloudflare Workers 配置
├── package.json
└── README.md                 # 本文件
```

## 下一步

1. 阅读 `src/index.js` 了解实现细节
2. 根据需要调整认证机制
3. 部署到 Cloudflare Workers
4. 测试 API 接口
5. 集成到你的应用

## 常见问题

**Q: 为什么使用 Cloudflare Workers 而不是传统服务器？**
A: 免费、无服务器、全球 CDN、自动扩展，适合这种轻量级 API。

**Q: 能否存储完整的 API Key？**
A: 不推荐。出于安全考虑，只存储 hash 和 masked 版本。

**Q: 如何限制请求频率？**
A: 可以使用 Cloudflare Workers KV 实现 IP 级别的速率限制（见代码注释）。

**Q: 能否支持更多 API 提供商？**
A: 可以，只需在 `services/api/` 中添加对应的测试函数。

## 许可证

MIT License