# Kafeely Promo Website and Waitlist: PRD (Revised v3)

Nov 10, 2026 · Original author @Jameela · v2 drafted for counsel and founder review · **v3 reconciled with the implemented build**

> **How to read this revision.** Items marked **[Counsel]** need legal confirmation before launch. Items marked **[Decision]** are open choices with a proposed default. Items marked **[Proposed v3]** are additions or changes made in this revision, together with the implementation status of each requirement on the live build (Nov 2026). The v2 reconstruction warnings about the site map and phases are resolved here: **the site is one page with anchored sections**, not twelve separate routes (see section 3).

**Change log v2 → v3**

- Site structure reconciled with the single-page build; page list kept as the content map (sections), not routes.
- Section 4.1: rent-band field **kept optional** (decision recorded); consent model matches the implemented, unticked-checkbox flow with recorded wording, language and timestamp.
- Section 4.2–4.4: **implementation status** noted for every FR (demo phase vs production requirement).
- Section 5: the automated banned-term check now has a **negation/allowlist mechanism** — the check as written in v2 would have failed the site's own legal disclaimers.
- Section 6: jurisdiction inconsistency flagged (DIFC entity in the simulated email footer vs federal UAE PDPL in the privacy notice).
- Section 7: technical approach updated to the real stack (Vite SPA on Vercel, Neon Postgres + Vercel Functions API, CSP/HSTS, WebP heroes).
- Appendices: B (Arabic banned terms expanded, with a sense note for 'security deposit'), C (claims register pre-filled at `docs/claims-register.xlsx`), D (controlled lists as implemented), E (consent wording strings as implemented).

## 1. Overview and goals

The site introduces Kafeely to three groups and collects their interest: users (tenants and owners) who join a waitlist, professional partners (property managers, agents, developers, insurers, reinsurers), and investors who express interest. It does not sell a product yet and does not make an offer of securities.

**Goals**

- Build a qualified waitlist for the Dubai premium segment, by role and by area. A **qualified entry** is a confirmed email, plus an area, plus (for owners) a rent band inside the premium segment once that segment is defined.
- Start conversations with developers and property managers about handover and pilot units.
- Open a channel for insurers and reinsurers to express interest in writing.
- Give investors a credible, sourced overview and a way to request the full pack, after the relevant gate.
- Support credibility by showing the model accurately, not by overstating it.

**Non-goals**

- Taking payments or quoting premiums.
- Publishing financial projections, the funding amount, or the underwriter's name.
- Publishing competitor claims or market figures that have not been checked.
- Stating what the product costs, who pays, or what it covers, until the launch structure is confirmed.

**Hard rules for every page**

- No 'guaranteed', 'secured', '0% default risk', or '100% payment guarantee' wording, in English or Arabic (see the banned-term list in Appendix B, including the negation/allowlist mechanism).
- No figures on the public site except those listed on the Definitions sheet of the financial model, with their source and date. This includes any rent band or coverage period shown to the public.
- No testimonials until they are real, consented, and verified.
- The risk-holding model is described only as the launch model confirmed by counsel. Until then, the copy says 'launch structure to be confirmed'.
- No use of developer or competitor logos, names, or branding without written permission.
- A persistent notice on every page says the product is proposed and not yet offered. **[Proposed v3]** Implemented without layout change: the hero disclaimer line plus the footer compliance note carry this notice on every viewport of the single page.

## 2. Audiences and journeys

Each audience sees the same site with a different entry point. The waitlist form asks for the role first, so the follow-up is right from the start.

On the homepage, **Owner** and **Tenant** are the two primary calls to action. Partners, developers, insurers and investors sit in the audience tabs, so the hero has one clear choice rather than six. **[Proposed v3]** The build implements this as four tabbed forms (owner / tenant / partner / investor) in one Audiences section; the hero carries the owner and tenant CTAs with partner and investor entries adjacent.

