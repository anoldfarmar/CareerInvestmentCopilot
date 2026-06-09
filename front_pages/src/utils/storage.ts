export function getLocalString(key: string) {
  return window.localStorage.getItem(key) ?? "";
}

export function setLocalString(key: string, value: string) {
  window.localStorage.setItem(key, value);
}
