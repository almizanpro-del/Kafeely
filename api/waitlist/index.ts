/**
 * POST /api/waitlist — public waiting-list / interest submission (FR-01…
 * FR-03). Always answers with the same generic message: the caller never
 * learns whether the address was already on the list.
 */

import { getDb } from '../_lib/db.ts';
import { assertMethod, assertSameOrigin, clientIp, readJsonBody, toHandler } from '../_lib/http.ts';
import { getMailer } from '../_lib/mailer.ts';
import { submitWaitlist } from '../_lib/services/waitlist.ts';
import { waitlistSubmissionSchema } from '../_lib/validation.ts';

const handler = toHandler(async (req, res) => {
  assertMethod(req, 'POST');
  assertSameOrigin(req);
  const input = waitlistSubmissionSchema.parse(await readJsonBody(req));

  const result = await submitWaitlist(getDb(), input, {
    ip: clientIp(req),
    mailer: getMailer(),
  });

  res.status(202).json(result);
});

export default handler;
