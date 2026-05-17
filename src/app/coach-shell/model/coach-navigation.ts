import {
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  Layers3,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type CoachRoutePath =
  | '/clients'
  | '/exercises'
  | '/routines'
  | '/programs'
  | '/assignments'

export type NavigationRole = 'admin' | 'coach' | 'trainee'

export interface CoachNavItem {
  icon: LucideIcon
  label: string
  roles: readonly NavigationRole[]
  to: CoachRoutePath
}

export const coachNavItems: CoachNavItem[] = [
  { icon: Users, label: 'Klienci', roles: ['admin', 'coach'], to: '/clients' },
  { icon: Dumbbell, label: 'Cwiczenia', roles: ['admin', 'coach'], to: '/exercises' },
  { icon: ClipboardList, label: 'Rutyny', roles: ['admin', 'coach'], to: '/routines' },
  { icon: Layers3, label: 'Programy', roles: ['admin', 'coach'], to: '/programs' },
  { icon: ClipboardCheck, label: 'Przypisania', roles: ['admin', 'coach'], to: '/assignments' },
]

export function getCoachNavItemsForRole(role: NavigationRole) {
  return coachNavItems.filter((item) => item.roles.includes(role))
}
