import {Command, CommandRunner, Option} from 'nest-commander';

import {PsqlRestoreService} from '../../../../core/services/psql/psql-restore-service';
import {RestoreOptions, RestoreOptionsKeys} from './types/restore-options';

@Command({
  name: 'psql-restore',
  aliases: ['psql-rollup'],
  description:
    'Restore a PostgreSQL database from a backup file (S3 by default, or local filesystem with --local). psql-rollup is a deprecated alias',
})
export class PsqlRestoreCommand extends CommandRunner {
  @Option({
    flags: `-f, --${RestoreOptionsKeys.FILENAME} <filename>`,
    description:
      'Backup filename to restore (e.g. mydb-2026-03-05T12-00-00Z.sql.gz)',
    required: true,
  })
  parseFilename(val: string): string {
    return val;
  }

  @Option({
    flags: `--${RestoreOptionsKeys.LOCAL}`,
    description:
      'Read backup from the local filesystem instead of S3 (default: S3)',
  })
  parseLocal(): boolean {
    return true;
  }

  public async run(_args: string[], options: RestoreOptions) {
    const result = await this.psqlRestoreService.run(
      options[RestoreOptionsKeys.FILENAME],
      options[RestoreOptionsKeys.LOCAL] ?? false,
    );

    if (!result.ok) {
      process.exitCode = 1;
    }
  }

  constructor(private readonly psqlRestoreService: PsqlRestoreService) {
    super();
  }
}
