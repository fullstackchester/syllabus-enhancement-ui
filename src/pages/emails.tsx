import { EmailSidebar } from "@/components/emails/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function Email() {
  return (
    <SidebarProvider
      className="!min-h-0 flex-1"
      defaultOpen={false}
      style={{ "--sidebar-width": "256px" } as React.CSSProperties}
    >
      <EmailSidebar />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {Array.from({ length: 24 }).map((_, index) => (
          <div
            key={index}
            className="aspect-video h-12 w-full rounded-lg bg-muted/50"
          />
        ))}
      </div>
    </SidebarProvider>
  )
}
