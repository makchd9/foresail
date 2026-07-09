import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Settings" description="Your account, workspace, team, and pipeline" />
      <div className="border-b px-4 sm:px-6">
        <SettingsNav />
      </div>
      <div className="min-h-0 flex-1 p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
