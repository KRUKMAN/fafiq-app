import { profileSchema, Profile } from '@/schemas/profile';
import { getMockProfiles } from '@/lib/mocks/profiles';

export const fetchProfiles = async (): Promise<Profile[]> => {
  const profiles = await getMockProfiles();
  return profiles.map((profile) => profileSchema.parse(profile));
};
