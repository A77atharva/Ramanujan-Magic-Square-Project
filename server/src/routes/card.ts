import { Router } from 'express';
import { z } from 'zod';
import { generateMagicSquare } from '../magicSquare.js';

const router = Router();

const GenerateCardBody = z.object({
  name: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use DD/MM/YYYY format'),
});

router.post('/generate-card', (req, res) => {
  console.log("🔥 /generate-card HIT:", req.body); // ✅ DEBUG LOG

  const parsed = GenerateCardBody.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors.map(e => e.message).join(', ')
    });
  }

  try {
    const { name, dateOfBirth } = parsed.data;

    const result = generateMagicSquare(name, dateOfBirth);

    return res.status(200).json(result); // ✅ explicit success
  } catch (err: any) {
    console.error("❌ ERROR:", err); // ✅ debug error

    return res.status(500).json({
      error: err?.message || 'Failed to generate magic square'
    });
  }
});

export default router;