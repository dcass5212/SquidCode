import {
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  PanelLeft,
  RotateCw,
  X,
  type LucideIcon,
} from 'lucide-react';

/** Single icon set (Lucide). Add names here as features need them. */
const icons = {
  'chevron-right': ChevronRight,
  'external-link': ExternalLink,
  eye: Eye,
  'eye-off': EyeOff,
  file: File,
  'file-text': FileText,
  folder: Folder,
  'folder-open': FolderOpen,
  globe: Globe,
  'panel-left': PanelLeft,
  'rotate-cw': RotateCw,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const Glyph = icons[name];
  return <Glyph size={size} strokeWidth={1.75} aria-hidden="true" />;
}
