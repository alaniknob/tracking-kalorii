import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "warning" | "danger" | "success";

const tones: Record<Tone, string> = {
  info: "bg-info-soft text-info border-info/15",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  success: "bg-success-soft text-success border-success/20",
};

export function Alert({
  tone = "info",
  title,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "title"> & { tone?: Tone; title?: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}
      {...props}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn(title ? "mt-1" : undefined)}>{children}</div>
    </div>
  );
}
