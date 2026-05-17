# Body Measurements Design

## Summary

Jeden wpis pomiaru ciała = jeden dokument w nowej tabeli Convex `bodyMeasurements`, własność trainee, z opcjonalnym `photoStorageId`. Stara tabela `bodyweightEntries` jest migrowana i usuwana ze schemy. Widok wykres + historia + boczna lista metryk żyje w jednym widgecie używanym w dwóch trybach: trainee (edycja) i coach (read-only). Formularz to feature slice z modalem opartym o Formik + Zod, używanym tylko przez trainee.

Lean Body Mass jest wyłącznie wartością derived w UI — bez storage, bez własnego pola.

## Ownership

- **Route/page:**
  - Trainee: `src/routes/measurements.tsx` → renderuje `MeasurementsPage` (trainee variant).
  - Coach: `src/routes/clients.$clientId_.measurements.tsx` → renderuje ten sam widget historii w trybie read-only (analogicznie do istniejącego `clients.$clientId_.results.index.tsx`).
- **Feature slice (akcja podopiecznego):** `src/features/log-body-measurement/`
  - `ui/log-body-measurement-modal.tsx` — modal z Formik + upload zdjęcia
  - `ui/log-body-measurement-form.tsx` — sam formularz (do reużycia w edycji wpisu)
  - `model/log-body-measurement.flow.ts` — orkiestracja: upload do storage → create mutation
  - `index.ts` — public API: `LogBodyMeasurementModal`, `EditBodyMeasurementModal`
- **Entity:** `src/entities/body-measurement/`
  - `model/body-measurement.constants.ts` — lista metryk (klucz, label PL, jednostka, zakres, krok), kolejność, czy `derived`
  - `model/body-measurement.schema.ts` — Zod `bodyMeasurementFormSchema`, `emptyBodyMeasurementFormValues`
  - `model/body-measurement.derived.ts` — `computeLeanBodyMass(entry)`, `getTrendDirection(prev, current)`, `selectDefaultMetric(entries)`
  - `index.ts` — public API
- **Widget (historia + chart):** `src/widgets/body-measurement-history/`
  - `ui/body-measurement-history.tsx` — wrapper z propami `canEdit`, `entries`, `onAdd?`, `onEdit?`, `onDelete?`
  - `ui/body-measurement-metric-list.tsx` — boczna nawigacja metryk
  - `ui/body-measurement-chart.tsx` — Recharts LineChart z labelami osi i jednostkami
  - `ui/body-measurement-timeline.tsx` — lista wpisów z miniaturą zdjęcia i strzałką trendu
  - `index.ts` — public API: `BodyMeasurementHistory`
- **Convex:**
  - `convex/schema.ts` — nowa tabela `bodyMeasurements`, usunięcie `bodyweightEntries` (hard override, bez migracji — patrz ADR 0001)
  - `convex/bodyMeasurements.ts` — `create`, `update`, `remove`, `listForTrainee`, `listForClient`, `generateUploadUrl`, `getPhotoUrl`
  - `convex/validators.ts` — `bodyMeasurementPayloadValidator`, `bodyMeasurementMetricValidator` jeśli potrzebne
- **Shared UI:** używane gotowce z `src/shared/ui/` (Button, Input, Card, Dialog/Modal — jeśli już istnieje; w razie braku dodać shadcn Dialog). Brak nowych design-system primitives w MVP.

## Data Model

### Tabela `bodyMeasurements`

```ts
bodyMeasurements: defineTable({
  abdomenCm: v.optional(v.number()),
  bodyFatPercent: v.optional(v.number()),
  bodyWeightKg: v.optional(v.number()),
  capturedAt: v.number(),
  chestCm: v.optional(v.number()),
  createdAt: v.number(),
  hipsCm: v.optional(v.number()),
  leftBicepCm: v.optional(v.number()),
  leftCalfCm: v.optional(v.number()),
  leftForearmCm: v.optional(v.number()),
  leftThighCm: v.optional(v.number()),
  neckCm: v.optional(v.number()),
  note: v.optional(v.string()),
  photoStorageId: v.optional(v.id('_storage')),
  rightBicepCm: v.optional(v.number()),
  rightCalfCm: v.optional(v.number()),
  rightForearmCm: v.optional(v.number()),
  rightThighCm: v.optional(v.number()),
  shoulderCm: v.optional(v.number()),
  traineeId: v.id('users'),
  updatedAt: v.optional(v.number()),
  waistCm: v.optional(v.number()),
})
  .index('by_trainee', ['traineeId'])
  .index('by_trainee_and_captured_at', ['traineeId', 'capturedAt']),
```

