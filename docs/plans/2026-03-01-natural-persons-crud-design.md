# Natural Persons — Read + Edit Design

**Date:** 2026-03-01
**Status:** Approved

## Context

`natural_persons` rows are auto-created by the ARES VR sync (via `_upsert_natural_person`).
Users need to view all extracted persons, search by name, see which companies each person
is linked to (as director or owner), and correct biographical data where ARES data is wrong.

## Decisions

- **Operations:** Read + Edit only (no manual create, no delete — persons are ARES-owned)
- **Placement:** Under "Credit Memo" nav section
- **Editable fields:** All — jmeno, prijmeni, titul_pred, titul_za, datum_narozeni, statni_obcanstvi
- **Linked companies:** Each person shows which companies they appear in (director + owner roles)
- **UI pattern:** Table + modal dialog (consistent with existing UsersPage pattern)

## Backend

**New endpoints** added to the existing `company` router (`/app/company/routes.py`):

```
GET  /company/persons          — list all persons; optional ?q= search on jmeno/prijmeni
GET  /company/persons/{id}     — single person + linked companies
PATCH /company/persons/{id}    — update biographical fields
```

**Route logic for GET /persons:**
- Query all `NaturalPerson` rows (filtered by `q` if provided)
- For each person, aggregate linked companies from both `company_directors` (person_id)
  and `company_relationships` (related_person_id)
- Deduplicate by ICO, attach role label ("Director" / "Owner" / "Director & Owner")

**New schemas** (added to `schemas.py`):
- `NaturalPersonCompanyLink` — `{ico, obchodni_jmeno, role}`
- `NaturalPersonListItem` — full person fields + `companies: list[NaturalPersonCompanyLink]`
- `NaturalPersonUpdate` — all 6 fields optional (partial update)

## Frontend

**New file:** `frontend/src/components/credit/NaturalPersonsPage.tsx`

**Table columns:** Full Name, Date of Birth, Nationality, Companies (badge count), Actions (Edit button)

**Search:** Client-side filter on jmeno + prijmeni (dataset small enough; no server round-trip)

**Edit modal:**
- Fields: titul_pred, jmeno, prijmeni, titul_za, datum_narozeni, statni_obcanstvi
- Below fields: read-only "Appears in" section — company chips, each navigates to Company Research

**New API functions** in `companyApi.ts`:
- `fetchPersons(): Promise<NaturalPersonListItem[]>`
- `updatePerson(id, patch): Promise<NaturalPersonListItem>`

**Navigation:** New entry in Credit Memo `ListBox` in `NavSidebar.tsx`.
AppShell routing wired to render `NaturalPersonsPage` for the new nav item.

## Out of Scope

- Manual person creation
- Person deletion
- Address editing (person addresses are also ARES-owned)
- Pagination (dataset expected to be small — hundreds of persons per deployment)
