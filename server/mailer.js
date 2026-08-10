// 邮件发送占位模块：尚未接入真实邮件服务（用户还未确定发送方式）。
// 接入后只需替换 sendEmailCode 的实现（如 SMTP / SendGrid / 腾讯云邮件等），
// 接口保持不变，业务代码无需改动。
export const isStubMailer = true;

export const sendEmailCode = async (email, code) => {
  // TODO: 接入真实邮件服务后，这里改为实际发送验证码邮件
  console.log(`[mailer:stub] 验证码发送到 ${email}：${code}`);
  return { ok: true };
};
