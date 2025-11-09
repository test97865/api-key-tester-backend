/**
 * 数据库查询函数
 */

/**
 * 创建测试会话
 */
export async function createTestSession(db, data) {
  const { test_id, api_type, model, total_keys } = data;

  await db.prepare(
    `INSERT INTO test_sessions (test_id, api_type, model, total_keys, status)
     VALUES (?, ?, ?, ?, 'running')`
  ).bind(test_id, api_type, model, total_keys).run();
}

/**
 * 更新测试会话
 */
export async function updateTestSession(db, testId, data) {
  const { valid_count, invalid_count, rate_limited_count, status } = data;

  await db.prepare(
    `UPDATE test_sessions
     SET valid_count = ?,
         invalid_count = ?,
         rate_limited_count = ?,
         status = ?,
         completed_at = datetime('now')
     WHERE test_id = ?`
  ).bind(valid_count, invalid_count, rate_limited_count, status, testId).run();
}

/**
 * 获取测试会话
 */
export async function getTestSession(db, testId) {
  const result = await db.prepare(
    `SELECT * FROM test_sessions WHERE test_id = ?`
  ).bind(testId).first();

  return result;
}

/**
 * 保存测试结果
 */
export async function saveTestResult(db, data) {
  const {
    test_id,
    key_hash,
    key_masked,
    status,
    api_type,
    model,
    error,
    is_rate_limit,
    is_paid
  } = data;

  await db.prepare(
    `INSERT INTO test_results
     (test_id, key_hash, key_masked, status, api_type, model, error, is_rate_limit, is_paid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    test_id,
    key_hash,
    key_masked,
    status,
    api_type,
    model,
    error,
    is_rate_limit,
    is_paid
  ).run();
}

/**
 * 获取测试结果
 */
export async function getTestResults(db, testId, options = {}) {
  const { status, apiType, page = 1, pageSize = 50 } = options;
  const offset = (page - 1) * pageSize;

  let query = 'SELECT * FROM test_results WHERE test_id = ?';
  const bindings = [testId];

  // 添加过滤条件
  if (status) {
    query += ' AND status = ?';
    bindings.push(status);
  }

  if (apiType) {
    query += ' AND api_type = ?';
    bindings.push(apiType);
  }

  // 排序和分页
  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  bindings.push(pageSize, offset);

  const result = await db.prepare(query).bind(...bindings).all();
  return result.results || [];
}