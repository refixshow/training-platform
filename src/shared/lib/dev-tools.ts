export type DemoRole = 'coach' | 'trainee'

export interface DemoAccount {
  email: string
  name: string
  password: string
  role: DemoRole
}

export const demoAccounts: Record<DemoRole, DemoAccount> = {
  coach: {
    email: 'demo.coach@example.test',
    name: 'Demo Coach',
    password: 'DemoPassword1!',
    role: 'coach',
  },
  trainee: {
    email: 'demo.trainee@example.test',
    name: 'Demo Trainee',
    password: 'DemoPassword1!',
    role: 'trainee',
  },
}

export function isDevToolsEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true'
}

export function getDevToolsKey() {
  return import.meta.env.VITE_DEV_TOOLS_KEY ?? ''
}
