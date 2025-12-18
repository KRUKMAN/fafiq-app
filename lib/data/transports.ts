import { transportSchema, Transport } from '@/schemas/transport';
import { getMockTransports } from '@/lib/mocks/transports';

export const fetchTransports = async (orgId: string): Promise<Transport[]> => {
  const transports = await getMockTransports(orgId);
  return transports.map((t) => transportSchema.parse(t));
};