| Audience | What they need | Call to action | Follow-up |
| --- | --- | --- | --- |
| Owners (premium landlords, multi-property investors) | Income protection, how it works | Join the owner waitlist | Early-access email, then a short call |
| Tenants (high-income, corporate, expatriate) | Easier leasing without a large upfront deposit or guarantor, wording subject to the confirmed structure | Join the tenant waitlist | Eligibility check when available |
| Property managers and agents | Protected leases for their portfolio, fewer defaults | Request a partner briefing | Partner call and pilot discussion |
| Brokers | A referral route for landlords and tenants | Request a partner briefing | Partner call |
| Developers (handover units) | Handover leasing, sales support | Request a developer briefing | Pilot discussion |
| Corporate HR and relocation companies | A smoother housing step for relocating staff | Request a partner briefing | Partner call |
| Insurers and reinsurers | Whether Kafeely is a credible distribution partner | Express interest (partner form) | Confidential call, NDA only if they request it |
| Investors | Overview, team, market, the route to the full pack | Express interest (investor form) | Short call; full pack after NDA and term discussion |

The copy on the owner and tenant pages must not describe cost or who pays until the launch structure is confirmed. **[Decision]** Whether the owner page may say anything about cost, even in principle.

**Journey: owner joins the waitlist**

1. Lands on the homepage and reads the problem section.
2. Chooses 'I own a premium property'.
3. Completes the short form (role, area, email; unit type optional).
4. Confirms the email (double opt-in).
5. Receives a confirmation and a note on what happens next, in the language of the page they used.

**Journey: investor expresses interest**

1. Reads the overview and the model section.
2. Chooses 'Investor'.
3. Completes the interest form with name, firm, email, and investor type.
4. Receives a reply that describes the next step. No amount, valuation, or term is requested or shown on the site.
5. Full materials follow only after the gate set in section 6.

**Journey: partner asks for a briefing**

1. Reads the partner tab for their type (property manager, broker, developer, corporate, insurer).
2. Completes the partner form and books a call from the scheduler (when the scheduler is added).
3. Receives a confirmation with the call time shown in Gulf Standard Time (UTC+4).

## 3. Site structure and pages

**[Proposed v3] Structure decision.** The implemented site is **one page** with anchored sections and a persistent navigation bar, in Arabic (RTL, default) and English (LTR). The twelve-page list below is therefore a **content map**: each row is a section of the single page, or a modal/state. Separate routes can be introduced later for SEO without changing the visual design; hreflang pairs only apply once real `/en` and `/ar` URLs exist.

| # | Page / Section | Purpose | Implementation (Nov 2026) |
| --- | --- | --- | --- |
| 1 | Home (hero) | Problem in brief, two primary calls to action | HeroSlider with sourced benchmarks strip |
| 2 | The problem | Sourced facts about rental income risk and deposits | Problem section (three points) |
| 3 | How it works (Model) | Flow diagram; launch structure 'to be confirmed' | HowItWorks five stages, 'to be confirmed' wording, figures note |
| 4 | For owners | Owner value, owner waitlist entry | Audiences tab: owner |
| 5 | For tenants | Tenant value, tenant waitlist entry | Audiences tab: tenant |
| 6 | For partners | Property managers, agents, brokers, developers, corporate | Audiences tab: partner |
| 7 | For insurers and reinsurers | Distribution-partner interest | Partner tab (partner type option) |
| 8 | For investors | Overview, investor interest form | Audiences tab: investor, strict notice |
| 9 | About and team | Who is behind Kafeely | **Not built** — content pending founders' approval |
| 10 | FAQ | Neutral answers, including 'Is this insurance?' | **Not built** — S priority |
| 11 | Privacy and cookie notice | English and Arabic | Privacy modal (v1.1-UAE-PDPL) + cookie banner |
| 12 | Terms and disclaimer | Proposed, not yet offered | Terms modal |

Plus: confirmation and thank-you state (in-form), 'check your email' state (in-form), verification simulation modal, founder view (demo). **[Proposed v3]** A 404/error state is required before launch; with SPA rewrites in place, any unknown URL currently renders the homepage — acceptable for v1, add a proper 404 when routes are introduced.

The homepage leads to the audience paths. Partners and investors each open to their own follow-up. The investor full pack sits behind the gate in section 6 and is not linked from the site.

## 4. Functional requirements

Priorities: **M** = must for launch, **S** = should, **C** = could. **[Proposed v3]** Each FR now carries an **implementation status**: ✅ implemented (demo) = works on the current build; ⚠️ partial = exists but needs the production backend; ❌ pending.

### 4.1 Forms

