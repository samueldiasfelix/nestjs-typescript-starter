import { InMemoryMailTransport, Mailer, MailTransport } from '@nestjs/mail';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module.js';

describe('Mail (e2e)', () => {
  let app: NestNodeApplication;
  let mailbox: InMemoryMailTransport;

  beforeEach(async () => {
    mailbox = new InMemoryMailTransport();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailTransport)
      .useValue(mailbox)
      .compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('sends nothing until asked', () => {
    mailbox.assertNotSent();
  });

  it('sends a mail through the configured transport', async () => {
    const result = await app.get(Mailer).send({
      to: 'ada@example.com',
      subject: 'Hi',
      html: '<p>Hello</p>',
    });

    expect(result.messageId).toBeTruthy();
    mailbox.assertSent({ to: 'ada@example.com' });
  });
});
