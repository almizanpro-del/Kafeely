/**
 * Super-Admin console — Waitlist Records tab.
 *
 * Extracted from the former AdminPortal monolith (code-review fix:
 * "component splitting"): KPI strip, filter bar and the records table are
 * independent, prop-driven panels.
 */
import React, { useMemo } from 'react';
import { WaitlistEntry } from '../../types';
import { content } from '../../content/translations';
import { CheckCircle2, Clock, Filter, Search, Trash2 } from 'lucide-react';

type AdminCopy = typeof content.en.admin;

/** One record, all roles it holds (FR-02). */
export const rolesOf = (e: WaitlistEntry) => e.roleTags ?? [e.role];

/** Roll-up statistics shown in the always-visible KPI strip. */
export function computeStats(entries: WaitlistEntry[]) {
  const total = entries.length;
  const owners = entries.filter((e) => rolesOf(e).includes('owner')).length;
  const tenants = entries.filter((e) => rolesOf(e).includes('tenant')).length;
  const partners = entries.filter((e) => rolesOf(e).includes('partner')).length;
  const investors = entries.filter((e) => rolesOf(e).includes('investor')).length;
  const verified = entries.filter((e) => e.verified).length;
  const verifiedRate = total > 0 ? Math.round((verified / total) * 100) : 0;
  return { total, owners, tenants, partners, investors, verifiedRate };
}

