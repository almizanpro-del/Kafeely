/**
 * POST /api/waitlist/verify — completes the double opt-in (FR-01/FR-03).
 * The token is single-use, hashed at rest, and expires after 48 hours.
 */

import { getDb } from '../_lib/db.ts';
import { assertMethod, assertSameOrigin, readJsonBody, toHandler } from '../_lib/http.ts';
import { verifyWaitlist } from '../_lib/services/waitlist.ts';
import { waitlistVerifySchema } from '../_lib/validation.ts';

const handler = toHandler(async (req, res) => {
  assertMethod(req, 'POST');
  assertSameOrigin(req);
  const { token } = waitlistVerifySchema.parse(await readJsonBody(req));

  const result = await verifyWaitlist(getDb(), token);
  res.status(200).json(result);
});

export default handler;
