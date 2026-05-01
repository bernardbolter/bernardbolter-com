import * as migration_20260501_120645_rename_artwork_fields from './20260501_120645_rename_artwork_fields';
import * as migration_20260501_121000_rename_exhibitions_to_events from './20260501_121000_rename_exhibitions_to_events';

export const migrations = [
  {
    up: migration_20260501_120645_rename_artwork_fields.up,
    down: migration_20260501_120645_rename_artwork_fields.down,
    name: '20260501_120645_rename_artwork_fields'
  },
  {
    up: migration_20260501_121000_rename_exhibitions_to_events.up,
    down: migration_20260501_121000_rename_exhibitions_to_events.down,
    name: '20260501_121000_rename_exhibitions_to_events'
  },
];