| Form | Required fields | Optional fields | Consent | Destination |
| --- | --- | --- | --- | --- |
| Owner waitlist | Role, email, area, waitlist-updates consent | Unit type, annual rent band, phone, marketing consent | See consent model below | Database, tagged 'owner' |
| Tenant waitlist | Role, email, area, waitlist-updates consent | Unit type, move-in timing, phone, marketing consent | See consent model below | Database, tagged 'tenant' |
| Partner interest | Organisation, role, email, partner type, contact consent | Message, call booking | Contact consent | Database, tagged 'partner'; notification email without personal details |
| Investor interest | Name, firm, email, investor type, contact consent | Message, call booking | Contact consent; investor self-classification if counsel requires | Database, tagged 'investor'; notification email without personal details |

**Field rules**

- Area, unit type, and rent band are controlled lists with an 'Other' option, not free text. Implemented — see Appendix D.
- Rent bands are provisional placeholders until the premium segment is defined. **[Decision — recorded Nov 2026]** Implemented: the field is **optional** and the options are labelled 'provisional bands' on the form. Consequence for the metrics: the 'qualified share' of owner entries will be understated while the field stays optional; acceptable for the waitlist phase.
- Phone fields accept international numbers and default to +971. Implemented (placeholder `+971 50 000 0000`); add strict international validation with the backend.
- Tenant forms collect no income, salary, employer, or identity-document data. Implemented.
- Investor and partner forms collect no amount, valuation, or financial details. Implemented.

**Consent model — implemented (v1.1 notice)**

There are two separate consents for waitlist forms, each with its own **unticked** checkbox; partner and investor forms use a single contact consent:

1. **Waitlist updates** (required to submit): permission to email about launch and early access. The form cannot be submitted without it — this avoids holding data with no purpose.
2. **Marketing communications** (optional): permission for wider news and offers.

For every consent, the record stores the timestamp, the exact wording shown, the language, and the privacy-notice version (`ConsentRecord` in code; privacy notice v1.1-UAE-PDPL). Email confirmation (double opt-in) verifies the address and is separate from either consent. See Appendix E for the exact strings.

### 4.2 Form behaviour

| ID | Requirement | Priority | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| FR-01 | Double opt-in: the entry counts only after the confirmation link is clicked | M | An unconfirmed entry never appears in counts or exports as 'confirmed'; the link expires after a set period and can be resent | ⚠️ Simulated in-browser (labelled). Real email link + expiry needs the backend |
| FR-02 | One person is one record; roles are tags | M | Submitting as owner and later as tenant adds a tag to the same record | ✅ Implemented (`roleTags`) |
| FR-03 | Resubmitting an existing email never edits the record directly | M | Changes apply only after re-confirmation; the on-screen response is identical whether or not the email already exists | ✅ Implemented (`pendingUpdate`) |
| FR-04 | Each form states what happens next and how long a reply takes | M | The stated reply time is a number agreed by the team and met in the first 90 days | ✅ Implemented — **2 business days** on all four forms (team commitment) |
| FR-05 | Clear error for each missing or invalid field, with no loss of entered text | M | Tested with keyboard, screen reader, and in English and Arabic | ✅ Implemented (incl. consent error); screen-reader audit pending |
| FR-06 | Bot and abuse protection on every form | M | A challenge (Turnstile or hCaptcha), a honeypot field, and rate limiting are active | ❌ Pending — needs the serverless backend |
| FR-07 | Confirmation pages and emails in English and Arabic, with language stored in the record | M | Arabic emails render RTL in major clients | ⚠️ Language stored per consent record; real email templates pending |
| FR-08 | Every email carries a working unsubscribe link | M | Withdrawal takes effect immediately and is logged | ❌ Pending — no emails exist yet |
| FR-09 | Partner and investor calls booked through a scheduler showing GST (UTC+4) | S | Booking links to the form entry; scheduler listed in the privacy notice | ❌ Pending — preferred-call-window select exists as interim |
| FR-10 | Pre-launch re-confirmation email | S | Non-responders marked inactive, not deleted | ❌ Pending |

### 4.3 Content and navigation