### Metryka — `bodyMeasurementMetrics` (frontend constant)

```ts
// upraszczona struktura, pełna w body-measurement.constants.ts
type MetricKey =
  | 'bodyWeightKg' | 'bodyFatPercent'
  | 'neckCm' | 'shoulderCm' | 'chestCm'
  | 'leftBicepCm' | 'rightBicepCm'
  | 'leftForearmCm' | 'rightForearmCm'
  | 'abdomenCm' | 'waistCm' | 'hipsCm'
  | 'leftThighCm' | 'rightThighCm'
  | 'leftCalfCm' | 'rightCalfCm'
  | 'leanBodyMassKg' // derived only

interface MetricDef {
  key: MetricKey
  label: string         // PL
  unit: 'kg' | '%' | 'cm'
  min: number
  max: number
  step: number          // 0.1
  derived?: true
}
```

### Walidacja Zod

- Każde pole liczbowe: `z.number().min(min).max(max).optional()`
- `note`: `z.string().trim().max(500).optional()`
- `superRefine`: blokuje wpis bez żadnego liczbowego pola i bez zdjęcia.

### Indexy i odczyt

- `by_trainee_and_captured_at` używany do paginacji od najnowszego (`.order('desc')`).
- Domyślny query window: ostatnie 365 dni z `take(500)`. Filtr „Wszystko" robi drugi query z `take(2000)`.

### Derived: Lean Body Mass

Czysta funkcja klient-side:

```ts
function computeLeanBodyMass(entry): number | null {
  if (entry.bodyWeightKg == null || entry.bodyFatPercent == null) return null
  return Number((entry.bodyWeightKg * (1 - entry.bodyFatPercent / 100)).toFixed(1))
}
```

## Flow

### Logowanie pomiaru (trainee)

1. Trainee klika „Dodaj pomiar" → otwiera się `LogBodyMeasurementModal`.
2. Formularz inicjuje się pustymi wartościami; data jest pre-fill = dziś (read-only w MVP).
3. Trainee wpisuje dowolny podzbiór pomiarów i opcjonalnie wybiera plik zdjęcia.
4. Walidacja Zod blokuje submit jeśli wszystkie liczbowe pola puste i brak zdjęcia.
5. Submit:
   a. Jeśli wybrano zdjęcie → `generateUploadUrl()` → POST pliku do storage → otrzymujemy `storageId`.
   b. `bodyMeasurements.create({ ...numericFields, note, photoStorageId? })`.
   c. Convex: `requireAuth`, `traineeId = getAuthUserId(ctx)`, `parseBodyMeasurementPayload`, insert.
6. Modal zamyka się, toast „Zapisano pomiar", lista i wykres się odświeżają (Convex realtime).
7. Jeśli upload zdjęcia padł, ale mutacja na liczbach się powiodła → toast hybrydowy „Pomiar zapisany, zdjęcie nieudane".

### Przegląd historii (trainee/coach)

1. Strona ładuje `bodyMeasurements.listForTrainee({ traineeId })` (trainee variant z `traineeId = me`; coach variant z `traineeId = $clientId` z URL).
2. Convex sprawdza autoryzację: caller == trainee OR caller jest coachem przypisanym do tego trainee.
3. Frontend wylicza domyślną aktywną metrykę (`selectDefaultMetric`), filtruje serie pod wykres, buduje listę historii (DESC).
4. Klik w metrykę w bocznej liście aktualizuje stan lokalny i przerysowuje wykres + historię.
5. Klik „Edytuj" na wpisie (tylko trainee, tylko dziś) → otwiera `EditBodyMeasurementModal` z wartościami wpisu; submit patchuje dokument.
6. Klik „Usuń" na wpisie (tylko trainee, tylko dziś) → confirm → `bodyMeasurements.remove({ measurementId })`; mutacja kasuje storage zdjęcia jeśli istnieje.

## Authorization

