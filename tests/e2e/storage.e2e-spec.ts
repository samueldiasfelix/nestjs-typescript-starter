import { Public } from '@nestjs/authentication';
import { Controller, Get, Param } from '@nestjs/common';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import {
  InMemoryDisk,
  STORAGE_MODULE_OPTIONS,
  StorageDisk,
} from '@nestjs/storage';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

@Public()
@Controller('files')
class FilesTestController {
  constructor(private readonly files: StorageDisk) {}

  @Get(':key')
  read(@Param('key') key: string) {
    return this.files.getText(key);
  }
}

describe('Storage (e2e)', () => {
  let app: NestNodeApplication;
  let files: StorageDisk;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [FilesTestController],
    })
      .overrideProvider(STORAGE_MODULE_OPTIONS)
      .useValue({ disks: { files: new InMemoryDisk() } })
      .compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
    files = app.get(StorageDisk);
  });

  afterEach(async () => {
    await app.close();
  });

  it('writes, reads and deletes a file', async () => {
    await files.put('a.txt', 'hi');

    expect(await files.getText('a.txt')).toBe('hi');
    expect(await files.exists('a.txt')).toBe(true);

    await files.delete('a.txt');

    expect(await files.exists('a.txt')).toBe(false);
  });

  it('serves an existing file', async () => {
    await files.put('b.txt', 'hello');

    const res = await app.inject({ method: 'GET', url: '/files/b.txt' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('hello');
  });

  it('maps a missing file to 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/files/missing.txt' });

    expect(res.statusCode).toBe(404);
  });
});