| ID | Requirement | Priority | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| FR-11 | Homepage works at phone width, 16px margins, no horizontal scroll | M | Checked at 320 / 375 / 414px | ✅ Tailwind responsive grid; formal audit pending |
| FR-12 | Arabic runs RTL with mirrored navigation and direction-implying icons | M | Reviewed by a native Arabic reader | ✅ Implemented; native review of the Nov 2026 copy edits pending |
| FR-13 | Language switcher keeps the user on the equivalent page and remembers the choice | M | Switching never resets the language on return | ✅ Implemented (choice persisted in localStorage) |
| FR-14 | Accessible menu, visible focus states, alt text in English and Arabic | M | WCAG 2.2 AA checks pass on the main pages | ⚠️ Partial — formal WCAG audit pending |
| FR-15 | 'Model' copy states the launch structure as 'to be confirmed' until counsel signs off | M | Copy flag in the content file; the site cannot be released with the flag removed without recorded sign-off | ✅ Implemented (`statusNotice`, hero subheadline, footer note) |
| FR-16 | No page offers to sell a product or accept payment | M | Review at each gate | ✅ |
| FR-17 | A persistent 'proposed, not yet offered' notice on every page | M | Present on all pages in both languages | ✅ Hero disclaimer + footer compliance note (no layout change) |
| FR-18 | One agreed Arabic and English number/date formatting convention | S | Style guide applied across both languages | ⚠️ Western digits both languages currently; **[Decision]** confirm convention |
| FR-19 | FAQ page with neutral answers | S | Each answer approved by counsel | ❌ Pending |

### 4.4 Admin

| ID | Requirement | Priority | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| FR-20 | A private view shows the waitlist by role and area | M | Visible to the team; contains no investor or partner personal data beyond what they submitted | ⚠️ Founder view exists, but is **unauthenticated** in the demo (openly labelled as such); real access control pending |
| FR-21 | CSV export for the waitlist | M | Exports are logged with who and when | ✅ Implemented (EXPORT_CSV audit events) |
| FR-22 | Investor and partner records visible only to the two named people | M | Verified by attempting access with an unlisted account | ❌ Pending backend |
| FR-23 | Two-factor authentication and role-based access on every admin account | M | No shared logins; access removed the day someone leaves | ❌ Pending backend |
| FR-24 | A record can be deleted on request; the deletion is logged without storing the deleted personal data | M | The log shows the event, date, and requester type only | ✅ Implemented |
| FR-25 | Access to the waitlist is logged | M | Log reviewable by the named people | ⚠️ Local audit trail exists; server-side logging pending |

## 5. Content, images and graphics

**Hero**

- A photograph of a bright, furnished premium interior in Dubai, from a licensed photographer or a licensed stock library. No recognisable faces without a signed release. The image must not imply that it is a specific property Kafeely works with.
- Headline: a plain statement of what the platform does, with no promise of cover. Subheading: who it is for and that the launch structure is to be confirmed.
- Two primary calls to action (owner, tenant), with the partner and investor entry points in a secondary area.

**Graphics**

- A how-it-works flow drawn as a diagram: lease, assessment, premium, protection partner, claim. Each step is labelled with what happens, and the decision points are marked. The diagram must not show amounts or imply a confirmed insurer.
- An audience map showing the owner, tenant, partner, and investor paths.
- Icons in one style, used for the three problem points on the homepage.
- No market charts on v1. If one is added later, it uses only figures from the Definitions sheet, with source and date printed beside it.

**Visual rules**

- Palette: deep navy, muted gold, warm off-white. **Contrast:** body text and links are light on navy; gold is used only for accents, borders, and large display type, because muted gold on dark navy/off-white usually fails WCAG 2.2 AA for small text. Every colour pair is tested.
- Type: one serif for headings and one sans for body and forms (Cormorant Garamond + Plus Jakarta Sans; Cairo + Amiri for Arabic), each with an Arabic counterpart chosen in advance and tested for weight, size, and line height. **[Decision]** confirm the Arabic pairing with a native designer.
- Every image has a short alt text in English and Arabic.
- No logos of developers, banks, insurers, or competitors. A partner logo appears only after written permission.
- AI-generated images are not used as evidence of properties, people, or results.

**Copy rules**

- Say 'protection' and 'rental income protection'. Do not say 'guarantee' or 'insurance' unless the launch structure is confirmed. **[Counsel]** Whether 'protection' itself is acceptable, since regulators judge the substance of a product, not its label.
- Describe the problem before the product, using facts that can be sourced.
- Keep sentences short. Avoid superlatives such as 'the first', 'the best', or 'the only'.
- Every number on the public site comes from the Definitions sheet and carries its date. The How It Works section states that all figures follow the internal Definitions sheet (Nov 2026), with sources in the Market Sourcing section.
- Arabic copy is written or adapted by a native writer and reviewed by a second reader, not machine-translated. The Nov 2026 compliance rewording (لضمان → للتثبت / للمحافظة) needs this native review.

