import {
  LayoutDashboard,
  BarChart3,
  Search,
  Globe,
  Server,
  Users,
  CreditCard,
  Ticket,
  UserCog,
  Code2,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import {
  operatorCanManageStaff,
  operatorCanReadGuilds,
  operatorCanUseDevTools,
  operatorHasAdminPermission,
  type PlatformOperator,
} from '@/lib/platform-operator-shared';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  show: (op: PlatformOperator) => boolean;
};

export type AdminNavSection = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'home',
    label: 'Home',
    items: [
      { href: '/admin', label: 'Command center', icon: LayoutDashboard, exact: true, show: () => true },
      { href: '/admin/analytics', label: 'Growth & health', icon: BarChart3, show: (op) => operatorHasAdminPermission(op, 'analytics') },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    items: [
      { href: '/admin/guild-lookup', label: 'Server search', icon: Search, show: (op) => operatorCanReadGuilds(op) },
      { href: '/admin/guilds', label: 'Plans & access', icon: Server, show: (op) => operatorHasAdminPermission(op, 'guilds.write') },
      { href: '/admin/users', label: 'Dashboard users', icon: Users, show: (op) => operatorHasAdminPermission(op, 'users.read') },
      { href: '/admin/subscriptions', label: 'Billing', icon: CreditCard, show: (op) => operatorHasAdminPermission(op, 'subscriptions.write') },
      { href: '/admin/redeem-codes', label: 'Promo codes', icon: Ticket, show: (op) => operatorHasAdminPermission(op, 'redeem.write') },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { href: '/admin/website', label: 'Site & changelog', icon: Globe, show: (op) => operatorHasAdminPermission(op, 'website.read') },
    ],
  },
  {
    id: 'ops',
    label: 'Operations',
    items: [
      { href: '/admin/audit', label: 'Activity log', icon: ScrollText, show: (op) => operatorHasAdminPermission(op, 'audit.read') },
      { href: '/admin/team', label: 'Staff access', icon: UserCog, show: (op) => operatorCanManageStaff(op) },
      { href: '/admin/developers', label: 'System status', icon: Code2, show: (op) => operatorCanUseDevTools(op) },
    ],
  },
];

export function visibleAdminSections(operator: PlatformOperator): AdminNavSection[] {
  return ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.show(operator)),
  })).filter((section) => section.items.length > 0);
}
