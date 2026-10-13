import {faker} from '@faker-js/faker';
import {TestingModule} from '@nestjs/testing';
import {execSync} from 'child_process';
import {CommandRunnerModule} from 'nest-commander';
import {CommandTestFactory} from 'nest-commander-testing';
import {pipeline} from 'stream/promises';

import {cliModule} from '../../../src/application/cli/cli-module';
import {PsqlRestoreCommand} from '../../../src/application/cli/commands/restore/psql-restore-command';
import {RestoreOptionsKeys} from '../../../src/application/cli/commands/restore/types/restore-options';
import {
  createTestingModule,
  loggerService,
  s3Service,
} from '../../__mocks__/create-testing-module';

vi.mock('child_process', () => ({execSync: vi.fn()}));
vi.mock('fs', () => ({
  createWriteStream: vi.fn(),
  rmSync: vi.fn(),
  unlinkSync: vi.fn(),
}));
vi.mock('stream/promises', () => ({pipeline: vi.fn()}));
describe('Given a CLI command', () => {
  let command: PsqlRestoreCommand;

  const filename = `${faker.string.alphanumeric(10)}.sql.gz`;

  beforeEach(async () => {
    const moduleRef = await createTestingModule(cliModule).compile();
    command = moduleRef.get(PsqlRestoreCommand);
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  describe('Given command psql-restore', () => {
    it('Should run the psql restore command without logging an error', async () => {
      s3Service.send.mockResolvedValueOnce({Body: {}});

      vi.mocked(execSync).mockImplementationOnce(vi.fn());

      await command.run([], {[RestoreOptionsKeys.FILENAME]: filename});

      expect(loggerService.error).toHaveBeenCalledTimes(0);
    });

    it('Should leave the exit code unset when the restore succeeds', async () => {
      s3Service.send.mockResolvedValueOnce({Body: {}});

      vi.mocked(execSync).mockImplementationOnce(vi.fn());

      await command.run([], {[RestoreOptionsKeys.FILENAME]: filename});

      expect(process.exitCode).toBeUndefined();
    });

    it('Should log error when s3Service throws', async () => {
      const message = faker.lorem.words();

      s3Service.send.mockRejectedValueOnce(new Error(message));

      await command.run([], {[RestoreOptionsKeys.FILENAME]: filename});

      expect(loggerService.error).toHaveBeenCalledWith(
        {
          logId: 'restore.download-failed',
          engine: 'postgres',
          filename,
          err: new Error(message),
          errorName: 'Error',
          errorMessage: message,
        },
        'restore.download-failed',
        'RestoreService',
      );
    });

    it('Should set exit code 1 when the download fails', async () => {
      s3Service.send.mockRejectedValueOnce(new Error(faker.lorem.words()));

      await command.run([], {[RestoreOptionsKeys.FILENAME]: filename});

      expect(process.exitCode).toBe(1);
    });

    it('Should log error when writing the download to disk fails', async () => {
      s3Service.send.mockResolvedValueOnce({Body: {}});

      const message = faker.lorem.words();

      vi.mocked(pipeline).mockRejectedValueOnce(new Error(message));

      await command.run([], {[RestoreOptionsKeys.FILENAME]: filename});

      expect(loggerService.error).toHaveBeenCalledWith(
        {
          logId: 'restore.download-failed',
          engine: 'postgres',
          filename,
          err: new Error(message),
          errorName: 'Error',
          errorMessage: message,
        },
        'restore.download-failed',
        'RestoreService',
      );
    });

    it('Should log error when execSync throws', async () => {
      s3Service.send.mockResolvedValueOnce({Body: {}});

      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('psql restore failed');
      });

      await command.run([], {[RestoreOptionsKeys.FILENAME]: filename});

      expect(loggerService.error).toHaveBeenCalledWith(
        {
          logId: 'restore.restore-failed',
          engine: 'postgres',
          filename,
          err: new Error('psql restore failed'),
          errorName: 'Error',
          errorMessage: 'psql restore failed',
        },
        'restore.restore-failed',
        'RestoreService',
      );
    });

    it('Should set exit code 1 when the restore fails', async () => {
      s3Service.send.mockResolvedValueOnce({Body: {}});

      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('psql restore failed');
      });

      await command.run([], {[RestoreOptionsKeys.FILENAME]: filename});

      expect(process.exitCode).toBe(1);
    });

    it('Should log generic error when s3Service throws a non-Error during download', async () => {
      s3Service.send.mockImplementationOnce(() => {
        throw faker.lorem.word();
      });

      await command.run([], {[RestoreOptionsKeys.FILENAME]: filename});

      expect(loggerService.error).toHaveBeenCalledWith(
        {
          logId: 'restore.download-failed',
          engine: 'postgres',
          filename,
          err: new Error('Error downloading file from S3'),
          errorName: 'Error',
          errorMessage: 'Error downloading file from S3',
        },
        'restore.download-failed',
        'RestoreService',
      );
    });

    it('Should return the value passed when parsing filename option', () => {
      const value = `${faker.string.alphanumeric(10)}.sql.gz`;

      expect(command.parseFilename(value)).toBe(value);
    });

    it('Should skip S3 download when --local flag is passed', async () => {
      vi.mocked(execSync).mockImplementationOnce(vi.fn());

      await command.run([], {
        [RestoreOptionsKeys.FILENAME]: filename,
        [RestoreOptionsKeys.LOCAL]: true,
      });

      expect(loggerService.error).toHaveBeenCalledTimes(0);
    });

    it('Should return true when parsing local option', () => {
      expect(command.parseLocal()).toBeTruthy();
    });
  });

  describe('Given the psql-restore command line', () => {
    let app: TestingModule;

    beforeEach(async () => {
      app = await createTestingModule({
        ...cliModule,
        imports: [
          ...(cliModule.imports ?? []),
          CommandRunnerModule.forModule(),
        ],
      }).compile();
    });

    it('Should dispatch psql-restore to the restore command', async () => {
      const run = vi.spyOn(app.get(PsqlRestoreCommand), 'run');

      vi.mocked(execSync).mockImplementationOnce(vi.fn());

      await CommandTestFactory.run(app, [
        'psql-restore',
        '--local',
        '-f',
        filename,
      ]);

      expect(run).toHaveBeenCalledWith([], {
        [RestoreOptionsKeys.FILENAME]: filename,
        [RestoreOptionsKeys.LOCAL]: true,
      });
    });

    it('Should dispatch the deprecated psql-rollup alias to the restore command', async () => {
      const run = vi.spyOn(app.get(PsqlRestoreCommand), 'run');

      vi.mocked(execSync).mockImplementationOnce(vi.fn());

      await CommandTestFactory.run(app, [
        'psql-rollup',
        '--local',
        '-f',
        filename,
      ]);

      expect(run).toHaveBeenCalledWith([], {
        [RestoreOptionsKeys.FILENAME]: filename,
        [RestoreOptionsKeys.LOCAL]: true,
      });
    });
  });
});
