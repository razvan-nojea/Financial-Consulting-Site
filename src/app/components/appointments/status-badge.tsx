import React from "react";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { AppointmentStatus } from "../../contexts/appointments-context";

interface StatusConfig {
  label: string;
  className: string;
  icon: React.ElementType;
}

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  confirmed: {
    label: "Confirmată",
    className: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50",
    icon: CheckCircle2,
  },
  pending: {
    label: "În așteptare",
    className: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50",
    icon: AlertCircle,
  },
  completed: {
    label: "Completată",
    className: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Anulată",
    className: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
    icon: XCircle,
  },
};

interface Props {
  status: AppointmentStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({ status, showIcon = true, size = "sm" }: Props) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding} ${config.className}`}
    >
      {showIcon && <Icon size={size === "sm" ? 11 : 14} />}
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
