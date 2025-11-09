-- Cloudflare D1 数据库表结构

-- 测试结果表
CREATE TABLE IF NOT EXISTS test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_masked TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('valid', 'invalid', 'rate_limited', 'testing', 'pending')),
  api_type TEXT NOT NULL,
  model TEXT NOT NULL,
  error TEXT,
  is_rate_limit INTEGER DEFAULT 0,
  is_paid INTEGER,
  tested_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_test_id ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_api_type ON test_results(api_type);
CREATE INDEX IF NOT EXISTS idx_key_hash ON test_results(key_hash);
CREATE INDEX IF NOT EXISTS idx_tested_at ON test_results(tested_at DESC);

-- 测试会话表（存储测试元数据）
CREATE TABLE IF NOT EXISTS test_sessions (
  test_id TEXT PRIMARY KEY,
  api_type TEXT NOT NULL,
  model TEXT NOT NULL,
  total_keys INTEGER NOT NULL,
  valid_count INTEGER DEFAULT 0,
  invalid_count INTEGER DEFAULT 0,
  rate_limited_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_session_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_created ON test_sessions(created_at DESC);