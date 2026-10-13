export enum RestoreOptionsKeys {
  FILENAME = 'filename',
  LOCAL = 'local',
}

export type RestoreOptions = {
  [RestoreOptionsKeys.FILENAME]: string;
  [RestoreOptionsKeys.LOCAL]?: boolean;
};
