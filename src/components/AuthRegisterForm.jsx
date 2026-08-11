import { EmailInput, PasswordInput, CodeRow, StrengthMeter, RuleCheck } from './authFields.jsx';
import { useI18n } from '../i18n/index.js';

/** 注册表单 */
const AuthRegisterForm = ({
  email,
  setEmail,
  username,
  setUsername,
  password,
  setPassword,
  showPwd,
  setShowPwd,
  confirm,
  setConfirm,
  showConfirm,
  setShowConfirm,
  code,
  setCode,
  onSendCode,
  codeSending,
  codeCountdown,
  authBusy,
  submitRegister,
}) => {
  const { t } = useI18n();
  const ruleLengthOk = password.length >= 8 && password.length <= 16;
  const ruleSpecialOk = /[^A-Za-z0-9]/.test(password);

  return (
    <>
      <EmailInput value={email} setValue={setEmail} placeholder={t('panel.emailPlaceholder')} />
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder={t('panel.usernamePlaceholder')}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
      />
      <PasswordInput
        value={password}
        setValue={setPassword}
        placeholder={t('panel.passwordPlaceholder')}
        show={showPwd}
        setShow={setShowPwd}
        onEnter={() => {}}
      />
      {password && <StrengthMeter password={password} />}
      {password && (
        <div className="flex flex-col gap-0.5 text-[10px]">
          <RuleCheck ok={ruleLengthOk} label={t('msg.pwdRuleLength')} />
          <RuleCheck ok={ruleSpecialOk} label={t('msg.pwdRuleSpecial')} />
        </div>
      )}
      <PasswordInput
        value={confirm}
        setValue={setConfirm}
        placeholder={t('panel.confirmPassword')}
        show={showConfirm}
        setShow={setShowConfirm}
        onEnter={submitRegister}
      />
      <CodeRow
        value={code}
        setValue={setCode}
        placeholder={t('panel.emailCodePlaceholder')}
        onSend={onSendCode}
        codeSending={codeSending}
        codeCountdown={codeCountdown}
        authBusy={authBusy}
      />
    </>
  );
};

export default AuthRegisterForm;
