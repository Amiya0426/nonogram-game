import { EmailInput, PasswordInput, CodeRow } from './authFields.jsx';
import { useI18n } from '../i18n/index.js';

/** 忘记密码表单 */
const AuthForgotForm = ({
  email,
  setEmail,
  code,
  setCode,
  password,
  setPassword,
  showPwd,
  setShowPwd,
  confirm,
  setConfirm,
  showConfirm,
  setShowConfirm,
  onSendCode,
  codeSending,
  codeCountdown,
  authBusy,
  submitReset,
}) => {
  const { t } = useI18n();
  return (
    <>
      <p className="text-xs text-slate-500 leading-relaxed">
        {t('msg.passwordResetHint')}
      </p>
      <EmailInput value={email} setValue={setEmail} placeholder={t('panel.emailPlaceholder')} />
      <CodeRow
        value={code}
        setValue={setCode}
        placeholder={t('panel.emailCodePlaceholder')}
        onSend={onSendCode}
        codeSending={codeSending}
        codeCountdown={codeCountdown}
        authBusy={authBusy}
      />
      <PasswordInput
        value={password}
        setValue={setPassword}
        placeholder={t('panel.newPasswordPlaceholder')}
        show={showPwd}
        setShow={setShowPwd}
        onEnter={submitReset}
      />
      <PasswordInput
        value={confirm}
        setValue={setConfirm}
        placeholder={t('panel.confirmPassword')}
        show={showConfirm}
        setShow={setShowConfirm}
        onEnter={submitReset}
      />
    </>
  );
};

export default AuthForgotForm;
