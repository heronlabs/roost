import {Logger} from '@nestjs/common';
import {rmSync, unlinkSync} from 'fs';

import {redact} from '../../infrastructure/log/redact';
import {S3StorageService} from '../../infrastructure/storage/services/s3-storage-service';

export abstract class RestoreService {
  protected abstract readonly engine: 'postgres' | 'mysql';

  protected abstract restore(
    filename: string,
  ): Promise<
    {ok: true; data: {backupFileName: string}} | {ok: false; error: Error}
  >;

  public async run(filename: string, local: boolean) {
    if (!local) {
      const {error: downloadError} =
        await this.s3StorageService.download(filename);

      if (downloadError) {
        rmSync(filename, {force: true});
        this.logger.error(
          {
            logId: 'restore.download-failed',
            engine: this.engine,
            filename,
            err: downloadError,
            errorName: downloadError.name,
            errorMessage: redact(downloadError.message),
          },
          'restore.download-failed',
          RestoreService.name,
        );
        return {ok: false};
      }
    }

    const result = await this.restore(filename);

    if (!result.ok) {
      this.logger.error(
        {
          logId: 'restore.restore-failed',
          engine: this.engine,
          filename,
          err: result.error,
          errorName: result.error.name,
          errorMessage: redact(result.error.message),
        },
        'restore.restore-failed',
        RestoreService.name,
      );
      this.deleteDownloadedFile(filename, local);
      return {ok: false};
    }

    this.logger.log(
      {
        logId: 'restore.completed',
        engine: this.engine,
        filename: result.data.backupFileName,
      },
      'restore.completed',
      RestoreService.name,
    );

    this.deleteDownloadedFile(filename, local);

    return {ok: true};
  }

  private deleteDownloadedFile(filename: string, local: boolean) {
    if (local) {
      return;
    }

    unlinkSync(filename);
    this.logger.log(
      {
        logId: 'restore.downloaded-file-deleted',
        engine: this.engine,
        filename,
      },
      'restore.downloaded-file-deleted',
      RestoreService.name,
    );
  }

  constructor(
    protected readonly logger: Logger,
    protected readonly s3StorageService: S3StorageService,
  ) {}
}
