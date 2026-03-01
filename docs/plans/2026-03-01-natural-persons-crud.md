# Natural Persons Read+Edit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Natural Persons page under Credit Memo that lists all ARES-extracted persons, shows their linked companies, and allows editing all biographical fields.

**Architecture:** Three new backend endpoints on the existing `company` router. New page component following the `CreditCasesPage` modal pattern. `PageId` union extended with `"natural-persons"`.

**Tech Stack:** FastAPI + async SQLAlchemy (backend), React 19 + HeroUI v3 + Iconify (frontend), TypeScript.

---

## Context

`NaturalPerson` rows live in `natural_persons` table (id, jmeno, prijmeni, titul_pred, titul_za, datum_narozeni, statni_obcanstvi, created_at). They are auto-created by ARES sync — no manual create or delete in this feature. Persons link to companies via `company_directors.person_id` and `company_relationships.related_person_id`.

No test suite is installed — verification is via `python -c "..."` import checks + manual browser testing.

---

### Task 1: Backend schemas — NaturalPersonCompanyLink, NaturalPersonListItem, NaturalPersonUpdate

**Files:**
- Modify: `backend/app/company/schemas.py`

**Step 1: Add the three new schemas after `NaturalPersonResponse`**

Open `backend/app/company/schemas.py`. After the existing `NaturalPersonResponse` class, add:

```python
class NaturalPersonCompanyLink(BaseModel):
    ico: str
    obchodni_jmeno: str | None
    role: str  # "Director", "Owner", or "Director & Owner"

    model_config = {"from_attributes": True}


class NaturalPersonListItem(BaseModel):
    id: int
    jmeno: str | None
    prijmeni: str | None
    titul_pred: str | None
    titul_za: str | None
    datum_narozeni: date | None
    statni_obcanstvi: str | None
    companies: list[NaturalPersonCompanyLink] = []

    model_config = {"from_attributes": True}


class NaturalPersonUpdate(BaseModel):
    jmeno: str | None = None
    prijmeni: str | None = None
    titul_pred: str | None = None
    titul_za: str | None = None
    datum_narozeni: date | None = None
    statni_obcanstvi: str | None = None
```

**Step 2: Verify import is clean**

```bash
cd backend && uv run python -c "from app.company.schemas import NaturalPersonListItem, NaturalPersonUpdate, NaturalPersonCompanyLink; print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add backend/app/company/schemas.py
git commit -m "feat: add NaturalPersonListItem, NaturalPersonUpdate schemas"
```

---

### Task 2: Backend routes — GET /persons, GET /persons/{id}, PATCH /persons/{id}

**Files:**
- Modify: `backend/app/company/routes.py`

**Step 1: Add imports at the top of routes.py**

The file already imports `Address, Company, CompanyDirector, CompanyRegistryData, CompanyRelationship, NaturalPerson`. Add to the schemas import:

```python
from app.company.schemas import (
    AddressResponse,
    CompanyDetailResponse,
    CompanyDirectorResponse,
    CompanyRegistryDataResponse,
    CompanyRelationshipResponse,
    NaturalPersonCompanyLink,
    NaturalPersonListItem,
    NaturalPersonResponse,
    NaturalPersonUpdate,
)
```

**Step 2: Add a helper function `_build_person_with_companies`**

Add this async helper before the existing `_load_detail` function:

