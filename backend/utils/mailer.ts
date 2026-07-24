import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

export async function sendVerificationEmail(to: string, code: string): Promise<{ sent: boolean; devCode?: string }> {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[Email] No Gmail configured. Verification code for ${to}: ${code}`);
    return { sent: false, devCode: code };
  }

  await transport.sendMail({
    from: `"SomaliBD" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Your SomaliBD verification code",
    text: `Your verification code is: ${code}. It expires in 10 minutes. Do not share this code.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#D32F2F">SomaliBD Verification</h2>
        <p>Your verification code is:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#D32F2F">${code}</p>
        <p style="color:#64748B">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });

  return { sent: true };
}
