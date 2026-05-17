import { ClipboardList, LayoutDashboard, LineChart } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TraineeRoutePath = '/dashboard' | '/my-program' | '/measurements'
export type NavigationRole = 'admin' | 'coach' | 'trainee'

export interface TraineeNavItem {
  icon: LucideIcon
  label: string
  roles: readonly NavigationRole[]
  to: TraineeRoutePath
}

export const traineeNavItems: TraineeNavItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Panel',
    roles: ['trainee'],
    to: '/dashboard',
  },
  {
    icon: ClipboardList,
    label: 'Moj program',
    roles: ['trainee'],
    to: '/my-program',
  },
  {
    icon: LineChart,
    label: 'Pomiary',
    roles: ['trainee'],
    to: '/measurements',
  },
]

export function getTraineeNavItemsForRole(role: NavigationRole) {
  return traineeNavItems.filter((item) => item.roles.includes(role))
}