```python
async def _build_person_with_companies(person: NaturalPerson, db: AsyncSession) -> NaturalPersonListItem:
    """Attach linked company info to a NaturalPerson."""
    # Find ICOs where this person is a director
    dir_result = await db.execute(
        select(CompanyDirector.ico).where(CompanyDirector.person_id == person.id).distinct()
    )
    director_icos = set(dir_result.scalars().all())

    # Find ICOs where this person is an owner
    rel_result = await db.execute(
        select(CompanyRelationship.ico).where(CompanyRelationship.related_person_id == person.id).distinct()
    )
    owner_icos = set(rel_result.scalars().all())

    all_icos = director_icos | owner_icos

    companies: list[NaturalPersonCompanyLink] = []
    for ico in sorted(all_icos):
        co_result = await db.execute(select(Company).where(Company.ico == ico))
        co = co_result.scalar_one_or_none()
        is_dir = ico in director_icos
        is_own = ico in owner_icos
        role = "Director & Owner" if is_dir and is_own else "Director" if is_dir else "Owner"
        companies.append(NaturalPersonCompanyLink(
            ico=ico,
            obchodni_jmeno=co.obchodni_jmeno if co else None,
            role=role,
        ))

    return NaturalPersonListItem(
        id=person.id,
        jmeno=person.jmeno,
        prijmeni=person.prijmeni,
        titul_pred=person.titul_pred,
        titul_za=person.titul_za,
        datum_narozeni=person.datum_narozeni,
        statni_obcanstvi=person.statni_obcanstvi,
        companies=companies,
    )
```

**Step 3: Add the three new route handlers**

Add after the existing `get_registry_data` route (end of file):

```python
@router.get("/persons", response_model=list[NaturalPersonListItem])
async def list_persons(
    q: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("list_persons: q=%s user=%s", q, current_user.id)
    stmt = select(NaturalPerson).order_by(NaturalPerson.prijmeni, NaturalPerson.jmeno)
    if q:
        like = f"%{q.upper()}%"
        stmt = stmt.where(
            (func.upper(NaturalPerson.jmeno).like(like)) |
            (func.upper(NaturalPerson.prijmeni).like(like))
        )
    result = await db.execute(stmt)
    persons = result.scalars().all()
    return [await _build_person_with_companies(p, db) for p in persons]


@router.get("/persons/{person_id}", response_model=NaturalPersonListItem)
async def get_person(
    person_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("get_person: person_id=%s user=%s", person_id, current_user.id)
    result = await db.execute(select(NaturalPerson).where(NaturalPerson.id == person_id))
    person = result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return await _build_person_with_companies(person, db)


@router.patch("/persons/{person_id}", response_model=NaturalPersonListItem)
async def update_person(
    person_id: int,
    body: NaturalPersonUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("update_person: person_id=%s user=%s", person_id, current_user.id)
    result = await db.execute(select(NaturalPerson).where(NaturalPerson.id == person_id))
    person = result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(person, field, value)
    await db.commit()
    await db.refresh(person)
    return await _build_person_with_companies(person, db)
```

**Step 4: Add `func` to the SQLAlchemy imports at the top of routes.py**

Change:
```python
from sqlalchemy import select
```
To:
```python
from sqlalchemy import func, select
```

**Step 5: Verify imports and route registration**

```bash
cd backend && uv run python -c "from app.company import routes; print('OK')"
```

Expected: `OK`

**Step 6: Commit**

```bash
git add backend/app/company/routes.py
git commit -m "feat: add GET/PATCH /company/persons endpoints"
```

---

### Task 3: Frontend API types + functions in companyApi.ts

**Files:**
- Modify: `frontend/src/lib/companyApi.ts`

**Step 1: Add `NaturalPersonCompanyLink` and `NaturalPersonListItem` types**

After the existing `NaturalPerson` type, add:

```typescript
export type NaturalPersonCompanyLink = {
  ico: string;
  obchodni_jmeno: string | null;
  role: string;
};

export type NaturalPersonListItem = {
  id: number;
  jmeno: string | null;
  prijmeni: string | null;
  titul_pred: string | null;
  titul_za: string | null;
  datum_narozeni: string | null;
  statni_obcanstvi: string | null;
  companies: NaturalPersonCompanyLink[];
};
```

**Step 2: Add API functions at the bottom of the file**

```typescript
export async function fetchPersons(q?: string): Promise<NaturalPersonListItem[]> {
  const url = q
    ? `${API_BASE}/company/persons?q=${encodeURIComponent(q)}`
    : `${API_BASE}/company/persons`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  return handleResponse<NaturalPersonListItem[]>(res);
}

export async function updatePerson(
  id: number,
  patch: Partial<Omit<NaturalPersonListItem, "id" | "companies">>
): Promise<NaturalPersonListItem> {
  const res = await fetch(`${API_BASE}/company/persons/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  });
  return handleResponse<NaturalPersonListItem>(res);
}
```

**Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 && echo "TS: OK"
```

