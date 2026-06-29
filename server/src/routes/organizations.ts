import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';

const router = Router();

const OrgBody = z.object({
  sr: z.number().int().min(1),
  orgName: z.string().min(1),
  csvName: z.string().min(1),
  logoName: z.string().optional().nullable(),
  logoData: z.string().optional().nullable(),
});

function mapOrg(o: any) {
  return { id: o.id, sr: o.sr, orgName: o.org_name, csvName: o.csv_name, logoName: o.logo_name ?? null, logoData: o.logo_data ?? null, createdAt: o.created_at };
}

router.get('/organizations', (_req, res) => {
  try {
    const rows = getDb().prepare('SELECT * FROM organizations ORDER BY sr').all();
    res.json(rows.map(mapOrg));
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/organizations', (req, res) => {
  const p = OrgBody.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  try {
    const row = getDb()
      .prepare('INSERT INTO organizations (sr, org_name, csv_name, logo_name, logo_data) VALUES (?, ?, ?, ?, ?) RETURNING *')
      .get(p.data.sr, p.data.orgName, p.data.csvName, p.data.logoName ?? null, p.data.logoData ?? null) as any;
    res.status(201).json(mapOrg(row));
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/organizations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  const p = OrgBody.partial().safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const d = p.data;
  try {
    const fields: string[] = [];
    const vals: any[] = [];
    if (d.sr !== undefined) { fields.push('sr = ?'); vals.push(d.sr); }
    if (d.orgName !== undefined) { fields.push('org_name = ?'); vals.push(d.orgName); }
    if (d.csvName !== undefined) { fields.push('csv_name = ?'); vals.push(d.csvName); }
    if (d.logoName !== undefined) { fields.push('logo_name = ?'); vals.push(d.logoName ?? null); }
    if (d.logoData !== undefined) { fields.push('logo_data = ?'); vals.push(d.logoData ?? null); }
    if (!fields.length) { res.status(400).json({ error: 'No fields to update' }); return; }
    vals.push(id);
    const row = getDb().prepare(`UPDATE organizations SET ${fields.join(', ')} WHERE id = ? RETURNING *`).get(...vals) as any;
    if (!row) { res.status(404).json({ error: 'Organization not found' }); return; }
    res.json(mapOrg(row));
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/organizations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const row = getDb().prepare('DELETE FROM organizations WHERE id = ? RETURNING *').get(id) as any;
    if (!row) { res.status(404).json({ error: 'Organization not found' }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
