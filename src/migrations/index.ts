import * as migration_20260824_152959_add_ach_location_stories from './20260824_152959_add_ach_location_stories';

export const migrations = [
  {
    up: migration_20260824_152959_add_ach_location_stories.up,
    down: migration_20260824_152959_add_ach_location_stories.down,
    name: '20260824_152959_add_ach_location_stories'
  },
];
