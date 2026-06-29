import nodemailer from 'nodemailer';

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) throw new Error('EMAIL_USER and EMAIL_PASS environment variables are not set.');
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: false,
    auth: { user, pass },
  });
}

function buildEmailHtml(name: string, dateOfBirth: string, magicConstant: number, orgName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3e8ff;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8ff;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e0c8f5;max-width:600px;">
        <tr>
          <td style="background:#3e145a;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#c9a6e8;letter-spacing:2px;text-transform:uppercase;">SWS Financial Solutions Pvt. Ltd.</p>
            <h1 style="margin:12px 0 4px;font-size:34px;color:#ffffff;">&#127874; Happy Birthday!</h1>
            <p style="margin:0;font-size:15px;color:#d4a8f0;">A special mathematical gift for you</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="font-size:20px;color:#3e145a;margin:0 0 16px;font-weight:bold;">Dear ${name},</p>
            <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 20px;">
              On this wonderful occasion of your birthday, the entire team at
              <strong style="color:#3e145a;">${orgName}</strong> wishes you health, happiness, and endless joy!
            </p>
            <div style="background:#faf5ff;border:2px solid #e0c8f5;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#9b6cb7;text-transform:uppercase;letter-spacing:1.5px;">Your Personal Magic Square</p>
              <p style="margin:0 0 4px;font-size:24px;font-weight:bold;color:#3e145a;">Magic Constant: ${magicConstant}</p>
              <p style="margin:0;font-size:13px;color:#888;">Every row, column, diagonal & 2×2 block sums to <strong>${magicConstant}</strong></p>
              <p style="margin:12px 0 0;font-size:12px;color:#aaa;">Date of Birth encoded: <strong style="color:#3e145a;">${dateOfBirth}</strong></p>
            </div>
            <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 16px;">
              Attached to this email is your <strong>Ramanujan Birthday Magic Square PDF</strong> —
              a 6-page personalized card that showcases the beautiful mathematical patterns hidden in your birthdate,
              inspired by the legendary mathematician <em>Srinivasa Ramanujan</em>.
            </p>
            <div style="background:#fffbeb;border-left:4px solid #be8a0e;padding:14px 18px;border-radius:4px;margin:0 0 24px;">
              <p style="margin:0;font-size:13px;color:#92670a;font-style:italic;">
                "An equation for me has no meaning, unless it expresses a thought of God."
                <br/><strong>– Srinivasa Ramanujan</strong>
              </p>
            </div>
            <p style="font-size:14px;color:#555;margin:0 0 24px;">
              Please open the attached PDF to explore all the magical row, column, diagonal, and 2×2 block patterns in your square.
            </p>
            <p style="font-size:15px;color:#3e145a;margin:0;">
              With warm birthday wishes,<br/>
              <strong>${orgName}</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#3e145a;padding:16px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9b6cb7;">Developed by Atharva Vaijnath Bhagwat &nbsp;|&nbsp; Powered by Ramanujan Magic Square</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendBirthdayEmail(
  to: string,
  name: string,
  dateOfBirth: string,
  magicConstant: number,
  pdfBuffer: Buffer,
  orgName = 'SWS Financial Solutions Pvt. Ltd.',
): Promise<void> {
  const transporter = createTransporter();
  const fromName = process.env.EMAIL_FROM_NAME ?? orgName;
  const from = `"${fromName}" <${process.env.EMAIL_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: `Happy Birthday, ${name}! 🎂 Your Ramanujan Magic Square`,
    html: buildEmailHtml(name, dateOfBirth, magicConstant, fromName),
    attachments: [
      {
        filename: `${name.replace(/\s+/g, '_')}_Birthday_Magic_Square.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

export function isEmailConfigured(): boolean {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}
