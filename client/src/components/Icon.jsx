import {
  Briefcase,
  Camera,
  ChefHat,
  Code,
  Dumbbell,
  Gamepad2,
  Heart,
  Languages,
  Leaf,
  Music,
  Palette,
  PenLine,
  Scissors,
  Sigma,
  Sparkles,
  Wrench,
} from 'lucide-react';

// Curated category icons. Only these can be chosen in the admin picker, which keeps the
// bundle small (no need to import every lucide icon).
export const CATEGORY_ICONS = {
  code: Code,
  palette: Palette,
  music: Music,
  languages: Languages,
  'chef-hat': ChefHat,
  dumbbell: Dumbbell,
  camera: Camera,
  briefcase: Briefcase,
  'pen-line': PenLine,
  scissors: Scissors,
  sigma: Sigma,
  leaf: Leaf,
  heart: Heart,
  wrench: Wrench,
  'gamepad-2': Gamepad2,
  sparkles: Sparkles,
};

export function CategoryIcon({ name, size = 16, ...rest }) {
  const C = CATEGORY_ICONS[name] || Sparkles;
  return <C size={size} aria-hidden="true" {...rest} />;
}
