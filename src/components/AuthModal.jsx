import { useEffect, useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  LogIn,
  UserRound,
  KeyRound,
  ChevronLeft,
  Mail,
} from 'lucide-react';
import { useI18n } from '../i18n/index.js';
import { getPasswordStrength } from '../logic/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthModal = ({
  open,
  onClose,
  onLogin,
  onRegister,
  onSendCode,
  onResetPassword,
  authBusy,
}) => {
  const { t } = useI18n();
  const [view, setView] = useState('login'); // login | register | forgot
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [codeSending, setCodeSending] = useState(false);
  const [authMsg, setAuthMsg] = useState(null); // { type: 'error' | 'info', text }

  // 倒计时（发送验证码后 60s 内不可重发）
  useEffect(() => {
    if (codeCountdown <= 0) return undefined;
    const timer = setInterval(() => {
      setCodeCountdown((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [codeCountdown]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const startCodeCountdown = () => {
    setCodeCountdown(30 * 60);
  };

  const handleSendCode = async (mode) => {
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) {
      setAuthMsg({ type: 'error', text: t('msg.emailInvalid') });
      return;
    }
    setAuthMsg(null);
    setCodeSending(true);
    try {
      const data = await onSendCode(mail, mode);
      startCodeCountdown();
      setAuthMsg({
        type: 'info',
        text: data?.devCode
          ? t('msg.codeSentDev', { code: data.devCode })
          : t('msg.codeSent'),
      });
    } catch (e) {
      setAuthMsg({
        type: 'error',
        text: e.message || t('msg.codeSendFailed', { msg: '' }),
      });
    } finally {
      setCodeSending(false);
    }
  };

  const submitLogin = async () => {
    if (!username.trim() || !password) return;
    setAuthMsg(null);
    const r = await onLogin(username.trim(), password);
    if (r?.ok) onClose();
    else setAuthMsg({ type: 'error', text: r?.msg || t('msg.loginFailed', { msg: '' }) });
  };

  const submitRegister = async () => {
    if (username.trim().length < 6 || username.trim().length > 18) {
      setAuthMsg({ type: 'error', text: t('msg.usernameInvalid') });
      return;
    }
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) {
      setAuthMsg({ type: 'error', text: t('msg.emailInvalid') });
      return;
    }
    if (password.length < 8 || password.length > 16 || !/[^A-Za-z0-9]/.test(password)) {
      setAuthMsg({ type: 'error', text: t('msg.passwordRule') });
      return;
    }
    if (!code.trim()) {
      setAuthMsg({ type: 'error', text: t('msg.codeRequired') });
      return;
    }
    if (password !== confirm) {
      setAuthMsg({ type: 'error', text: t('msg.passwordMismatch') });
      return;
    }
    setAuthMsg(null);
    const r = await onRegister(username.trim(), password, mail, code.trim());
    if (r?.ok) onClose();
    else setAuthMsg({ type: 'error', text: r?.msg || t('msg.registerFailed', { msg: '' }) });
  };

  const submitReset = async () => {
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) {
      setAuthMsg({ type: 'error', text: t('msg.emailInvalid') });
      return;
    }
    if (!code.trim()) {
      setAuthMsg({ type: 'error', text: t('msg.codeRequired') });
      return;
    }
    if (password.length < 8 || password.length > 16 || !/[^A-Za-z0-9]/.test(password)) {
      setAuthMsg({ type: 'error', text: t('msg.passwordRule') });
      return;
    }
    if (password !== confirm) {
      setAuthMsg({ type: 'error', text: t('msg.passwordMismatch') });
      return;
    }
    setAuthMsg(null);
    const r = await onResetPassword(mail, code.trim(), password);
    if (r?.ok) {
      setAuthMsg({ type: 'info', text: t('msg.resetDone') });
      setView('login');
      setPassword('');
      setConfirm('');
      setCode('');
    } else {
      setAuthMsg({ type: 'error', text: r?.msg || t('msg.resetFailed', { msg: '' }) });
    }
  };

  const tabCls = (key) =>
    `flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${
      view === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;

  const passwordInput = (value, setValue, placeholder, show, setShow, onEnter) => (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter();
        }}
        placeholder={placeholder}
        className="w-full pr-9 px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 rounded"
        title={show ? t('panel.hidePassword') : t('panel.showPassword')}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  const codeRow = (onSend) => (
    <div className="flex gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t('panel.emailCodePlaceholder')}
        className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={codeSending || codeCountdown > 0 || authBusy}
        className="shrink-0 px-3 py-2 text-xs font-bold rounded-lg border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {codeCountdown > 0
          ? `${Math.floor(codeCountdown / 60)}:${String(codeCountdown % 60).padStart(2, '0')}`
          : t('panel.sendCode')}
      </button>
    </div>
  );

  const strength = getPasswordStrength(password);
  const strengthMeta =
    strength <= 1
      ? { label: t('msg.pwdWeak'), bar: 'bg-rose-500', text: 'text-rose-600', bars: 1 }
      : strength <= 4
        ? { label: t('msg.pwdMedium'), bar: 'bg-amber-500', text: 'text-amber-600', bars: 2 }
        : { label: t('msg.pwdStrong'), bar: 'bg-emerald-500', text: 'text-emerald-600', bars: 3 };

  const strengthMeter = (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i <= strengthMeta.bars ? strengthMeta.bar : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <span className={`text-[10px] font-bold shrink-0 ${strengthMeta.text}`}>
        {t('msg.passwordStrength')}: {strengthMeta.label}
      </span>
    </div>
  );

  const ruleLengthOk = password.length >= 8 && password.length <= 16;
  const ruleSpecialOk = /[^A-Za-z0-9]/.test(password);
  const ruleCheck = (ok, label) => (
    <span className={ok ? 'text-emerald-600' : 'text-rose-500'}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );

  const titles = {
    login: t('panel.login'),
    register: t('panel.register'),
    forgot: t('panel.resetPassword'),
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-base font-bold text-slate-800">
            {view === 'forgot' ? (
              <button
                onClick={() => {
                  setView('login');
                  setAuthMsg(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
                title={t('panel.backToLogin')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <UserRound className="w-4 h-4 text-indigo-500" />
            )}
            {titles[view]}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"
            title={t('browse.closeEsc')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {view !== 'forgot' && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button className={tabCls('login')} onClick={() => setView('login')}>
                {t('panel.login')}
              </button>
              <button className={tabCls('register')} onClick={() => setView('register')}>
                {t('panel.register')}
              </button>
            </div>
          )}

          {view === 'forgot' && (
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('msg.passwordResetHint')}
            </p>
          )}

          {view !== 'login' && (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('panel.emailPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          )}

          {view === 'register' && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('panel.usernamePlaceholder')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
            />
          )}

          {view === 'login' && (
            <>
              <input
                data-testid="auth-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('panel.usernamePlaceholder')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
              />
              {passwordInput(
                password,
                setPassword,
                t('panel.passwordPlaceholder'),
                showLoginPwd,
                setShowLoginPwd,
                submitLogin,
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setView('forgot');
                    setAuthMsg(null);
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {t('panel.forgotPassword')}
                </button>
              </div>
            </>
          )}

          {view === 'register' && (
            <>
              {passwordInput(
                password,
                setPassword,
                t('panel.passwordPlaceholder'),
                showRegPwd,
                setShowRegPwd,
                () => {},
              )}
              {password && strengthMeter}
              {password && (
                <div className="flex flex-col gap-0.5 text-[10px]">
                  {ruleCheck(ruleLengthOk, t('msg.pwdRuleLength'))}
                  {ruleCheck(ruleSpecialOk, t('msg.pwdRuleSpecial'))}
                </div>
              )}
              {passwordInput(
                confirm,
                setConfirm,
                t('panel.confirmPassword'),
                showConfirm,
                setShowConfirm,
                submitRegister,
              )}
              {codeRow(() => handleSendCode('register'))}
            </>
          )}

          {view === 'forgot' && (
            <>
              {codeRow(() => handleSendCode('reset'))}
              {passwordInput(
                password,
                setPassword,
                t('panel.newPasswordPlaceholder'),
                showRegPwd,
                setShowRegPwd,
                () => {},
              )}
              {password && strengthMeter}
              {password && (
                <div className="flex flex-col gap-0.5 text-[10px]">
                  {ruleCheck(ruleLengthOk, t('msg.pwdRuleLength'))}
                  {ruleCheck(ruleSpecialOk, t('msg.pwdRuleSpecial'))}
                </div>
              )}
              {passwordInput(
                confirm,
                setConfirm,
                t('panel.confirmPassword'),
                showConfirm,
                setShowConfirm,
                submitReset,
              )}
            </>
          )}

          {authMsg && (
            <p
              className={`text-xs leading-relaxed ${
                authMsg.type === 'error' ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {authMsg.text}
            </p>
          )}

          <button
            onClick={view === 'login' ? submitLogin : view === 'register' ? submitRegister : submitReset}
            disabled={
              authBusy ||
              (view === 'login' && (!username.trim() || !password)) ||
              (view === 'register' &&
                (!username.trim() || !password || !email.trim() || !code.trim() || !confirm)) ||
              (view === 'forgot' && (!email.trim() || !code.trim() || !password || !confirm))
            }
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed flex justify-center items-center gap-1.5"
          >
            {view === 'login' ? (
              <>
                <LogIn className="w-4 h-4" /> {t('panel.login')}
              </>
            ) : view === 'register' ? (
              <>
                <UserRound className="w-4 h-4" /> {t('panel.register')}
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" /> {t('panel.resetPassword')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