**Claims register and automated checks — negation/allowlist mechanism [Proposed v3]**

- Every number and every factual claim on the site has a row in the claims register (`docs/claims-register.xlsx`): the text, the page/section, the Definitions-sheet row, the source, the date, and who approved it. The register is pre-filled for the current build.
- The build runs an automated check that fails if (a) a banned term from Appendix B appears in either language **outside an approved exception**, or (b) a number appears in the content file with no register entry.
- **Approved exceptions (negation/disclaimer contexts).** The disclaimers must be allowed to name the words they disclaim — e.g. "does not offer insurance policies", "does not guarantee rental returns", "not licensed as an insurance company or insurance broker". Implementation: each content string carries a compliance flag (`compliance: 'negation' | 'ok' | 'review'`); the checker skips strings flagged `negation` and fails strings flagged `review`. The Arabic sense note in Appendix B is part of the same mechanism.

## 6. Data, privacy and compliance

Counsel must review this section before launch. The points below are working requirements, not legal advice.

**Personal data (waitlist and forms)**

- Collect only what each form needs, as set out in section 4. Implemented.
- Record consent as set out in the consent model in section 4.1. Implemented.
- **[Counsel]** Confirm which data-protection regime applies: the UAE federal Personal Data Protection Law, or a free-zone regime (DIFC or ADGM) if the company is based in one. **[Proposed v3] Observed inconsistency to resolve:** the simulated verification email footer says the entity is at DIFC, while the privacy notice cites federal UAE PDPL. If the company is incorporated in DIFC, the DIFC Data Protection Law (No. 5 of 2020) applies instead of the federal decree-law; align entity references and the notice before launch. Confirm requirements for notice, lawful basis, retention, and individuals' rights. If the site is likely to attract visitors from the EU or UK, confirm whether other rules apply.
- Store data in a location agreed with counsel. The default region of a hosting or database service may be outside the UAE, so choose the region on purpose and document any cross-border transfer. The privacy notice now states the demo-phase reality (device-local storage) and commits to disclosing the production region before launch.
- Set a retention period for each list. Starting point (now stated in the privacy notice, subject to counsel): waitlist entries 24 months from sign-up or 12 months after launch, whichever comes first; investor and partner records 24 months from last contact. Delete on request and when a waitlist closes.
- Give each user a way to withdraw consent from every email.
- **Breach and incident plan:** name who decides, who notifies the authority and affected people, and the target time to do so.

**Investor and partner interest**

- The site may ask whether someone is interested in investing. It must not describe an offer, a return, a valuation, or an amount. Implemented: the investor tab carries a strict regulatory notice.
- **[Counsel]** Confirm whether the investor form, the investor section, and the model copy trigger rules on promoting investments in the UAE, and whether an investor self-classification checkbox is required.
- Investors see the full pack only after the gate in the pack: an NDA where the investor requests one, then a term discussion. The site links to neither.

**What the site must not say**

- No guaranteed income, returns, or payouts.
- No default-rate or recovery figures.
- No named insurer, underwriter, or reinsurer until consent is given in writing.
- No statement that a reinsurer or insurer has agreed to cover the risk.
- No competitor comparisons until the facts are verified and the wording is cleared.
- **[Proposed v3]** No unverified entity or IP claims: the 'protected trademarks' sentence and the unsourced 'multi-billion AED market' claim were removed in Nov 2026.

**Website compliance**

- Privacy notice and cookie notice on every page, in English and Arabic. Implemented as modals reachable from the footer and the cookie banner.
- Cookies: essential storage only. **[Decision — recorded]** The build uses **no analytics at all** and the cookie banner says exactly that; if cookieless analytics is adopted later, the notice is updated first and the banner copy must not promise analytics consent behaviour that does not exist.
- A terms page and a disclaimer that the product is proposed and not yet offered. Implemented as the Terms modal.
- Accessibility checked against WCAG 2.2 AA for the main pages.

**Operational controls**

- Two named people can access investor and partner records (backend pending).
- Access to the waitlist is logged (local audit trail now; server-side later).
- Any new tool that receives personal data is added to the privacy notice before launch. This includes the form service, the database, the email provider, the scheduler, and analytics.
- When a named person leaves or changes role, their access is removed the same day.

## 7. Technical approach, security, analytics and performance

