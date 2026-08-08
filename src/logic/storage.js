// localStorage 读写封装

export const loadJSON = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(`Failed to load localStorage key "${key}"`, e);
  }
  return fallback;
};

export const saveJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save localStorage key "${key}"`, e);
  }
};
