import * as migration_20260501_120645_rename_artwork_fields from './20260501_120645_rename_artwork_fields';
import * as migration_20260501_121000_rename_exhibitions_to_events from './20260501_121000_rename_exhibitions_to_events';
import * as migration_20260501_121900_extract_bernard_to_artist_global from './20260501_121900_extract_bernard_to_artist_global';
import * as migration_20260502_enable_pgvector from './20260502_enable_pgvector';

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
  {
    up: migration_20260501_121900_extract_bernard_to_artist_global.up,
    down: migration_20260501_121900_extract_bernard_to_artist_global.down,
    name: '20260501_121900_extract_bernard_to_artist_global'
  },
  {
    up: migration_20260502_enable_pgvector.up,
    down: migration_20260502_enable_pgvector.down,
    name: '20260502_enable_pgvector'
  },
];
