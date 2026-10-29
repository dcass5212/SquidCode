import styles from './WebFrame.module.css';

/**
 * Sandboxed iframe for local pages. `allow-same-origin` is needed for dev servers (module
 * scripts, storage); the page is cross-origin to the app, so it still can't reach it.
 */
export function WebFrame({
  url,
  reloadKey,
  title,
}: {
  url: string;
  reloadKey: number;
  title: string;
}) {
  return (
    <iframe
      key={reloadKey}
      className={styles.frame}
      src={url}
      title={title}
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
    />
  );
}
