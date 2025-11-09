/**
 * 测试结果查询处理器
 */

import { getTestResults, getTestSession } from '../db/queries.js';
import { formatJSON, formatCSV, formatTXT } from '../utils/format.js';

/**
 * 处理结果查询请求
 */
export async function handleResults(testId, searchParams, env) {
  if (!testId) {
    return errorResponse('Missing test_id', 400);
  }

  // 解析查询参数
  const format = searchParams.get('format') || 'json';
  const filterStatus = searchParams.get('filter_status');
  const filterApiType = searchParams.get('filter_api_type');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(
    parseInt(searchParams.get('page_size') || '50', 10),
    100 // 最大 100
  );

  // 验证格式
  if (!['json', 'csv', 'txt'].includes(format)) {
    return errorResponse('Invalid format. Must be: json, csv, or txt', 400);
  }

  try {
    // 查询测试会话
    const session = await getTestSession(env.DB, testId);
    if (!session) {
      return errorResponse('Test not found', 404);
    }

    // 查询测试结果
    const results = await getTestResults(env.DB, testId, {
      status: filterStatus,
      apiType: filterApiType,
      page,
      pageSize
    });

    // 根据格式返回
    if (format === 'json') {
      const data = formatJSON({
        total: session.total_keys,
        page,
        page_size: pageSize,
        returned: results.length,
        session: {
          api_type: session.api_type,
          model: session.model,
          status: session.status,
          created_at: session.created_at,
          completed_at: session.completed_at
        },
        summary: {
          valid: session.valid_count,
          invalid: session.invalid_count,
          rate_limited: session.rate_limited_count
        },
        items: results.map(r => ({
          key_masked: r.key_masked,
          status: r.status,
          api_type: r.api_type,
          model: r.model,
          error: r.error,
          is_rate_limit: Boolean(r.is_rate_limit),
          is_paid: r.is_paid === null ? null : Boolean(r.is_paid),
          tested_at: r.tested_at
        }))
      });

      return new Response(data.body, {
        status: 200,
        headers: {
          'Content-Type': data.contentType,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (format === 'csv') {
      const data = formatCSV(results);
      return new Response(data.body, {
        status: 200,
        headers: {
          'Content-Type': data.contentType,
          'Content-Disposition': `attachment; filename="test_${testId}.csv"`,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (format === 'txt') {
      const data = formatTXT(results, false); // 不显示完整 Key
      return new Response(data.body, {
        status: 200,
        headers: {
          'Content-Type': data.contentType,
          'Content-Disposition': `attachment; filename="test_${testId}.txt"`,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

  } catch (error) {
    console.error('Error retrieving results:', error);
    return errorResponse('Failed to retrieve results: ' + error.message, 500);
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