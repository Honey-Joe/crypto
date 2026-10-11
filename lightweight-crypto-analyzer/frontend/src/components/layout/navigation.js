import { BookOpen, ChartColumn, Cpu, Gauge, Info, LayoutDashboard, Lock } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/encrypt', label: 'Encrypt / Decrypt', icon: Lock },
  { to: '/benchmark', label: 'Performance Benchmark', icon: Gauge },
  { to: '/comparison', label: 'Algorithm Comparison', icon: ChartColumn },
  { to: '/iot', label: 'IoT Simulation', icon: Cpu },
  { to: '/algorithms', label: 'Algorithm Information', icon: BookOpen },
  { to: '/about', label: 'About Project', icon: Info },
];
