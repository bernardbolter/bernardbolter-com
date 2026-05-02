import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['artist'],
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Artist', value: 'artist' },
      ],
      access: {
        read: () => true,
        update: ({ req: { user } }) =>
          Boolean(
            user &&
              Array.isArray((user as { roles?: string[] }).roles) &&
              (user as { roles: string[] }).roles.includes('admin'),
          ),
      },
    },
  ],
}
