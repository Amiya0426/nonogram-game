// Resend 邮件发送（免费额度：每天 100 封 / 每月 3000 封）
// 配置（环境变量，可放 server/.env，不入库）：
//   RESEND_API_KEY      必填，Resend API Key
//   RESEND_FROM         发件人（默认 "Nonogram <onboarding@resend.dev>"；
//                       请在 Resend 验证自己的域名后改为 "Nonogram <noreply@你的域名>"）
//   RESEND_DAILY_LIMIT   每日上限（默认 100，与免费额度一致）
//   RESEND_MONTHLY_LIMIT 每月上限（默认 3000）
//
// 未配置 RESEND_API_KEY 时自动降级为本地桩模式：验证码只打印到服务端日志，
// 并返回 devCode 给前端方便联调；配置后不再返回验证码。

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export const isStubMailer = !process.env.RESEND_API_KEY;

export const sendEmailCode = async (email, code) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[mailer:stub] 验证码发送到 ${email}：${code}`);
    return { ok: true };
  }

  const from = process.env.RESEND_FROM || 'Nonogram <onboarding@resend.dev>';
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Nonogram 邮箱验证码 / Email Verification Code',
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
          <h2 style="margin:0 0 12px;color:#1e293b;">Nonogram 邮箱验证码</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
            你的验证码是 / Your verification code:
          </p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#4f46e5;margin:0 0 16px;">
            ${code}
          </p>
          <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
            10 分钟内有效，请勿泄露给他人。<br/>
            Valid for 10 minutes. Do not share this code with anyone.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend 发送失败 (${res.status}): ${detail.slice(0, 300)}`);
  }
  return { ok: true };
};
