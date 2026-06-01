import type { Field } from 'payload'

const NON_DATA_TYPES = new Set([
  'ui',
  'tabs',
  'row',
  'collapsible',
  'group',
  'array',
  'blocks',
  'join',
])

function isDataField(field: Field): boolean {
  if (!('name' in field) || !field.name) return false
  return !NON_DATA_TYPES.has(field.type)
}

/** Collect dotted Payload paths for data fields on the Artworks collection config. */
export function collectArtworkFieldPaths(fields: Field[], prefix = ''): Set<string> {
  const paths = new Set<string>()

  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        for (const p of collectArtworkFieldPaths(tab.fields, prefix)) paths.add(p)
      }
      continue
    }

    if (field.type === 'row' || field.type === 'collapsible') {
      for (const p of collectArtworkFieldPaths(field.fields, prefix)) paths.add(p)
      continue
    }

    if (!('name' in field) || !field.name) continue

    const path = prefix ? `${prefix}.${field.name}` : field.name

    if (field.type === 'group') {
      paths.add(path) // Group itself is a valid staging target (agent may stage as an object)
      for (const p of collectArtworkFieldPaths(field.fields, path)) paths.add(p)
      continue
    }

    if (field.type === 'array' || field.type === 'blocks') {
      paths.add(path)
      continue
    }

    if (isDataField(field)) {
      paths.add(path)
    }
  }

  return paths
}
