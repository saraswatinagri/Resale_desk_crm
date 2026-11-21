import { PUBLIC_PROPERTY_COLUMNS, toPublicProperty } from '../_lib/public-property';
import { getAdminClient, sendError, setPublicCors } from '../_lib/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROPERTY_CODE = /^[A-Z]{2}-\d{3,6}$/i;

export default async function handler(req: any, res: any) {
  setPublicCors(res, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const id = String(req.query?.id || '').trim();
  // The id goes into a database filter, so it must be exactly an id or a property code.
  const column = UUID.test(id) ? 'id' : PROPERTY_CODE.test(id) ? 'property_code' : null;
  if (!column) {
    return res.status(400).json({ success: false, error: 'Valid property ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await getAdminClient()
        .from('resale_properties')
        .select(PUBLIC_PROPERTY_COLUMNS)
        .eq(column, column === 'property_code' ? id.toUpperCase() : id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, error: 'Property not found' });

      return res.status(200).json({
        success: true,
        data: toPublicProperty(data as unknown as Record<string, unknown>),
      });
    } catch (err) {
      return sendError(res, err, 'api/properties/[id]');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
