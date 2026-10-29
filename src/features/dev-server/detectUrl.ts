// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;
const LOCAL_URL = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\]):\d+[^\s'")\]]*/i;

export const stripAnsi = (line: string) => line.replace(ANSI, '');

/** First local server address in a line of dev-server output, normalized to `localhost`. */
export function findLocalUrl(line: string): string | null {
  const match = LOCAL_URL.exec(stripAnsi(line));
  if (!match) return null;
  return match[0].replace(/\/\/(?:0\.0\.0\.0|\[::1?\])/, '//localhost');
}
