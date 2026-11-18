import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';

/**
 * App-wide defaults for outbound HTTP. Feature modules create their clients
 * with `HttpClientModule.register({ baseUrl })`.
 */
@Module({
  // No timeout by default would let a hung upstream block a request forever.
  imports: [HttpClientModule.forRoot({ timeout: '10s' })],
})
export class AppHttpClientModule {}