**Current build [Proposed v3 — reconciled with reality]**

- One static bilingual single-page app (Vite + React 19 + TypeScript + Tailwind v4) deployed on Vercel from the `almizanpro-del/kafeelyai` repository; language is a state switch (Arabic RTL default) with the choice persisted. One build, not two.
- Forms post to the Kafeely API and are stored in Neon Postgres with server-enforced access rules (staff can read, only Super-Admins can erase), so investor and partner records are private by default. A spreadsheet is not used as the system of record.
- Email confirmation through a transactional email provider with the double opt-in link; SPF, DKIM, and DMARC set up on the sending domain before any email is sent, and a monitored reply-to mailbox (`noreply@kafeely.com` / `privacy@kafeely.com` are referenced in copy — the mailboxes must exist first).
- A content file for copy (`src/content/translations.ts`), with an English and an Arabic version of every string, so text changes do not need a code change.
- Publishing: the repository is on GitHub; deployments follow from `main` via Vercel (vercel.json pins the Vite preset, a deliberate no-catch-all 404, asset caching, CSP/HSTS headers and the daily purge cron). No terminal needed for content-only edits.

**Security**

- HTTPS everywhere with HSTS and a content security policy (implemented via vercel.json); no secrets in the front-end code (none exist — the build has no API calls).
- Bot protection and rate limiting on all forms (FR-06) — pending backend.
- Database backups, and a tested restore — pending backend.
- Admin accounts use two-factor authentication (FR-23) — pending backend.

**SEO and sharing**

- Meta title and description in both languages on the shell; Open Graph image (`public/og-image.jpg`, 1200×630) and Twitter card implemented; robots.txt implemented. Make the og:image URL absolute once the production domain is known.
- No structured data or search copy that implies insurance or a guarantee.
- hreflang pairs and a sitemap apply only when separate `/en` and `/ar` URLs exist (single-URL v1 needs neither; a sitemap with one URL is not required).

**Performance**

- Mobile-first. The four hero photographs are WebP (~125 KB each, down from ~840 KB JPGs) — Largest Contentful Paint target under 2.5 seconds on a mid-range phone is now realistic; verify with a Lighthouse run before Gate 2. Arabic fonts load from Google Fonts with preconnect; subset/preload if the audit says so.

**Analytics**

- **[Decision — recorded]** No analytics on the current build. Either adopt cookieless analytics that needs no consent banner (confirmed with counsel) or consent-based analytics; do not mix the two statements. The cookie banner copy is already aligned with the no-analytics state.

## 8. Success metrics (first 90 days)

| Metric | Target | Why it matters |
| --- | --- | --- |
| Confirmed owner waitlist entries | [set after launch plan] | Demand from the target segment |
| Confirmed tenant waitlist entries | [set after launch plan] | Demand on the tenant side |
| Partner interest forms | [set after launch plan] | Channel and pilot pipeline |
| Investor interest forms | [set after launch plan] | Investor pipeline, not a fundraising total |
| Confirmation rate (confirmed entries ÷ submitted entries) | At least 80% | Quality of the list |
| Median time from submission to confirmation | [set after launch plan] | Signals email deliverability and friction |
| Share of confirmed entries that meet the 'qualified' definition | [set after launch plan] | Whether the right people are arriving |
| Calls booked from partner and investor forms | [set after launch plan] | Conversion to real conversations |
| Reply time to form submissions | Within 2 business days (stated on every form) | Trust and follow-through |
| Spam or bot entries blocked | Tracked, no target | Health of the protection layer |

Also report waitlist entries by area, unit type, and rent band. **[Proposed v3]** While the rent-band field stays optional, the 'qualified share' metric understates qualification; record the fill rate alongside it.

**Not tracked**

- Revenue, funding amounts, or investor names on any dashboard that a wider team can see.

## 9. Risks, open decisions and milestones

**Milestones**

The four phases below are reconstructed from the original brief (4 phases, 2 gates). Dates are added once the team and budget are confirmed.

| Phase | Scope | Gate |
| --- | --- | --- |
| 1. Foundations | Remaining decisions in the table below, claims-register sign-off, counsel review of structure and copy rules | **Gate 1:** counsel confirms launch-structure wording, regulatory classification, and investor-form approach |
| 2. Build | Production backend (database, real double opt-in, bot protection, admin auth), Arabic copy native review, FAQ and About content | None |
| 3. Pre-launch QA | Accessibility, Arabic review, security checks, privacy notice, cookie notice | **Gate 2:** counsel and founders sign off; claims-register check passes |
| 4. Launch and learn | Publish, monitor metrics, weekly review for 90 days | None |

