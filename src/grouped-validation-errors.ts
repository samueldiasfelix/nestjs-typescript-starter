import { BadRequestException } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/** Key for issues without a path, such as a failed `@Param('id', { schema })`. */
export const ROOT_KEY = '_root';

/** Same budget as the built-in exception factory, to bound the response size. */
const MAX_MESSAGES_LENGTH = 1_000_000;

/**
 * Builds the "grouped" error response of `ValidationPipe` for
 * `StandardSchemaValidationPipe`, which has no `errorFormat` option:
 * `message` maps each property path to its messages.
 */
export function groupedValidationErrors(
  issues: readonly StandardSchemaV1.Issue[],
): BadRequestException {
  const message: Record<string, string[]> = {};
  let remaining = MAX_MESSAGES_LENGTH;

  for (const issue of issues) {
    if (remaining <= 0) {
      message['...'] = ['Further validation errors were omitted.'];
      break;
    }
    const key = issue.path?.length
      ? issue.path
          .map((segment) =>
            String(typeof segment === 'object' ? segment.key : segment),
          )
          .join('.')
      : ROOT_KEY;
    remaining -= key.length + issue.message.length;
    message[key] ??= [];
    message[key].push(issue.message);
  }

  return new BadRequestException({
    message,
    error: 'Bad Request',
    statusCode: 400,
  });
}
