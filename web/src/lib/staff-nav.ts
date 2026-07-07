import {
  LayoutDashboard,
  Headphones,
  Search,
  Users,
  CreditCard,
  ScrollText,
  Shield,
  Server,
  Ticket,
  Code2,
  Activity,
  Globe,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import type { PlatformPermission } from '@/lib/platform-roles';

export type StaffNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: PlatformPermission;
  exact?: boolean;
};

export type StaffNavSection = {
  id: string;
  label: string;
  items: StaffNavItem[];
};

export const STAFF_NAV_SECTIONS: StaffNavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { href: '/staff', label: 'Dashboard', icon: LayoutDashboard, permission: 'staff.read', exact: true },
    ],
  },
  {
    id: 'support',
    label: 'Support staff',
    items: [
      { href: '/staff/support', label: 'Support hub', icon: Headphones, permission: 'guilds.read' },
      { href: '/staff/support/guilds', label: 'Guild lookup', icon: Search, permission: 'guilds.read' },
      { href: '/staff/support/users', label: 'User lookup', icon: Users, permission: 'users.read' },
      { href: '/staff/support/subscriptions', label: 'Subscriptions', icon: CreditCard, permission: 'subscriptions.read' },
      { href: '/staff/support/audit', label: 'Audit log', icon: ScrollText, permission: 'audit.read' },
    ],
  },
  {
    id: 'moderator',
    label: 'Bot moderator',
    items: [
      { href: '/staff/moderator', label: 'Moderator hub', icon: Shield, permission: 'guilds.write' },
      { href: '/staff/moderator/guilds', label: 'Guild plans', icon: Server, permission: 'guilds.write' },
      { href: '/staff/moderator/redeem', label: 'Redeem codes', icon: Ticket, permission: 'redeem.read' },
    ],
  },
  {
    id: 'developer',
    label: 'Developer',
    items: [
      { href: '/staff/developer', label: 'Developer hub', icon: Code2, permission: 'dev.tools' },
      { href: '/staff/developer/status', label: 'Bot status', icon: Activity, permission: 'dev.tools' },
      { href: '/staff/developer/changelog', label: 'Changelog & CMS', icon: Globe, permission: 'cms.read' },
      { href: '/staff/developer/subscriptions', label: 'Grant subscriptions', icon: CreditCard, permission: 'subscriptions.write' },
    ],
  },
  {
    id: 'leadership',
    label: 'Leadership',
    items: [
      { href: '/staff/team', label: 'Platform team', icon: UserCog, permission: 'staff.manage' },
    ],
  },
];
