import { profileSchema, Profile } from '@/schemas/profile';

const profilesList: Profile[] = [
  profileSchema.parse({
    user_id: 'user_123',
    full_name: 'Alex Demo',
    avatar_url: null,
  }),
  profileSchema.parse({
    user_id: 'user_456',
    full_name: 'Maria Garcia',
    avatar_url: null,
  }),
];

export const getMockProfiles = async (): Promise<Profile[]> => profilesList;
