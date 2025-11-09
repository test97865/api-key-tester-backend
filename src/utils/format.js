/**
 * 格式化输出工具
 */

/**
 * 格式化为 JSON
 */
export function formatJSON(data) {
  return {
    body: JSON.stringify(data, null, 2),
    contentType: 'application/json'
  };
}

/**
 * 格式化为 CSV
 */
export function formatCSV(items) {
  if (!items || items.length === 0) {
    return {
      body: '',
      contentType: 'text/csv'
    };
  }

  // CSV Header
  const headers = [
    'key_masked',
    'status',
    'api_type',
    'model',
    'error',
    'is_rate_limit',
    'is_paid',
    'tested_at'
  ];

  let csv = headers.join(',') + '\n';

  // CSV Rows
  for (const item of items) {
    const row = [
      escapeCsvField(item.key_masked || ''),
      escapeCsvField(item.status || ''),
      escapeCsvField(item.api_type || ''),
      escapeCsvField(item.model || ''),
      escapeCsvField(item.error || ''),
      item.is_rate_limit ? 'true' : 'false',
      item.is_paid === null ? '' : (item.is_paid ? 'true' : 'false'),
      escapeCsvField(item.tested_at || '')
    ];
    csv += row.join(',') + '\n';
  }

  return {
    body: csv,
    contentType: 'text/csv; charset=utf-8'
  };
}

/**
 * 格式化为 TXT（仅输出 Key）
 */
export function formatTXT(items, showFullKey = false) {
  if (!items || items.length === 0) {
    return {
      body: '',
      contentType: 'text/plain'
    };
  }

  // TXT 格式：每行一个 Key
  let txt = '';
  for (const item of items) {
    // 注意：完整 Key 不存储在数据库中，这里只能输出 masked 版本
    // 如果需要输出完整 Key，需要在测试时临时存储（不推荐）
    const key = showFullKey ? item.key : item.key_masked;
    txt += key + '\n';
  }

  return {
    body: txt,
    contentType: 'text/plain; charset=utf-8'
  };
}

/**
 * CSV 字段转义
 */
function escapeCsvField(field) {
  if (field === null || field === undefined) {
    return '';
  }

  const str = String(field);

  // 如果包含逗号、引号或换行符，需要用引号包裹并转义内部引号
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}