export const KpiStrip: React.FC<{ stats: ReturnType<typeof computeStats>; t: AdminCopy }> = ({
  stats,
  t,
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-4 border-b border-slate-800 bg-slate-900/40 text-xs">
    <div className="rounded-lg border border-slate-800 bg-[#0B132B] p-2.5">
      <div className="text-slate-400 text-[11px]">{t.kpis.total}</div>
      <div className="font-mono text-lg font-bold text-white tabular-nums">{stats.total}</div>
    </div>
    <div className="rounded-lg border border-slate-800 bg-[#0B132B] p-2.5">
      <div className="text-slate-400 text-[11px]">{t.kpis.owners}</div>
      <div className="font-mono text-lg font-bold text-[#C5A880] tabular-nums">{stats.owners}</div>
    </div>
    <div className="rounded-lg border border-slate-800 bg-[#0B132B] p-2.5">
      <div className="text-slate-400 text-[11px]">{t.kpis.tenants}</div>
      <div className="font-mono text-lg font-bold text-[#C5A880] tabular-nums">{stats.tenants}</div>
    </div>
    <div className="rounded-lg border border-slate-800 bg-[#0B132B] p-2.5">
      <div className="text-slate-400 text-[11px]">{t.kpis.partners}</div>
      <div className="font-mono text-lg font-bold text-slate-300 tabular-nums">{stats.partners}</div>
    </div>
    <div className="rounded-lg border border-slate-800 bg-[#0B132B] p-2.5">
      <div className="text-slate-400 text-[11px]">{t.kpis.investors}</div>
      <div className="font-mono text-lg font-bold text-slate-300 tabular-nums">{stats.investors}</div>
    </div>
    <div className="rounded-lg border border-slate-800 bg-[#0B132B] p-2.5">
      <div className="text-slate-400 text-[11px]">{t.kpis.verifiedRate}</div>
      <div className="font-mono text-lg font-bold text-emerald-400 tabular-nums">{stats.verifiedRate}%</div>
    </div>
  </div>
);

export const RecordsFilterBar: React.FC<{
  searchTerm: string;
  onSearchChange: (v: string) => void;
  roleFilter: string;
  onRoleFilterChange: (v: string) => void;
  areaFilter: string;
  onAreaFilterChange: (v: string) => void;
  uniqueAreas: string[];
  t: AdminCopy;
}> = ({ searchTerm, onSearchChange, roleFilter, onRoleFilterChange, areaFilter, onAreaFilterChange, uniqueAreas, t }) => (
  <div className="flex flex-wrap items-center gap-2">
    {/* Search */}
    <div className="relative min-w-[200px]">
      <Search className="absolute start-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
      <input
        type="text"
        placeholder={t.filters.searchPlaceholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-900 ps-8 pe-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#C5A880] focus:outline-none"
      />
    </div>

    {/* Role filter */}
    <div className="flex items-center gap-1">
      <Filter className="h-3.5 w-3.5 text-slate-400" />
      <select
        value={roleFilter}
        onChange={(e) => onRoleFilterChange(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:border-[#C5A880] focus:outline-none"
      >
        <option value="all">{t.filters.all}</option>
        <option value="owner">{t.filters.owners}</option>
        <option value="tenant">{t.filters.tenants}</option>
        <option value="partner">{t.filters.partners}</option>
        <option value="investor">{t.filters.investors}</option>
      </select>
    </div>

    {/* Area filter */}
    {uniqueAreas.length > 0 && (
      <select
        value={areaFilter}
        onChange={(e) => onAreaFilterChange(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:border-[#C5A880] focus:outline-none"
      >
        <option value="all">All Districts</option>
        {uniqueAreas.map((area) => (
          <option key={area} value={area}>{area}</option>
        ))}
      </select>
    )}
  </div>
);

export const RecordsTable: React.FC<{
  entries: WaitlistEntry[];
  onErase: (entry: WaitlistEntry) => void;
  /** Erasure is a Super-Admin power; staff see read-only rows. */
  canErase: boolean;
  t: AdminCopy;
}> = ({ entries, onErase, canErase, t }) => {
  const empty = useMemo(() => entries.length === 0, [entries]);
  if (empty) {
    return <div className="py-16 text-center text-xs text-slate-400">{t.emptyRecords}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-xs">
        <thead className="border-b border-slate-800 text-slate-400 font-medium">
          <tr>
            <th className="py-3 px-3 text-start">{t.table.date}</th>
            <th className="py-3 px-3 text-start">{t.table.type}</th>
            <th className="py-3 px-3 text-start">{t.table.contact}</th>
            <th className="py-3 px-3 text-start">{t.table.details}</th>
            <th className="py-3 px-3 text-start">{t.table.status}</th>
            <th className="py-3 px-3 text-end">{t.table.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-sans">
          {entries.map((item) => (
            <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
              {/* Date */}
              <td className="py-3 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                {item.submittedAt ? item.submittedAt.slice(0, 10) : '—'}
              </td>

              {/* Role */}
              <td className="py-3 px-3 whitespace-nowrap">
                <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                  {item.role}
                </span>
                <div className="text-[11px] text-[#C5A880]">{item.subRole}</div>
              </td>

              {/* Contact & Entity */}
              <td className="py-3 px-3">
                <div className="font-medium text-white">{item.email}</div>
                <div className="text-[11px] text-slate-400">
                  {item.name || item.organisation || item.firm || (item.phone || '-')}
                </div>
              </td>

              {/* Details */}
              <td className="py-3 px-3 text-slate-300">
                {item.area && <div><span className="text-slate-400">Area: </span>{item.area}</div>}
                {item.rentBand && <div className="text-[11px] text-slate-400">{item.rentBand}</div>}
                {item.unitType && <div className="text-[11px] text-slate-400">{item.unitType}</div>}
                {item.message && <div className="text-[11px] text-slate-400 italic truncate max-w-xs">{item.message}</div>}
              </td>

              {/* Status (Double Opt-In) */}
              <td className="py-3 px-3 whitespace-nowrap">
                {item.verified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Pending Opt-In</span>
                  </span>
                )}
              </td>

              {/* Actions (Delete under UAE PDPL) — Super-Admin only */}
              <td className="py-3 px-3 text-end whitespace-nowrap">
                {canErase ? (
                  <button
                    type="button"
                    onClick={() => onErase(item)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
                    title="Process Data Erasure Request (UAE PDPL)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Erase</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">Read-only</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
