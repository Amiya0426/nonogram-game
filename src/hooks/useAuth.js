import { useCallback, useState } from 'react';
import { api } from '../api.js';
import { translate as tr } from '../i18n/index.js';

/** 用户认证与完成进度（独立于棋盘状态） */
export default function useAuth({ setAlertMsg }) {
  const [user, setUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [userProgress, setUserProgress] = useState([]);

  /** 拉取当前用户已完成题目列表 */
  const refreshUserProgress = useCallback(async () => {
    try {
      const list = await api.userProgress();
      setUserProgress(Array.isArray(list) ? list : []);
    } catch {
      // 未登录或接口不可用时忽略
    }
  }, []);

  const login = useCallback(
    async (username, password) => {
      setAuthBusy(true);
      try {
        const me = await api.login(username, password);
        setUser(me);
        refreshUserProgress();
        setAlertMsg(tr('msg.welcomeBack', { name: me.username }));
        return { ok: true };
      } catch (e) {
        setAlertMsg(tr('msg.loginFailed', { msg: e.message }));
        return { ok: false, msg: e.message };
      } finally {
        setAuthBusy(false);
      }
    },
    [refreshUserProgress, setAlertMsg],
  );

  const register = useCallback(
    async (username, password, email, code) => {
      setAuthBusy(true);
      try {
        const me = await api.register(username, password, email, code);
        setUser(me);
        refreshUserProgress();
        setAlertMsg(tr('msg.registered', { name: me.username }));
        return { ok: true };
      } catch (e) {
        setAlertMsg(tr('msg.registerFailed', { msg: e.message }));
        return { ok: false, msg: e.message };
      } finally {
        setAuthBusy(false);
      }
    },
    [refreshUserProgress, setAlertMsg],
  );

  /** 发送邮箱验证码（搭架子阶段返回 devCode 供前端展示） */
  const sendCode = useCallback(async (email, mode = 'register') => {
    const data = await api.sendCode(email, mode);
    return data;
  }, []);

  /** 忘记密码：验证码 + 新密码重置 */
  const resetPassword = useCallback(
    async (email, code, newPassword) => {
      setAuthBusy(true);
      try {
        await api.resetPassword(email, code, newPassword);
        setAlertMsg(tr('msg.resetDone'));
        return { ok: true };
      } catch (e) {
        setAlertMsg(tr('msg.resetFailed', { msg: e.message }));
        return { ok: false, msg: e.message };
      } finally {
        setAuthBusy(false);
      }
    },
    [setAlertMsg],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // 忽略登出接口错误
    }
    setUser(null);
    setUserProgress([]);
    setAlertMsg(tr('msg.loggedOut'));
  }, [setAlertMsg]);

  return {
    user,
    authBusy,
    userProgress,
    setUser,
    setUserProgress,
    refreshUserProgress,
    login,
    register,
    sendCode,
    resetPassword,
    logout,
  };
}