- **Trainee:**
  - `create`: dozwolone tylko gdy `getAuthUserId(ctx)` istnieje. `traineeId` ustawiany z auth — argumentu klienta nie ufamy.
  - `update`/`remove`: `getAuthUserId(ctx) === measurement.traineeId` AND `measurement.capturedAt` jest w tym samym dniu kalendarzowym co `Date.now()`. W przeciwnym razie błąd „Pomiar tylko do odczytu po zakończeniu dnia".
  - `listForTrainee({ traineeId })`: dozwolone tylko gdy `getAuthUserId(ctx) === traineeId`.
- **Coach:**
  - `listForClient({ traineeId })` (alias / oddzielna query lub flag w `listForTrainee`): sprawdza `users.coachId === getAuthUserId(ctx)` po stronie Convex. W razie braku relacji rzuca błąd autoryzacji.
  - `create`/`update`/`remove`: niedozwolone w MVP, błąd autoryzacji nawet jeśli traineeId pasuje.
- **Admin:** rola admina obsługiwana przez coacha (per `AGENTS.md`). Brak dodatkowych ścieżek.

Reguły żyją w `convex/bodyMeasurements.ts`, korzystamy z istniejącego helpera `requireAuth` / podobnego wzorca z `convex/progressPhotos.ts` lub `convex/trainingResults.ts` (do potwierdzenia podczas implementacji — patrz `convex/_generated/ai/guidelines.md`).

## UI States

- **Loading:** strona pomiarów pokazuje szkielet boxa wykresu + szkielet listy.
- **Empty (zero wpisów, trainee):** centralna karta z ikoną wagi, opis „Brak pomiarów. Dodaj pierwszy wpis, żeby zacząć śledzić postęp", CTA „Dodaj pomiar". Boczny pasek metryk wyszarzony.
- **Empty (zero wpisów, coach):** identyczna karta bez CTA, tekst „Klient nie dodał jeszcze pomiarów".
- **Empty per metric:** gdy aktywna metryka nie ma żadnego wypełnienia w istniejących wpisach: wykres pokazuje placeholder „Brak danych dla wybranej metryki", historia pokazuje wszystkie wpisy ale podświetlone te z wypełnioną metryką.
- **Error (query):** karta inline „Nie udało się pobrać pomiarów" + retry button.
- **Error (mutation):** toast i komunikat pod przyciskiem zapisu w modalu.
- **Permission denied (coach):** strona renderuje stan „Brak dostępu do tego klienta" zamiast danych.
- **Disabled:** przycisk „Zapisz pomiar" disabled gdy walidacja Zod nie przechodzi. Akcje „Edytuj/Usuń" disabled dla wpisów spoza dzisiejszego dnia z tooltipem wyjaśnienia.
- **Success:** toast „Zapisano pomiar"; modal się zamyka; wykres aktualizuje się przez subskrypcję.
- **Responsive:** trainee mobile-first — sidebar z metrykami staje się horyzontalnym scrollerem chipów nad wykresem; modal pełnoekranowy poniżej breakpointu sm.

## Verification

- **Typecheck:** `npx tsc --noEmit`.
- **Tests:**
  - `src/entities/body-measurement/model/body-measurement.schema.test.ts` — walidacja zakresów + reguła „przynajmniej jedno pole".
  - `src/entities/body-measurement/model/body-measurement.derived.test.ts` — `computeLeanBodyMass`, `getTrendDirection`, `selectDefaultMetric`.
- **Manual browser checks:**
  - Trainee: dodanie wpisu z wagą, z obwodami, ze zdjęciem, kombinacja, próba submit bez niczego, edycja dzisiejszego, próba edycji wczorajszego (brak akcji), usunięcie.
  - Coach: wejście na klienta z pomiarami (widok read-only), wejście na klienta bez pomiarów (empty), próba wejścia na obcego klienta przez URL (denied).
  - Coach próbuje wywołać create mutację z dev-tools — odrzucenie.
- **Convex checks:**
  - Po zmianie schemy: `npx convex dev` przepuszcza push. Jeśli `bodyweightEntries` ma jeszcze stare wiersze w dev — wyczyścić tabelę w dashboardzie albo użyć `--push --typecheck=disable` przy schemata-only force; w MVP idziemy hard override, dane dev odrzucamy.
  - `convex/_generated/api.d.ts` zawiera `bodyMeasurements`, nie zawiera `bodyweightEntries`.
- **Graphify:** `graphify update .` po implementacji, sprawdzić że `body-measurement-history` widget nie staje się god-node.
