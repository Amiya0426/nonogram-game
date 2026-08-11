import { useCallback, useState } from 'react';
import { api } from '../api.js';
import { translate as tr } from '../i18n/index.js';

const INITIAL_BROWSE = {
  items: [],
  total: 0,
  page: 1,
  perPage: 30,
  loading: false,
  rows: null,
  cols: null,
  mine: false,
  done: false,
};

/** 题库浏览与改名（依赖登录态与全局提示） */
export default function usePuzzleLibrary({ user, setAlertMsg }) {
  const [browse, setBrowse] = useState(INITIAL_BROWSE);

  /** 题库浏览：分页拉取题目列表 */
  const loadPuzzles = useCallback(
    async (page = 1, rows = null, cols = null, mine = false, done = false) => {
      setBrowse((prev) => ({ ...prev, loading: true, page, rows, cols, mine, done }));
      try {
        const data = await api.listPuzzles({
          page,
          perPage: 30,
          rows,
          cols,
          mine: mine ? '1' : undefined,
          done: done ? '1' : undefined,
        });
        setBrowse({
          items: data.items || [],
          total: data.total || 0,
          page: data.page || 1,
          perPage: data.perPage || 30,
          loading: false,
          rows,
          cols,
          mine,
          done,
        });
      } catch {
        setBrowse((prev) => ({ ...prev, loading: false }));
        setAlertMsg(tr('msg.browseFailed'));
      }
    },
    [setAlertMsg],
  );

  /** 修改自己导入的题目名称（题库浏览内） */
  const renamePuzzle = useCallback(
    async (item) => {
      if (!user) {
        setAlertMsg(tr('msg.needLogin'));
        return;
      }
      if (String(item.user_id) !== String(user.id)) {
        setAlertMsg(tr('msg.renameOwnOnly'));
        return;
      }
      const newName = prompt(tr('msg.renamePrompt'), item.name || '');
      if (newName === null) return;
      const name = newName.trim();
      try {
        const r = await api.renamePuzzle(item.id, name || null);
        setBrowse((prev) => ({
          ...prev,
          items: prev.items.map((it) =>
            it.id === item.id ? { ...it, name: r.name } : it,
          ),
        }));
        setAlertMsg(name ? tr('msg.renamed', { name }) : tr('msg.nameCleared'));
      } catch (e) {
        setAlertMsg(`❌ ${e.message}`);
      }
    },
    [user, setAlertMsg],
  );

  return { browse, setBrowse, loadPuzzles, renamePuzzle };
}