**Open decisions**

Assign an owner and a 'decide by' date to each before Phase 1 ends. Decisions recorded in Nov 2026 are marked.

| Decision | Proposed default | Owner | Decide by |
| --- | --- | --- | --- |
| Launch structure: insurance distribution or guarantee | Neutral public copy until counsel confirms | [name] | Gate 1 |
| Whether 'protection' wording is acceptable | Use 'protection'; counsel to confirm | [name] | Gate 1 |
| Premium segment threshold, shown on every page that defines the segment | Provisional rent bands on forms only — **recorded Nov 2026 (field optional, bands labelled provisional)** | [name] | Before form build ✅ |
| Coverage period: 3 months in the model | Shown only after the insurer confirms; kept on the Definitions sheet | [name] | Before the model page is published |
| Brand and domain, including the Arabic name and its connotations | See the brand note below | [name] | Gate 1 |
| Form, database, and email tools | Managed database with row-level access; transactional email provider | [name] | Before backend build |
| Who receives investor and partner records | Two named founders | [name] | Before backend build |
| Owner of Arabic copy and its review | A native writer plus a second reader | [name] | Before launch |
| Analytics approach (cookieless or consent-based) | **Recorded Nov 2026: none on the current build**; revisit when analytics are wanted | [name] | Before adding analytics |
| Arabic numerals and formatting convention | One convention across the site (currently Western digits in both languages) | [name] | Before launch |
| Pricing and cost wording on owner and tenant pages | None until structure is confirmed | [name] | Gate 1 |
| Scheduler tool for FR-09 | Cal.com or Calendly, GST display | [name] | Before backend build |

**Brand note [Counsel].** Founder decision (Nov 2026): the Arabic rendering of the brand is **الكفيل** (al-Kafeel, 'the guarantor'); English remains 'Kafeely'. All on-site Arabic copy now uses الكفيل. Note the name still derives from the Arabic *kafeel* (كفيل), so it may itself imply a guarantee, which conflicts with the hard rules in section 1, and the word carries other associations in the Gulf — the trademark search, native-Arabic review, and counsel sign-off remain open before launch.

**Risks**

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Counsel review takes longer than planned | Medium | Delays launch | Book counsel early; build neutral copy that can launch without structure details |
| Regulators treat the model copy or investor form as a promotion | Medium | Rework or restricted launch | Gate 1 decision; keep investor materials behind the gate |
| Arabic copy is late or inconsistent | Medium | Launch without Arabic, or poor quality | Name an owner and a second reviewer in Phase 1; Nov 2026 edits already need this review |
| Confirmation emails land in spam | Medium | Low confirmed-entry rate | SPF, DKIM, DMARC before first send; warm up the sending domain |
| Bot or spam entries pollute the list | High | Poor data, wasted follow-up | FR-06 protections with the backend; monitor blocked entries |
| Personal data stored in the wrong region or tool | Low | Compliance exposure | Choose region deliberately; complete the tool register before launch |

## Appendix A. Sources for page copy (verify before use)

These are working sources, not approved public claims. Check each against the Definitions sheet and the claims register (`docs/claims-register.xlsx`, sheet 'Sources') before any figure is used.

