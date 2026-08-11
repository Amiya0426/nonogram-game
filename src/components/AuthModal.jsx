import { useEffect, useState } from 'react';
import { X, LogIn, UserRound, KeyRound, ChevronLeft } from 'lucide-react';
import AuthLoginForm from './AuthLoginForm.jsx';
import AuthRegisterForm from './AuthRegisterForm.jsx';
import AuthForgotForm from './AuthForgotForm.jsx';
import { useI18n } from '../i18n/index.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 登录/注册/忘记密码弹窗容器：持有表单状态与提交逻辑，视图拆为三个子表单 */
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

          {view === 'login' && (
            <AuthLoginForm
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              showPwd={showLoginPwd}
              setShowPwd={setShowLoginPwd}
              submitLogin={submitLogin}
              onForgot={() => setView('forgot')}
            />
          )}

          {view === 'register' && (
            <AuthRegisterForm
              email={email}
              setEmail={setEmail}
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              showPwd={showRegPwd}
              setShowPwd={setShowRegPwd}
              confirm={confirm}
              setConfirm={setConfirm}
              showConfirm={showConfirm}
              setShowConfirm={setShowConfirm}
              code={code}
              setCode={setCode}
              onSendCode={() => handleSendCode('register')}
              codeSending={codeSending}
              codeCountdown={codeCountdown}
              authBusy={authBusy}
              submitRegister={submitRegister}
            />
          )}

          {view === 'forgot' && (
            <AuthForgotForm
              email={email}
              setEmail={setEmail}
              code={code}
              setCode={setCode}
              password={password}
              setPassword={setPassword}
              showPwd={showRegPwd}
              setShowPwd={setShowRegPwd}
              confirm={confirm}
              setConfirm={setConfirm}
              showConfirm={showConfirm}
              setShowConfirm={setShowConfirm}
              onSendCode={() => handleSendCode('reset')}
              codeSending={codeSending}
              codeCountdown={codeCountdown}
              authBusy={authBusy}
              submitReset={submitReset}
            />
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
