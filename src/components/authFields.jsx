import { Eye, EyeOff, Mail } from 'lucide-react';
import { useI18n } from '../i18n/index.js';
import { getPasswordStrength } from '../logic/password.js';

/** 密码输入框（含显隐切换） */
export const PasswordInput = ({ value, setValue, placeholder, show, setShow, onEnter }) => {
  const { t } = useI18n();
  return (
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
};

/** 邮箱输入框 */
export const EmailInput = ({ value, setValue, placeholder }) => (
  <div className="relative">
    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    <input
      type="email"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
    />
  </div>
);

/** 验证码输入 + 发送按钮（含倒计时） */
export const CodeRow = ({
  value,
  setValue,
  placeholder,
  onSend,
  codeSending,
  codeCountdown,
  authBusy,
}) => {
  const { t } = useI18n();
  return (
    <div className="flex gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
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
};

/** 密码强度条 */
export const StrengthMeter = ({ password }) => {
  const { t } = useI18n();
  const strength = getPasswordStrength(password);
  const strengthMeta =
    strength <= 1
      ? { label: t('msg.pwdWeak'), bar: 'bg-rose-500', text: 'text-rose-600', bars: 1 }
      : strength <= 4
        ? { label: t('msg.pwdMedium'), bar: 'bg-amber-500', text: 'text-amber-600', bars: 2 }
        : { label: t('msg.pwdStrong'), bar: 'bg-emerald-500', text: 'text-emerald-600', bars: 3 };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= strengthMeta.bars ? strengthMeta.bar : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <span className={`text-[10px] font-bold shrink-0 ${strengthMeta.text}`}>
        {t('msg.passwordStrength')}: {strengthMeta.label}
      </span>
    </div>
  );
};

/** 规则勾选 */
export const RuleCheck = ({ ok, label }) => (
  <span className={ok ? 'text-emerald-600' : 'text-rose-500'}>
    {ok ? '✓' : '✗'} {label}
  </span>
);
