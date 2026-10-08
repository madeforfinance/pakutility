/* Dynamic lucide icon by name — used by tool cards, search, directory. */
import React from 'react';
import {
  Calculator, Percent, TrendingUp, TrendingDown, Tag, PiggyBank, Landmark,
  Wallet, Home, GraduationCap, Briefcase, Store, Car, Moon, FileText,
  CheckSquare, Wrench, LayoutDashboard, Settings, Search, Plus, Clock,
  Bell, Star, Fuel, Receipt, FileCheck, Users, Package, ShoppingCart,
  Calendar, CalendarDays, StickyNote, Timer, Hourglass, Scale, Coins,
  Banknote, CreditCard, ArrowLeftRight, Split, UtensilsCrossed, Zap,
  Droplets, Wifi, Phone, HeartPulse, BookOpen, Backpack, Bus, Wrench as WrenchIcon,
  Sun, Compass, QrCode, KeyRound, Shuffle, Type, Hash, Ruler, Thermometer,
  Weight, Box, Gauge, Database, Dumbbell, AlarmClock, ListChecks, FolderOpen,
  Building2, Plane, Train, CircleDollarSign, HandCoins, ScrollText, Award,
  Baby, Gift, Cake, Umbrella, ShieldCheck, FileWarning, IdCard, BookMarked,
  Languages, Globe, ArrowRightLeft, PercentCircle, Sigma, FunctionSquare,
  ClipboardList, TimerReset, CalendarClock, AlarmClockCheck, UserCheck,
  Contact, NotebookPen, Presentation, LineChart, PieChart, BarChart3,
  Repeat, History, Download, Upload, Printer, Trash2, Pencil, Eye, Copy,
  ChevronRight, ChevronDown, Info, TriangleAlert, CircleCheck, Sparkles,
  Flame, Droplet, Leaf, Snowflake, CloudSun, MapPin, Navigation, Fuel as FuelIcon,
} from 'lucide-react';

const MAP: Record<string, React.ComponentType<any>> = {
  Calculator, Percent, TrendingUp, TrendingDown, Tag, PiggyBank, Landmark,
  Wallet, Home, GraduationCap, Briefcase, Store, Car, Moon, FileText,
  CheckSquare, Wrench, LayoutDashboard, Settings, Search, Plus, Clock,
  Bell, Star, Fuel, Receipt, FileCheck, Users, Package, ShoppingCart,
  Calendar, CalendarDays, StickyNote, Timer, Hourglass, Scale, Coins,
  Banknote, CreditCard, ArrowLeftRight, Split, UtensilsCrossed, Zap,
  Droplets, Wifi, Phone, HeartPulse, BookOpen, Backpack, Bus, Sun,
  Compass, QrCode, KeyRound, Shuffle, Type, Hash, Ruler, Thermometer,
  Weight, Box, Gauge, Database, AlarmClock, ListChecks, FolderOpen,
  Building2, Plane, CircleDollarSign, HandCoins, ScrollText, Award,
  Gift, Cake, Umbrella, ShieldCheck, FileWarning, IdCard, BookMarked,
  Languages, Globe, ArrowRightLeft, Sigma, ClipboardList, TimerReset,
  CalendarClock, UserCheck, Contact, NotebookPen, LineChart, PieChart,
  BarChart3, Repeat, History, Download, Upload, Printer, Trash2, Pencil,
  Eye, Copy, ChevronRight, ChevronDown, Info, Sparkles, Flame, Droplet,
  Leaf, MapPin, Navigation,
  WrenchIcon, FuelIcon,
  PercentCircle: Percent, FunctionSquare: Sigma, TriangleAlert, CircleCheck,
  Train: Train, Baby: Baby,
};

export function DynIcon({ name, size = 20, ...rest }: { name: string; size?: number } & React.SVGProps<SVGSVGElement>) {
  const C = MAP[name] || Calculator;
  return <C width={size} height={size} {...rest} />;
}
