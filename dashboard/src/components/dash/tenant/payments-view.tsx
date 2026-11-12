"use client";

import * as React from "react";
import { Receipt, CheckCircle2, CalendarClock, TriangleAlert } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SectionCard } from "@/components/shared/page-header";
import { PAYMENT_STATUS_TONE, type PaymentStatus } from "@/lib/types";
import { aed, fmtDate, num, relativeDays } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type P = {
  id: string; installmentNo: number; amountAed: number; dueDate: string;
  paidDate: string | null; method: string; status: string; unitCode: string;
};

export function TenantPaymentsView({ payments, dict, locale }: { payments: P[]; dict: Dictionary; locale: Locale }) {
  const t = dict.tenant.paymentsTenant;
  const paid = payments.filter((p) => p.status === "paid");
  const next = payments.find((p) => p.status !== "paid");
  const overdue = payments.filter((p) => p.status === "overdue");

  const columns: Column<P>[] = [
    { key: "installmentNo", header: t.instalment, sortable: true, render: (p) => <span className="tnum font-semibold text-foreground">#{num(p.installmentNo)}</span> },
    { key: "amountAed", header: dict.common.amount, sortable: true, render: (p) => <span className="tnum font-medium">{aed(p.amountAed)}</span> },
    { key: "dueDate", header: dict.landlord.financials.dueDate, sortable: true, render: (p) => <span className="tnum text-muted-foreground">{fmtDate(p.dueDate, locale)}</span> },
    { key: "paidDate", header: t.paidOn, render: (p) => <span className="tnum text-muted-foreground">{p.paidDate ? fmtDate(p.paidDate, locale) : "—"}</span> },
    { key: "method", header: dict.landlord.financials.method, render: (p) => <span className="capitalize text-muted-foreground">{p.method.replace("_", " ")}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (p) => <StatusBadge label={dict.status[p.status as PaymentStatus] ?? p.status} tone={PAYMENT_STATUS_TONE[p.status as PaymentStatus] ?? "neutral"} /> },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={CheckCircle2} label={dict.tenant.overview.paymentsDone} value={`${num(paid.length)} / ${num(payments.length)}`} />
        <StatCard
          icon={CalendarClock}
          label={t.nextUp}
          value={next ? aed(next.amountAed) : "—"}
          hint={next ? relativeDays(next.dueDate, locale) : undefined}
          accent
        />
        <StatCard icon={TriangleAlert} label={dict.status.overdue} value={num(overdue.length)} deltaTone={overdue.length ? "down" : "up"} />
      </div>

      <SectionCard>
        <DataTable columns={columns} rows={payments} pageSize={10} search="" emptyState={<span className="block py-8 text-center text-sm text-muted-foreground">{t.empty}</span>} />
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Receipt className="size-3" aria-hidden />
          {dict.common.demoNote}
        </p>
      </SectionCard>
    </>
  );
}
