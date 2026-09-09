import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'LIMIT_EXCEEDED'
  | 'FEATURE_GATED'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_SERVER_ERROR'
  | 'BAD_GATEWAY';

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  request_id: string;
  pagination?: {
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
    totalCount?: number;
    nextCursor?: string | null;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: ApiErrorDetail[];
  };
  request_id: string;
}

export function generateRequestId(): string {
  return `req_${randomBytes(12).toString('hex')}`;
}

export function apiSuccess<T>(
  data: T,
  statusCode: number = 200,
  options?: {
    requestId?: string;
    pagination?: ApiSuccessResponse<T>['pagination'];
    headers?: Record<string, string>;
  }
): NextResponse {
  const requestId = options?.requestId || generateRequestId();
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    request_id: requestId,
    ...(options?.pagination ? { pagination: options.pagination } : {})
  };

  const responseHeaders = new Headers(options?.headers || {});
  responseHeaders.set('X-Request-Id', requestId);
  responseHeaders.set('Content-Type', 'application/json');

  return NextResponse.json(payload, {
    status: statusCode,
    headers: responseHeaders
  });
}

export function apiError(
  code: ApiErrorCode | string,
  message: string,
  statusCode: number = 400,
  options?: {
    details?: ApiErrorDetail[];
    requestId?: string;
    headers?: Record<string, string>;
  }
): NextResponse {
  const requestId = options?.requestId || generateRequestId();
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(options?.details && options.details.length > 0 ? { details: options.details } : {})
    },
    request_id: requestId
  };

  const responseHeaders = new Headers(options?.headers || {});
  responseHeaders.set('X-Request-Id', requestId);
  responseHeaders.set('Content-Type', 'application/json');

  return NextResponse.json(payload, {
    status: statusCode,
    headers: responseHeaders
  });
}
