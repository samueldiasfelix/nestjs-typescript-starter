import {
  ArgumentsHost,
  BadGatewayException,
  Catch,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { StorageError } from '@nestjs/storage';

/**
 * Maps storage errors to HTTP responses. Caller mistakes carry a 4xx `status`
 * (missing file 404, invalid key 400, conflict 409, bad signed URL 403); the
 * rest, such as `StorageServiceError` from the object store, become 502.
 */
@Catch(StorageError)
export class StorageErrorFilter extends BaseExceptionFilter {
  catch(error: StorageError, host: ArgumentsHost) {
    const status = (error as { status?: unknown }).status;
    const exception =
      typeof status === 'number'
        ? new HttpException(error.message, status, { cause: error })
        : new BadGatewayException('Storage service error', { cause: error });
    super.catch(exception, host);
  }
}
