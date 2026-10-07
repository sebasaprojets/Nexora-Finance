import {
  Banknote, Briefcase, Car, CircleHelp, Coffee, Dumbbell, Ellipsis, Gamepad2, Gift, GraduationCap, HeartPulse, House,
  Laptop, PartyPopper, PawPrint, Plane, PlusCircle, Receipt, Repeat, Shield, ShoppingBag, ShoppingCart, Smartphone,
  Store, Target, TrendingUp, Utensils, Wallet, Wrench, Zap, Baby, Bus, Music, Film, Fuel, Shirt, type LucideIcon,
} from 'lucide-react';

/** Ícones disponíveis para categorias/metas (nome persistido → componente). */
export const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  house: House,
  car: Car,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  'party-popper': PartyPopper,
  repeat: Repeat,
  'shopping-bag': ShoppingBag,
  ellipsis: Ellipsis,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  store: Store,
  'plus-circle': PlusCircle,
  plane: Plane,
  shield: Shield,
  target: Target,
  wallet: Wallet,
  banknote: Banknote,
  coffee: Coffee,
  dumbbell: Dumbbell,
  gamepad: Gamepad2,
  gift: Gift,
  paw: PawPrint,
  receipt: Receipt,
  cart: ShoppingCart,
  phone: Smartphone,
  wrench: Wrench,
  zap: Zap,
  baby: Baby,
  bus: Bus,
  music: Music,
  film: Film,
  fuel: Fuel,
  shirt: Shirt,
  'circle-help': CircleHelp,
};

export function getIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || CircleHelp;
}
