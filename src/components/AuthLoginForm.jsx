import { PasswordInput } from './authFields.jsx';
import { useI18n } from '../i18n/index.js';

/** 登录表单 */
const AuthLoginForm = ({
  username,
  setUsername,
  password,
  setPassword,
  showPwd,
  setShowPwd,
  submitLogin,
  onForgot,
}) => {
  const { t } = useI18n();
  return (
    <>
      <input
        data-testid="auth-username"
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
        onEnter={submitLogin}
      />
      <div className="flex justify-end">
        <button
          onClick={onForgot}
          className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          {t('panel.forgotPassword')}
        </button>
      </div>
    </>
  );
};

export default AuthLoginForm;
