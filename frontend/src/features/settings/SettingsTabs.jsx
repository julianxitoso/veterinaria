import Tabs from '../../components/ui/Tabs'
import { useAuthStore } from '../../store/authStore'
import { SETTINGS_TABS } from '../admin/adminLabels'

export default function SettingsTabs() {
  const permissions = useAuthStore((s) => s.user?.permissions)
  return <Tabs tabs={SETTINGS_TABS.filter((t) => !t.permission || permissions?.includes(t.permission))} />
}