Expected: `TS: OK`

**Step 4: Commit**

```bash
git add frontend/src/lib/companyApi.ts
git commit -m "feat: add NaturalPersonListItem types and fetchPersons/updatePerson API functions"
```

---

### Task 4: Extend PageId union in NavigationContext

**Files:**
- Modify: `frontend/src/lib/NavigationContext.tsx:5`

**Step 1: Add `"natural-persons"` to the `PageId` type**

Change line 5 from:
```typescript
export type PageId = "home" | "users" | "roles" | "audit-log" | "credit-cases" | "company-research";
```
To:
```typescript
export type PageId = "home" | "users" | "roles" | "audit-log" | "credit-cases" | "company-research" | "natural-persons";
```

**Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 && echo "TS: OK"
```

Expected: `TS: OK`

**Step 3: Commit**

```bash
git add frontend/src/lib/NavigationContext.tsx
git commit -m "feat: add natural-persons to PageId"
```

---

### Task 5: Create NaturalPersonsPage component

**Files:**
- Create: `frontend/src/components/credit/NaturalPersonsPage.tsx`

**Step 1: Create the file with the full component**

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Modal, TextField, Label, Input, Form, Separator, toast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigation } from "@/lib/NavigationContext";
import {
  fetchPersons,
  updatePerson,
  type NaturalPersonListItem,
} from "@/lib/companyApi";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("cs-CZ");
}

function FullName(p: NaturalPersonListItem) {
  return [p.titul_pred, p.jmeno, p.prijmeni, p.titul_za].filter(Boolean).join(" ") || "—";
}

export function NaturalPersonsPage() {
  const { navigate } = useNavigation();
  const [persons, setPersons] = useState<NaturalPersonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editPerson, setEditPerson] = useState<NaturalPersonListItem | null>(null);

  const load = useCallback(async () => {
    try {
      setPersons(await fetchPersons());
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to load persons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = persons.filter(p => {
    const q = search.toUpperCase();
    return !q
      || (p.jmeno ?? "").toUpperCase().includes(q)
      || (p.prijmeni ?? "").toUpperCase().includes(q);
  });

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editPerson) return;
    const fd = new FormData(e.currentTarget);
    try {
      await updatePerson(editPerson.id, {
        titul_pred: (fd.get("titul_pred") as string) || null,
        jmeno: (fd.get("jmeno") as string) || null,
        prijmeni: (fd.get("prijmeni") as string) || null,
        titul_za: (fd.get("titul_za") as string) || null,
        datum_narozeni: (fd.get("datum_narozeni") as string) || null,
        statni_obcanstvi: (fd.get("statni_obcanstvi") as string) || null,
      });
      setEditPerson(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to update person");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto">
      <div>
        <p className="text-sm text-muted font-mono tracking-wide uppercase">Credit Memo</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Natural Persons</h1>
      </div>

      {/* Search */}
      <Card>
        <Card.Content className="p-4">
          <div className="relative max-w-xs">
            <Icon icon="lucide:search" width={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <p className="text-xs text-muted mt-2">
            Persons extracted from ARES. Use edit to correct biographical data.
          </p>
        </Card.Content>
      </Card>

      {/* Table */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="lucide:loader-circle" width={24} className="animate-spin text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <Icon icon="lucide:user-x" width={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{search ? "No persons match your search." : "No persons found. Research a company first."}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Date of Birth</th>
                  <th className="px-4 py-3 font-medium">Nationality</th>
                  <th className="px-4 py-3 font-medium">Companies</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={i < filtered.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-4 py-3 font-medium">{FullName(p)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(p.datum_narozeni)}</td>
                    <td className="px-4 py-3">{p.statni_obcanstvi ?? "—"}</td>
                    <td className="px-4 py-3">
                      {p.companies.length === 0 ? (
                        <span className="text-muted text-xs">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.companies.map(c => (
                            <button
                              key={c.ico}
                              onClick={() => navigate("company-research", { ico: c.ico })}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                            >
                              {c.obchodni_jmeno ?? c.ico}
                              <span className="opacity-60">({c.role})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onPress={() => setEditPerson(p)}>
                        <Icon icon="lucide:pencil" width={13} /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card.Content>
      </Card>

      {/* Edit modal */}
      <Modal isOpen={!!editPerson} onClose={() => setEditPerson(null)}>
        <Modal.Content>
          <Modal.Header>Edit Person</Modal.Header>
          <Modal.Body>
            {editPerson && (
              <Form id="edit-person-form" onSubmit={handleUpdate} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <TextField name="titul_pred" label="Title (before)" defaultValue={editPerson.titul_pred ?? ""} />
                  <TextField name="titul_za" label="Title (after)" defaultValue={editPerson.titul_za ?? ""} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField name="jmeno" label="First name" defaultValue={editPerson.jmeno ?? ""} />
                  <TextField name="prijmeni" label="Last name" defaultValue={editPerson.prijmeni ?? ""} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField name="datum_narozeni" label="Date of birth (YYYY-MM-DD)" defaultValue={editPerson.datum_narozeni ?? ""} />
                  <TextField name="statni_obcanstvi" label="Nationality code" defaultValue={editPerson.statni_obcanstvi ?? ""} />
                </div>

                {editPerson.companies.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted uppercase font-medium mb-2">Appears in</p>
                      <div className="flex flex-wrap gap-1">
                        {editPerson.companies.map(c => (
                          <button
                            key={c.ico}
                            type="button"
                            onClick={() => { setEditPerson(null); navigate("company-research", { ico: c.ico }); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                          >
                            {c.obchodni_jmeno ?? c.ico}
                            <span className="opacity-60">({c.role})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </Form>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={() => setEditPerson(null)}>Cancel</Button>
            <Button type="submit" form="edit-person-form">Save</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </div>
  );
}
```

**Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 && echo "TS: OK"
```

Expected: `TS: OK` (minor HeroUI API issues are OK to fix inline — check against existing `CreditCasesPage` patterns if errors appear)

**Step 3: Commit**

```bash
git add frontend/src/components/credit/NaturalPersonsPage.tsx
git commit -m "feat: add NaturalPersonsPage component"
```

---

### Task 6: Wire into NavSidebar and AppShell

**Files:**
- Modify: `frontend/src/components/NavSidebar.tsx`
- Modify: `frontend/src/components/AppShell.tsx`

**Step 1: Add nav item to NavSidebar.tsx**

In `NavSidebar.tsx`, inside the Credit Memo `ListBox`, add after the `company-research` item:

```tsx
<ListBoxItem id="natural-persons" textValue="Natural Persons">
  <div className="flex items-center gap-2">
    <Icon icon="lucide:user-round" width={18} />
    Natural Persons
  </div>
</ListBoxItem>
```

**Step 2: Wire page in AppShell.tsx**

Add import at the top of AppShell.tsx:
```tsx
import { NaturalPersonsPage } from "./credit/NaturalPersonsPage";
```

Add a case in the `switch (page)` block after `company-research`:
```tsx
case "natural-persons":
  content = <NaturalPersonsPage />;
  break;
```

**Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 && echo "TS: OK"
```

Expected: `TS: OK`

**Step 4: Commit**

```bash
git add frontend/src/components/NavSidebar.tsx frontend/src/components/AppShell.tsx
git commit -m "feat: wire NaturalPersonsPage into nav and routing"
```

---

## Verification

After all tasks:

1. Start backend: `cd backend && uv run uvicorn app.main:app --reload`
2. Open browser, navigate to Natural Persons under Credit Memo
3. Verify table loads (will be empty if no companies researched yet)
4. Research a company (e.g. ICO `07988435`) → navigate to Natural Persons → person appears with company chip
5. Click Edit → modal opens with pre-filled fields
6. Change a field (e.g. add title), Save → row updates
7. Click company chip in modal → navigates to Company Research with ICO pre-filled
8. Research same company again → second refresh re-populates cleanly, person count unchanged (de-duplication)
