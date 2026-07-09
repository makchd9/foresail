import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormAlert({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string | null | undefined;
}) {
  if (!message) return null;
  return (
    <Alert variant={tone === "error" ? "destructive" : "default"} role="alert">
      {tone === "error" ? (
        <AlertCircle className="size-4" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="size-4" aria-hidden="true" />
      )}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/** Map ActionResult fieldErrors to the shape shadcn's FieldError expects. */
export function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined> | undefined,
  name: string,
): Array<{ message?: string }> | undefined {
  const messages = fieldErrors?.[name];
  if (!messages?.length) return undefined;
  return messages.map((message) => ({ message }));
}
