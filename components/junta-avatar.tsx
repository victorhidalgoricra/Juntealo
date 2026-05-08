import {
  Wallet,
  Users,
  Briefcase,
  HeartPulse,
  GraduationCap,
  Car,
  type LucideIcon,
} from 'lucide-react';

type Category = 'vecinal' | 'salud' | 'emprendedor' | 'universidad' | 'transporte' | 'default';

const keywordMap: Array<{ keywords: string[]; category: Category; Icon: LucideIcon }> = [
  { keywords: ['vecin', 'comunal', 'barrio', 'colonia', 'jiron'], category: 'vecinal',     Icon: Users         },
  { keywords: ['emprendedor', 'negocio', 'empresa', 'startup', 'comerci'], category: 'emprendedor', Icon: Briefcase     },
  { keywords: ['salud', 'medic', 'hospital', 'clinic', 'farmacia'],        category: 'salud',       Icon: HeartPulse    },
  { keywords: ['universidad', 'estudio', 'educacion', 'colegio', 'escuela', 'alumno'], category: 'universidad', Icon: GraduationCap },
  { keywords: ['taxi', 'transport', 'bus', 'vehiculo', 'moto', 'auto', 'chofer'],     category: 'transporte',  Icon: Car           },
];

const categoryStyles: Record<Category, string> = {
  vecinal:     'bg-accent-bg    text-accent',
  salud:       'bg-green-bg     text-green',
  emprendedor: 'bg-amber-bg     text-amber',
  universidad: 'bg-indigo-50    text-indigo-600',
  transporte:  'bg-slate-100    text-slate-500',
  default:     'bg-accent-bg    text-accent-dark',
};

export type AvatarSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<AvatarSize, { container: string; icon: number }> = {
  sm: { container: 'h-8  w-8',  icon: 14 },
  md: { container: 'h-10 w-10', icon: 18 },
  lg: { container: 'h-12 w-12', icon: 22 },
};

function resolve(nombre: string): { Icon: LucideIcon; category: Category } {
  const normalized = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  for (const entry of keywordMap) {
    if (entry.keywords.some((k) => normalized.includes(k))) {
      return { Icon: entry.Icon, category: entry.category };
    }
  }
  return { Icon: Wallet, category: 'default' };
}

export function JuntaAvatar({ nombre, size = 'md' }: { nombre: string; size?: AvatarSize }) {
  const { Icon, category } = resolve(nombre);
  const { container, icon } = sizeMap[size];

  return (
    <div
      className={`inline-flex ${container} shrink-0 items-center justify-center rounded-xl shadow-sm ${categoryStyles[category]}`}
    >
      <Icon size={icon} strokeWidth={1.75} />
    </div>
  );
}
