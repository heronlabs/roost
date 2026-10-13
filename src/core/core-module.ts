import {Logger, Module, ModuleMetadata} from '@nestjs/common';

import {EnvironmentModule} from '../infrastructure/environment/environment-module';
import {StorageModule} from '../infrastructure/storage/storage-module';
import {MysqlBackupService} from './services/mysql/mysql-backup-service';
import {MysqlRestoreService} from './services/mysql/mysql-restore-service';
import {PsqlBackupService} from './services/psql/psql-backup-service';
import {PsqlRestoreService} from './services/psql/psql-restore-service';
import {ScriptLoaderService} from './services/script-loader-service';

const coreModule: ModuleMetadata = {
  imports: [EnvironmentModule, StorageModule],
  providers: [
    Logger,
    ScriptLoaderService,
    MysqlBackupService,
    MysqlRestoreService,
    PsqlBackupService,
    PsqlRestoreService,
  ],
  exports: [
    ScriptLoaderService,
    MysqlBackupService,
    MysqlRestoreService,
    PsqlBackupService,
    PsqlRestoreService,
  ],
};
@Module(coreModule)
export class CoreModule {}
