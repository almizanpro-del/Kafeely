"use client";

import * as React from "react";
import { toast } from "sonner";
import { Activity, Database, Gauge, ListTree, Save } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Dictionary } from "@/i18n";

export function SystemView({ dict }: { dict: Dictionary }) {
  const t = dict.admin.system;
  const [config, setConfig] = React.useState({ sla: 5, cap: 120000, kyc: true, autoApprove: false, maintenance: false });

  const services = [
    { icon: Activity, name: "API Gateway", value: "99.98%", ok: true },
    { icon: Database, name: t.dbHealth, value: "PostgreSQL · 12 ms", ok: true },
    { icon: Gauge, name: t.apiLatency, value: "184 ms", ok: true },
    { icon: ListTree, name: t.queueDepth, value: "0 jobs", ok: true },
  ];

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Activity} label={t.uptime} value="99.98%" delta="+0.02%" deltaTone="up" />
        <StatCard icon={Gauge} label={t.apiLatency} value="184 ms" delta="-12 ms" deltaTone="up" />
        <StatCard icon={Database} label={t.dbHealth} value={t.operational} accent />
        <StatCard icon={ListTree} label={t.queueDepth} value="0" hint="0 failed / 0 retried" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={t.config}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cfg-sla" className="text-xs text-muted-foreground">{t.claimReviewSla}</Label>
                <Input id="cfg-sla" type="number" min={1} max={30} value={config.sla}
                  onChange={(e) => setConfig((c) => ({ ...c, sla: Number(e.target.value) }))}
                  className="tnum bg-secondary/60" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cfg-cap" className="text-xs text-muted-foreground">{t.protectionCap} (AED)</Label>
                <Input id="cfg-cap" type="number" step={10000} value={config.cap}
                  onChange={(e) => setConfig((c) => ({ ...c, cap: Number(e.target.value) }))}
                  className="tnum bg-secondary/60" />
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {[
                { key: "kyc" as const, label: t.kycRequired },
                { key: "autoApprove" as const, label: t.autoApproveWaitlist },
                { key: "maintenance" as const, label: t.maintenanceMode, hint: t.maintenanceHint },
              ].map((row) => (
                <label key={row.key} className="flex cursor-pointer items-center justify-between gap-4 py-3.5">
                  <span>
                    <span className="block text-sm font-medium text-foreground">{row.label}</span>
                    {row.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{row.hint}</span>}
                  </span>
                  <Switch
                    checked={config[row.key]}
                    onCheckedChange={(v) => setConfig((c) => ({ ...c, [row.key]: v }))}
                    aria-label={row.label}
                  />
                </label>
              ))}
            </div>
            <Button
              className="w-full bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]"
              onClick={() => toast.success(t.saved)}
            >
              <Save className="size-4" aria-hidden />
              {dict.common.saveChanges}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={`${dict.admin.overview.systemHealth} — services`}>
          <ul className="space-y-3">
            {services.map((s) => (
              <li key={s.name} className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/40 px-4 py-3.5">
                <span className="flex items-center gap-2.5 text-sm text-foreground">
                  <s.icon className="size-4 text-muted-foreground" aria-hidden />
                  {s.name}
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="tnum text-sm font-medium">{s.value}</span>
                  <span className={`pulse-dot size-2 rounded-full ${s.ok ? "bg-emerald-400" : "bg-amber-400"}`} aria-label={t.operational} />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
            Region: <span className="font-medium text-foreground">me-central-1 (Dubai)</span> · Backups: hourly snapshots,
            PITR 7 days · Next maintenance window: Sun 02:00 GST
          </div>
        </SectionCard>
      </div>
    </>
  );
}
