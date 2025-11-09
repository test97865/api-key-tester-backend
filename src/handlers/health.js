/**
 * 健康检查处理器
 */

import { successResponse } from '../index.js';

export function handleHealth() {
  return successResponse({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}