import { useDeferredValue, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import Markdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { readFileBytes } from '../../core/fs';
import { useDocuments } from '../../core/stores/documents';
import { findHeading } from './anchors';
import styles from './MarkdownPreview.module.css';
import { imageType, isExternal, resolveRelative } from './paths';
import { rehypeSourceLines } from './scrollSync';

const remarkPlugins = [remarkGfm];
// `detect: false`: only fenced blocks that name a language get colored, never a guess.
const rehypePlugins = [rehypeSourceLines, [rehypeHighlight, { detect: false }]] as never;

/** Relative images come through Rust (scoped); remote ones are blocked by the CSP anyway. */
function PreviewImage({ docPath, src, alt }: { docPath: string; src?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const file = src ? resolveRelative(docPath, src) : null;

  useEffect(() => {
    const type = file ? imageType(file) : null;
    if (!file || !type) return;
    let alive = true;
    let objectUrl: string | null = null;
    readFileBytes(file)
      .then((bytes) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
        setUrl(objectUrl);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (src && isExternal(src)) {
    // data: URIs render; http(s) would be blocked by the CSP, so show the alt text instead.
    return src.startsWith('data:') ? (
      <img src={src} alt={alt} />
    ) : (
      <span className={styles.missing}>{alt || src}</span>
    );
  }
  if (failed || !file || !imageType(file)) {
    return <span className={styles.missing}>{alt || src}</span>;
  }
  return url ? <img src={url} alt={alt} /> : <span className={styles.missing}>{alt}</span>;
}

/** Live render of the document's text. Updates are deferred so typing never waits on it. */
export function MarkdownPreview({ path }: { path: string }) {
  const text = useDeferredValue(useDocuments((s) => s.docs[path]?.text ?? ''));

  const components = useMemo<Components>(
    () => ({
      a({ href, children }: ComponentProps<'a'>) {
        const onClick = (e: React.MouseEvent) => {
          // Never let the webview navigate away from the app.
          e.preventDefault();
          if (href?.startsWith('#')) {
            const article = (e.currentTarget as Element).closest('article');
            const heading = article && findHeading(article, href);
            // An empty or unknown fragment ("#") goes to the top, as in a browser.
            if (heading) heading.scrollIntoView({ block: 'start' });
            else if (href === '#' || href === '#top') article?.parentElement?.scrollTo({ top: 0 });
            return;
          }
          const target = href ? resolveRelative(path, href) : null;
          if (target) void useDocuments.getState().open(target);
          // Only web and mail links leave the app; the capability allows nothing else.
          else if (href && /^(https?:|mailto:)/i.test(href)) void openUrl(href).catch(() => {});
        };
        return (
          <a href={href} onClick={onClick} title={href}>
            {children}
          </a>
        );
      },
      img: ({ src, alt }: ComponentProps<'img'>) => (
        <PreviewImage
          key={typeof src === 'string' ? src : ''}
          docPath={path}
          src={typeof src === 'string' ? src : undefined}
          alt={alt}
        />
      ),
    }),
    [path],
  );

  return (
    <div className={styles.scroll} data-preview-scroll>
      <article className={styles.preview}>
        <Markdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
        >
          {text}
        </Markdown>
      </article>
    </div>
  );
}
