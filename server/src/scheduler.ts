import cron from 'node-cron';
import { getDb } from './db.js';
import { generateMagicSquare } from './magicSquare.js';
import { generateBirthdayPDF } from './pdfGenerator.js';
import { sendBirthdayEmail, isEmailConfigured } from './emailService.js';

async function runBirthdayCheck() {
  if (!isEmailConfigured()) {
    console.log('[Scheduler] Email not configured — skipping birthday check.');
    return;
  }

  const now = new Date();
  const todayDD = String(now.getDate()).padStart(2, '0');
  const todayMM = String(now.getMonth() + 1).padStart(2, '0');
  const thisYear = now.getFullYear();

  console.log(`[Scheduler] Running birthday check for ${todayDD}/${todayMM}/${thisYear}...`);

  const employees = getDb().prepare('SELECT * FROM employees').all() as Array<{
    id: number; name: string; email: string; date_of_birth: string;
    birthday_email_sent_year: number | null;
  }>;

  const todaysBirthdays = employees.filter(emp => {
    const parts = emp.date_of_birth.split('/');
    if (parts.length !== 3) return false;
    return parts[0] === todayDD && parts[1] === todayMM;
  });

  if (todaysBirthdays.length === 0) {
    console.log('[Scheduler] No birthdays today.');
    return;
  }

  console.log(`[Scheduler] Found ${todaysBirthdays.length} birthday(s) today.`);

  const orgs = getDb().prepare('SELECT * FROM organizations ORDER BY sr LIMIT 1').all() as Array<{
    org_name: string; logo_data: string | null;
  }>;
  const orgCtx = orgs.length > 0
    ? { orgName: orgs[0].org_name, logoData: orgs[0].logo_data }
    : undefined;

  for (const emp of todaysBirthdays) {
    if (emp.birthday_email_sent_year === thisYear) {
      console.log(`[Scheduler] Already sent to ${emp.email} this year — skipping.`);
      continue;
    }

    try {
      const squareData = generateMagicSquare(emp.name, emp.date_of_birth);
      const pdfBuffer = await generateBirthdayPDF(squareData, orgCtx);
      await sendBirthdayEmail(emp.email, emp.name, emp.date_of_birth, squareData.magicConstant, pdfBuffer, orgCtx?.orgName);

      getDb().prepare('UPDATE employees SET birthday_email_sent_year = ? WHERE id = ?').run(thisYear, emp.id);
      console.log(`[Scheduler] ✅ Birthday email sent to ${emp.name} <${emp.email}>`);
    } catch (err) {
      console.error(`[Scheduler] ❌ Failed to send to ${emp.email}:`, err);
    }
  }
}

export function startScheduler() {
  const schedule = process.env.BIRTHDAY_CRON ?? '0 8 * * *';
  cron.schedule(schedule, runBirthdayCheck);
  console.log(`[Scheduler] Birthday scheduler started — runs on schedule: "${schedule}"`);
}

export { runBirthdayCheck };
