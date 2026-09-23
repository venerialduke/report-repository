# Sample content bible (fictional)

All sample reports describe **Parcel & Pine**, a fictional US online home-goods & furniture retailer. Keep numbers consistent with these facts.

- Founded 2014, HQ Denver CO; offices in Chicago; many remote staff. Fiscal year = calendar year.
- 2025 net revenue **$1.14B** (+9% YoY). 2026 plan $1.24B.
- **~2.3M active customers** (purchased in trailing 12 months). AOV ≈ **$142**. Gross margin ≈ 41%.
- **Pine+ membership**: $59/yr (monthly option $6.99). Free shipping on all orders, early sale access, 5% back in Pine Points. **~480k members** (Aug 2026), ~46% of revenue. Monthly-plan members churn far more than annual.
- Non-member free-shipping threshold: **$49 until 2 Mar 2026, then raised to $75** (see free-shipping elasticity report).
- Channels: web ~52% of orders, app ~38%, marketplace (Amazon/others) ~10%.
- Fulfilment centres (FCs): **Reno NV, Dallas TX, Columbus OH, Allentown PA**. ~1,800 FC associates. Last mile: in-house **Pine Fleet** in 6 metros (Denver, Dallas, Chicago, Columbus, Philadelphia, Phoenix) + national carrier partners elsewhere. Large items ("big & bulky") via white-glove partners.
- Return rate ≈ **11%** of units (furniture 7%, textiles 16%).
- ~2,900 employees (≈1,100 corporate + ≈1,800 FC).
- Peak season: Black Friday → Christmas; "Pine Days" summer sale in July.

## Insights team (report owners)

| Name | Role | Email |
|---|---|---|
| Maya Okafor | Head of Insights | maya.okafor@parcelandpine.com |
| Daniel Reyes | Senior Analyst, Customer | daniel.reyes@parcelandpine.com |
| Priya Natarajan | Lead Data Scientist, Experimentation | priya.natarajan@parcelandpine.com |
| Tom Becker | Operations Analytics Lead | tom.becker@parcelandpine.com |
| Lena Kowalski | Marketing Science Manager | lena.kowalski@parcelandpine.com |
| Samuel Ortiz | Pricing & Finance Analyst | samuel.ortiz@parcelandpine.com |
| Hannah Liu | People Analytics Partner | hannah.liu@parcelandpine.com |
| Jonah Feld | Analytics Engineer | jonah.feld@parcelandpine.com |
| Aisha Rahman | UX Researcher | aisha.rahman@parcelandpine.com |

Team code lives in the `insights-analysis` repo; `report.json` `code[].path` values are paths inside it, e.g. `analyses/2026-09-member-churn/01_cohort_build.sql`.

## Sample catalogue

| id | type | area | published | owner(s) |
|---|---|---|---|---|
| month-3-member-churn | report | Customer & Growth | 2026-09-15 | Daniel Reyes |
| customer-segmentation-2026 | report | Customer & Growth | 2026-04-22 | Daniel Reyes, Priya Natarajan |
| nps-verbatim-themes-h1-2026 | report | Customer & Growth | 2026-07-30 | Aisha Rahman |
| metric-glossary-active-member | article | Methods & Standards | 2026-02-10 | Jonah Feld |
| reading-confidence-intervals | article | Methods & Standards | 2026-05-06 | Priya Natarajan |
| checkout-redesign-ab-test | report | Product & Digital | 2026-06-18 | Priya Natarajan |
| app-search-relevance | report | Product & Digital | 2026-08-27 | Priya Natarajan, Aisha Rahman |
| recommendations-carousel-impact | report | Product & Digital | 2026-03-12 | Priya Natarajan |
| experimentation-playbook | article | Methods & Standards | 2026-01-20 | Priya Natarajan |
| insights-team-h1-2026-retro | article | Methods & Standards | 2026-07-08 | Maya Okafor |
| last-mile-delivery-sla-review | report | Operations & Supply Chain | 2026-09-04 | Tom Becker |
| warehouse-pick-rate-benchmark | report | Operations & Supply Chain | 2026-05-20 | Tom Becker |
| returns-root-cause-analysis | report | Operations & Supply Chain | 2026-08-12 | Tom Becker, Aisha Rahman |
| peak-2026-capacity-plan | report | Operations & Supply Chain | 2026-09-19 | Tom Becker (status: draft) |
| paid-social-geo-holdout | report | Marketing | 2026-06-03 | Lena Kowalski |
| email-cadence-fatigue | report | Marketing | 2026-02-25 | Lena Kowalski |
| brand-tracker-wave-4 | report | Marketing | 2026-08-20 | Lena Kowalski |
| free-shipping-threshold-elasticity | report | Finance & Pricing | 2026-04-08 | Samuel Ortiz |
| pine-plus-ltv-forecast-fy27 | report | Finance & Pricing | 2026-09-10 | Samuel Ortiz |
| engagement-survey-2026 | report | People & Workplace | 2026-06-25 | Hannah Liu |
| hybrid-office-utilization | report | People & Workplace | 2026-03-30 | Hannah Liu |
| fc-associate-attrition | report | People & Workplace | 2026-07-22 | Hannah Liu, Tom Becker |
