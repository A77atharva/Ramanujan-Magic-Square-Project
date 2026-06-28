import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';

const router = Router();

const CreateBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  dateOfBirth: z.string(),
  mobile: z.string().optional().nullable(),
});

const BulkBody = z.object({
  employees: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    dateOfBirth: z.string(),
    mobile: z.string().optional().nullable(),
  })),
});

function mapEmp(e: any) {
  return { id: e.id, name: e.name, email: e.email, dateOfBirth: e.date_of_birth, mobile: e.mobile ?? null, createdAt: e.created_at };
}

router.get('/employees', (_req, res) => {
  try {
    const rows = getDb().prepare('SELECT * FROM employees ORDER BY created_at').all();
    res.json(rows.map(mapEmp));
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/employees', (req, res) => {
  const p = CreateBody.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  try {
    const row = getDb()
      .prepare('INSERT INTO employees (name, email, date_of_birth, mobile) VALUES (?, ?, ?, ?) RETURNING *')
      .get(p.data.name, p.data.email, p.data.dateOfBirth, p.data.mobile ?? null) as any;
    res.status(201).json(mapEmp(row));
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(400).json({ error: 'An employee with this email already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.post('/employees/bulk-import', (req, res) => {
  const p = BulkBody.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const results: { success: boolean; name: string; error?: string }[] = [];
  const stmt = getDb().prepare('INSERT INTO employees (name, email, date_of_birth, mobile) VALUES (?, ?, ?, ?)');
  for (const emp of p.data.employees) {
    try {
      stmt.run(emp.name, emp.email, emp.dateOfBirth, emp.mobile ?? null);
      results.push({ success: true, name: emp.name });
    } catch (err: any) {
      results.push({ success: false, name: emp.name, error: err.message?.includes('UNIQUE') ? 'Email already exists' : 'Insert failed' });
    }
  }
  res.json({ results, imported: results.filter(r => r.success).length, total: results.length });
});

router.delete('/employees/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const row = getDb().prepare('DELETE FROM employees WHERE id = ? RETURNING *').get(id) as any;
    if (!row) { res.status(404).json({ error: 'Employee not found' }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
