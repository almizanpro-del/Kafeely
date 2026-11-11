"use client";

import * as React from "react";
import { FileText, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { ApplicationRow } from "@/lib/data/leasing";

/**
 * Document generation status (leasing) — derived from approved applications.
 * In production this feeds the contract-generation service.
 */
export function LeasingDocGenView({
  applications, dict, locale,
}: {
  applications: ApplicationRow[];
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.leasing.documentsLeasing;

  const rows = React.useMemo(
    () =>
      applications.map((a) => {
        const status = a.status === "approved" ? "ready" : a.status === "rejected" ? "none" : "pending";
        return {
          id: a.id,
          ref: a.ref,
          applicant: a.applicantName,
          unitCode: a.unitCode,
          template: `Tenancy Contract — ${a.unitCode}`,
          status,
          submittedAt: a.submittedAt,
        };
      }),
    [applications]
  );

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "ref", header: dict.landlord.leases.ref, sortable: true,
      render: (r) => (
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
            <FileText className="size-4" aria-hidden />
          </span>
          <span>
            <span className="tnum block font-medium text-foreground">{r.ref}</span>
            <span className="block text-xs text-muted-foreground">{r.applicant}</span>
          </span>
        </span>
      ),
    },
    { key: "unitCode", header: dict.leasing.offersLeasing.unit, sortable: true, render: (r) => <span className="tnum">{r.unitCode}</span> },
    { key: "template", header: t.template, render: (r) => <span className="text-muted-foreground">{r.template}</span> },
    {
      key: "status", header: t.status, sortable: true,
      render: (r) =>
        r.status === "ready" ? (
          <StatusBadge label={t.genReady} tone="gold" />
        ) : r.status === "pending" ? (
          <StatusBadge label={t.genPending} tone="warning" />
        ) : (
          <StatusBadge label={t.genDone} tone="success" />
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      pageSize={10}
      emptyState={
        <EmptyState
          icon={rows.length ? CheckCircle2 : Clock}
          title={t.empty}
          description={dict.common.noResultsFor}
        />
      }
      toolbarExtra={
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-[#c5a880]" aria-hidden />
          {dict.common.demoNote}
        </span>
      }
    />
  );
}
