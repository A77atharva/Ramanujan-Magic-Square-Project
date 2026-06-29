import { Router } from 'express';
import { getDb } from '../db.js';
import { generateMagicSquare } from '../magicSquare.js';
import { generateBirthdayPDF } from '../pdfGenerator.js';
import { sendBirthdayEmail, isEmailConfigured } from '../emailService.js';

const router = Router();

router.post('/send-birthday-email/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid employee ID' }); return; }

  if (!isEmailConfigured()) {
    res.status(503).json({ error: 'Email is not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.' });
    return;
  }

  const emp = getDb().prepare('SELECT * FROM employees WHERE id = ?').get(id) as {
    id: number; name: string; email: string; date_of_birth: string;
  } | undefined;

  if (!emp) { res.status(404).json({ error: 'Employee not found' }); return; }

  try {
    const orgs = getDb().prepare('SELECT * FROM organizations ORDER BY sr LIMIT 1').all() as Array<{
      org_name: string; logo_data: string | null;
    }>;
    const orgCtx = orgs.length > 0
      ? { orgName: orgs[0].org_name, logoData: orgs[0].logo_data }
      : undefined;

    const squareData = generateMagicSquare(emp.name, emp.date_of_birth);
    const pdfBuffer = await generateBirthdayPDF(squareData, orgCtx);
    await sendBirthdayEmail(emp.email, emp.name, emp.date_of_birth, squareData.magicConstant, pdfBuffer, orgCtx?.orgName);

    console.log(`[Email] Manual send: birthday email sent to ${emp.name} <${emp.email}>`);
    res.json({ success: true, message: `Birthday email sent to ${emp.email}` });
  } catch (err: any) {
    console.error('[Email] Send failed:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to send email' });
  }
});

export default router;
