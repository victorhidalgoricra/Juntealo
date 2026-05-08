import {
  Wallet,
  Users,
  Briefcase,
  HeartPulse,
  GraduationCap,
  Car,
  type LucideIcon,
} from 'lucide-react';

const keywordMap: Array<{ keywords: string[]; Icon: LucideIcon }> = [
  { keywords: ['vecin', 'comunal', 'barrio', 'colonia', 'jirón'], Icon: Users },
  { keywords: ['emprendedor', 'negocio', 'empresa', 'startup', 'comerci'], Icon: Briefcase },
  { keywords: ['salud', 'medic', 'hospital', 'clinic', 'farmacia'], Icon: HeartPulse },
  { keywords: ['universidad', 'estudio', 'educacion', 'colegio', 'escuela', 'alumno'], Icon: GraduationCap },
  { keywords: ['taxi', 'transport', 'bus', 'vehiculo', 'moto', 'auto', 'chofer'], Icon: Car },
];

function resolveIcon(nombre: string): LucideIcon {
  const normalized = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  for (const { keywords, Icon } of keywordMap) {
    if (keywords.some((k) => normalized.includes(k))) return Icon;
  }
  return Wallet;
}

type Size = 'sm' | 'md' | 'lg';

const sizeMap: Record<Size, { container: string; icon: number }> = {
  sm: { container: 'h-8 w-8', icon: 16 },
  md: { container: 'h-10 w-10', icon: 20 },
  lg: { container: 'h-14 w-14', icon: 26 },
};

export function JuntaIcon({ nombre, size = 'md' }: { nombre: string; size?: Size }) {
  const Icon = resolveIcon(nombre);
  const { container, icon } = sizeMap[size];
  return (
    <div
      className={`inline-flex ${container} shrink-0 items-center justify-center rounded-xl bg-[#F3F6FB] text-slate-400`}
    >
      <Icon size={icon} strokeWidth={1.5} />
    </div>
  );
}
