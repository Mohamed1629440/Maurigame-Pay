import { NextResponse } from 'next/server';

export type ApiErrorType =
  | 'invalid_request_error'
  | 'authentication_error'
  | 'permission_error'
  | 'rate_limit_error'
  | 'api_error';

export type ApiErrorCode =
  | 'missing_param'
  | 'invalid_param'
  | 'invalid_url'
  | 'invalid_api_key'
  | 'kyc_required'
  | 'scope_missing'
  | 'resource_missing'
  | 'idempotency_conflict'
  | 'intent_already_paid'
  | 'intent_not_pending'
  | 'amount_too_low'
  | 'amount_too_high'
  | 'no_operator_for_method'
  | 'multiple_operators_specify_id'
  | 'unknown_method'
  | 'too_many_requests'
  | 'internal_error'
  | 'test_mode_only';

export type ApiError = {
  type: ApiErrorType;
  code: ApiErrorCode;
  message: string;
  param?: string;
};

export function errorResponse(status: number, err: ApiError): NextResponse {
  return NextResponse.json({ error: err }, { status });
}

// Helpers ------------------------------------------------------------

export const errBadRequest = (code: ApiErrorCode, message: string, param?: string) =>
  errorResponse(400, { type: 'invalid_request_error', code, message, param });

export const errUnauthorized = (message = 'Invalid API key') =>
  errorResponse(401, { type: 'authentication_error', code: 'invalid_api_key', message });

export const errForbidden = (code: ApiErrorCode, message: string) =>
  errorResponse(403, { type: 'permission_error', code, message });

export const errNotFound = (resource: string) =>
  errorResponse(404, { type: 'invalid_request_error', code: 'resource_missing', message: `${resource} not found` });

export const errConflict = (code: ApiErrorCode, message: string) =>
  errorResponse(409, { type: 'invalid_request_error', code, message });

export const errUnprocessable = (code: ApiErrorCode, message: string, param?: string) =>
  errorResponse(422, { type: 'invalid_request_error', code, message, param });

export const errRateLimit = (resetIn: number) => {
  const res = errorResponse(429, {
    type: 'rate_limit_error',
    code: 'too_many_requests',
    message: `Rate limit exceeded. Retry in ${resetIn}s.`,
  });
  res.headers.set('Retry-After', String(resetIn));
  return res;
};

export const errInternal = (message = 'Internal server error') =>
  errorResponse(500, { type: 'api_error', code: 'internal_error', message });
