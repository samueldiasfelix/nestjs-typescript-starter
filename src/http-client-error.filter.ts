import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { HttpClientError, toHttpException } from '@nestjs/http-client';

/**
 * Maps upstream failures of `HttpClient` (non-2xx, timeout, network, parse)
 * to 502 Bad Gateway or 504 Gateway Timeout instead of a generic 500.
 */
@Catch(HttpClientError)
export class HttpClientErrorFilter extends BaseExceptionFilter {
  catch(error: HttpClientError, host: ArgumentsHost) {
    super.catch(toHttpException(error), host);
  }
}