- [Rental yields, April 2026 (Property Monitor, via withlida.com)](https://withlida.com/insights/dubai-rental-yield-index-2026)
- [Q3 2026 luxury yields (Bayut, via Arabian Business)](https://www.arabianbusiness.com/real-estate/dubai-property-10-areas-offering-some-of-the-highest-rental-yields-in-q3-2026)
- [Takeem interview, May 2026 (Enterprise AM)](https://enterpriseam.com/uae/2026/05/08/insurance-for-your-rent-takeem-co-founder-rakesh-tells-us-what-it-took-to-build-the-uaes-first-rental-guarantee-product/) (competitor reference; internal use only)
- [QuintoAndar Garantia page](https://sobre.quintoandar.com.br/garantia/) (Brazilian reference; internal use only, not suitable as public copy)
- [CBUAE insurance register, March 2025](https://centralbank.ae/media/zuzdnrke/cb-register-march-of-2025-final.pdf) (check for a newer register before use)

## Appendix B. Banned-term list (for the automated check)

English: guaranteed, guarantee, secured, secure income, 0% default, 100% payment guarantee, insured, insurance (until the launch structure is confirmed), the first, the best, the only.

Arabic (expanded Nov 2026; to be confirmed by a native reviewer): ضمان, يضمن, الضمان, مضمون, مضمونة, مضمونات, تأمين, تأميني, تأمينية, التأمين, وثائق تأمين, مؤمَّن, وكفالة/كفيل in product-promise contexts.

**Sense note [Proposed v3].** Two legitimate uses must not be flagged:

1. **Negation/disclaimer contexts** — strings whose purpose is to disclaim (e.g. "does not offer insurance policies", "لا تقدم وثائق تأمين", "does not guarantee rental returns", "not licensed as an insurance company"). These carry the `compliance: 'negation'` flag and pass the check.
2. **Security-deposit sense** — Arabic uses the تأمين root for deposits: ودائع تأمينية, ودائع التأمين, مبلغ التأمين ('security deposit'). This is the *problem* the platform addresses, not a promise. Strings using the deposit sense carry `compliance: 'deposit-sense'` and pass the check; a native reviewer confirms each.

## Appendix C. Claims register

The register is now **pre-filled** for the current build at **`docs/claims-register.xlsx`** (sheet 'Claims Register'), with a source-verification checklist (sheet 'Sources'). Columns: Claim or number · Page/Section · Definitions-sheet row · Source and date · Approved by · Approved on · Status · Notes. Counsel and founders complete the approval columns at Gate 2; no figure may appear on the public site without a row here and a Definitions-sheet entry.

## Appendix D. Controlled lists (as implemented, Nov 2026)

- **Owner areas:** Downtown Dubai · Palm Jumeirah · Dubai Marina & JBR · DIFC · Dubai Hills Estate · Emirates Hills / Meadows · Dubai Creek Harbour · City Walk / Jumeirah · Other Prime Dubai District.
- **Tenant areas:** Downtown Dubai · Palm Jumeirah · Dubai Marina & JBR · DIFC · Dubai Hills Estate · City Walk / Jumeirah · Dubai Creek Harbour · Flexible / Exploring Prime Areas.
- **Owner unit types:** 1BR / 2BR / 3+ Penthouse or Sky Villa / Luxury Villa or Townhouse / Mixed Residential Portfolio.
- **Owner rent bands (provisional):** AED 150–250k · AED 250–500k · AED 500k–1M · AED 1M+.
- **Tenant move-in windows:** Immediate · 1–3 months · 3–6 months · Next renewal cycle.
- **Partner types:** Property Management Agency · Real Estate Brokerage/Agency · Residential Property Developer · Licensed Insurer/Takaful Company · Reinsurer/Capacity Provider · Legal or Real Estate Advisory Firm.
- **Investor types:** Venture Capital/Growth Fund · Single/Multi-Family Office · Strategic Real Estate Group · InsurTech/FinTech Syndicate · Accredited Angel Investor.

## Appendix E. Consent wording strings (as implemented, Nov 2026)

- **Waitlist updates (EN, required, unticked):** "I agree to receive Kafeely waitlist updates and early-access information in accordance with the Privacy Notice."
- **Waitlist updates (AR):** "أوافق على استلام تحديثات قائمة الانتظار ومعلومات الوصول المبكر من الكفيل وفقاً لإشعار الخصوصية."
- **Marketing (EN, optional, unticked):** "I agree to receive occasional Kafeely product milestone updates and pilot invitations."
- **Marketing (AR):** "أوافق على استلام تحديثات منصة الكفيل ومستجدات إطلاق الوحدات التجريبية."
- **Contact consent — partner/investor (EN, required, unticked):** "I consent to Kafeely contacting me regarding this submission in accordance with the Privacy Notice."
- **Contact consent (AR):** "أوافق على تواصل الكفيل معي بخصوص هذا الطلب وفقاً لإشعار الخصوصية."
- **Consent error (EN):** "Please tick the required consent checkbox so we can send you your confirmation and waitlist updates." · **(AR):** "يرجى تحديد مربع الموافقة المطلوب حتى نتمكن من إرسال رسالة التأكيد وتحديثات قائمة الانتظار إليك."

Every submission stores: the wording shown, the language, the timestamp, and the privacy-notice version (v1.1-UAE-PDPL).
