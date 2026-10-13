import {Logger, Module, ModuleMetadata} from '@nestjs/common';

import {CoreModule} from '../../core/core-module';
import {LogModule} from '../../infrastructure/log/log-module';
import {MysqlBackupCommand} from './commands/backup/mysql-backup-command';
import {PsqlBackupCommand} from './commands/backup/psql-backup-command';
import {MysqlRestoreCommand} from './commands/restore/mysql-restore-command';
import {PsqlRestoreCommand} from './commands/restore/psql-restore-command';
import {VersionCommand} from './commands/version/version-command';

export const cliModule: ModuleMetadata = {
  imports: [LogModule, CoreModule],
  providers: [
    Logger,
    VersionCommand,
    PsqlBackupCommand,
    PsqlRestoreCommand,
    MysqlBackupCommand,
    MysqlRestoreCommand,
  ],
};

@Module(cliModule)
export class CliModule {}
