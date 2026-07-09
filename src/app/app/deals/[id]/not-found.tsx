import Link from "next/link";
import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function DealNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden="true" />}
        title="Deal not found"
        description="It may have been deleted, or it belongs to a different workspace."
        className="w-full max-w-md"
      >
        <Button render={<Link href="/app/deals" />}>Back to deals</Button>
      </EmptyState>
    </div>
  );
}
