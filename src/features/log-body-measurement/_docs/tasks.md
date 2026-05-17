# Body Measurements Tasks

Kolejność opiera się na wertykalnym slice (entity → Convex → routes → form → widget → polish). Każdy task ma konkretną ścieżkę pliku. `[P]` = bezpieczny do równoległego wykonania względem innych `[P]` z tej samej sekcji.

## Foundation

- [ ] T001 Dodać entity z konstantami metryk i Zod schemą: `src/entities/body-measurement/model/body-measurement.constants.ts`, `body-measurement.schema.ts`, `body-measurement.derived.ts`, `index.ts`. Zakresy/jednostki/kroki zgodne z FR-003.
- [ ] T002 Walidator Convex i typy współdzielone: `convex/validators.ts` (rozbudowa o `bodyMeasurementPayloadValidator`). Bez duplikacji z entity — Convex tylko walidator literalowy.
- [ ] T003 Schema Convex hard override: w `convex/schema.ts` dodać `bodyMeasurements` z polami i indeksami z `design.md` i jednocześnie usunąć tabelę `bodyweightEntries`. Stare dane w dev są świadomie odrzucane. Jeśli `npx convex dev` blokuje push z powodu istniejących wierszy — wyczyścić `bodyweightEntries` w dashboardzie Convex przed kolejną próbą.
- [ ] T004 Mutacja Convex `bodyMeasurements.create/update/remove` + query `listForTrainee` + query `listForClient` + `generateUploadUrl`: `convex/bodyMeasurements.ts`. Auth wg `design.md` Authorization. Wzorować autoryzację na `convex/progressPhotos.ts` / `convex/trainingResults.ts`.
- [ ] T005 Sprawdzić, że `convex/_generated/api.d.ts` regeneruje się czysto i nie zawiera referencji do `bodyweightEntries`. Jeśli któryś moduł Convex korzystał ze starego API tabeli — wyciąć referencje (grep `bodyweightEntries`).
- [ ] T006 Aktualizacja seed/dev: `convex/dev.ts` — dodać kilka demo wpisów `bodyMeasurements` dla demo trainee, usunąć ewentualne `bodyweightEntries` seedy.

## US1: Trainee loguje pomiar

- [ ] T010 Feature slice akcji: `src/features/log-body-measurement/model/log-body-measurement.flow.ts` z funkcją orkiestrującą upload zdjęcia + create mutację (handluje błąd uploadu jak w FR-007).
- [ ] T011 Formularz Formik + Zod: `src/features/log-body-measurement/ui/log-body-measurement-form.tsx`. Renderuje pola pogrupowane: „Waga i skład" (waga, body fat), „Tułów" (neck, shoulder, chest, abdomen, waist, hips), „Kończyny górne" (L/R bicep, L/R forearm), „Kończyny dolne" (L/R thigh, L/R calf), „Notatka" (textarea opcjonalna). Wszystkie wartości tekstowe → number przez `parseOptionalNumber`.
- [ ] T012 Modal kontener: `src/features/log-body-measurement/ui/log-body-measurement-modal.tsx`. Używa Dialog z shared/ui (jeśli brak — dodać shadcn Dialog wcześniej). Mobile: pełnoekranowy poniżej `sm`.
- [ ] T013 Picker zdjęcia + preview miniatury w modalu (część `log-body-measurement-form.tsx`). Upload odpalany dopiero w submit, nie eager.
- [ ] T014 Public API feature: `src/features/log-body-measurement/index.ts` eksportuje `LogBodyMeasurementModal` i `EditBodyMeasurementModal`.
- [ ] T015 Testy schemy entity: `src/entities/body-measurement/model/body-measurement.schema.test.ts` — happy path, granice, „przynajmniej jedno pole", note max length.

## US2: Trainee przegląda historię i trend

- [ ] T020 Widget `src/widgets/body-measurement-history/ui/body-measurement-history.tsx` — orkiestrator (props: `entries`, `canEdit`, `onAdd?`, `onEdit?`, `onDelete?`, `isLoading`). Routuje na komponenty poniżej.
- [ ] T021 `body-measurement-metric-list.tsx` — sidebar / chip-row metryk z liczbą wypełnień przy każdej.
- [ ] T022 `body-measurement-chart.tsx` — Recharts LineChart z osią Y mającą jednostkę aktywnej metryki, oś X z datami, tooltip pokazujący datę i wartość.
- [ ] T023 `body-measurement-timeline.tsx` — lista wpisów z strzałką trendu (góra/dół/równo vs poprzedni), miniaturą zdjęcia (z `getPhotoUrl`), datą; akcje edit/delete tylko gdy `canEdit && isToday(entry.capturedAt)`.
- [ ] T024 Public API widget: `src/widgets/body-measurement-history/index.ts`.
- [ ] T025 Route trainee: `src/routes/measurements.tsx` — TanStack Start `createFileRoute('/measurements')`. Pobiera `bodyMeasurements.listForTrainee` przez `convexQuery`, podaje `canEdit: true`, montuje `LogBodyMeasurementModal` na klik CTA.
- [ ] T026 Nawigacja trainee: dodać wpis „Pomiary" do trainee navigation (lokalizacja zależna od istniejącej struktury — sprawdzić `src/app/`). Dla MVP można też wciąć link w „Postępy"/profilu trainee.
- [ ] T027 Testy derived: `src/entities/body-measurement/model/body-measurement.derived.test.ts` — `computeLeanBodyMass` (oba pola wypełnione, brak body fat, brak weight), `getTrendDirection` (rośnie/maleje/równo/pierwszy), `selectDefaultMetric` (zwycięzca po liczbie wypełnień, tiebreak).

## US3: Coach przegląda pomiary klienta

- [ ] T030 Route coach: `src/routes/clients.$clientId_.measurements.tsx`. Wzorować strukturę na `clients.$clientId_.results.index.tsx`. Query: `bodyMeasurements.listForClient({ traineeId: $clientId })`. Render: ten sam `BodyMeasurementHistory` z `canEdit={false}`.
- [ ] T031 Link w sub-nav klienta coacha: tab/link „Pomiary" w `src/routes/clients.$clientId.tsx` lub odpowiedniku. Sprawdzić istniejące zakładki (Treningi / Postęp) i dodać Pomiary jako nową.
- [ ] T032 Stan „brak dostępu" dla coacha: gdy query rzuca auth error, route renderuje zamiast danych prosty komponent „Brak dostępu do klienta" (re-use z innych stron klienta jeśli istnieje wzór).

## US4: Trainee koryguje świeży wpis

- [ ] T040 `EditBodyMeasurementModal` korzysta z tego samego `log-body-measurement-form.tsx` z `initialValues` z wpisu i mutacją `bodyMeasurements.update` zamiast `create`. Brak osobnego komponentu formularza.
- [ ] T041 Wywołanie `onEdit` z timeline otwiera `EditBodyMeasurementModal`. Sprawdzenie `isToday(capturedAt)` na froncie i dodatkowo backend wymusza tę regułę.
- [ ] T042 `onDelete` z timeline: confirm dialog, `bodyMeasurements.remove`. Convex mutacja kasuje `_storage` blob jeśli `photoStorageId` było jedynym referencerem (na razie zakładamy 1:1 więc safe).

## Polish

- [ ] T900 Empty states: pusty stan trainee z CTA, pusty stan coacha bez CTA, pusty stan per-metric (FR + design `UI States`).
- [ ] T901 Error states: error query, error mutation, error upload (toast hybrydowy z FR-007).
- [ ] T902 Mobile audit trainee: sidebar metryk → horyzontalny scroller chipów, modal pełnoekranowy poniżej `sm`. Testowy przebieg na 360 px.
- [ ] T903 Accessibility: labelki ze sprzętem PL i jednostkami w nawiasach, focus na pierwszy input modala, ARIA live na toasty, kontrast wskaźnika trendu nie polega tylko na kolorze (strzałka + tekst). Zgodne z `PRODUCT.md`.
- [ ] T904 Aktualizacja `FEATURES.md`: w sekcji „7. Statistics" zamienić wzmiankę o samym bodyweight na pełną sekcję 8b „Body Measurements" lub dopisek; przepiąć open decision o bodyweight storage jako resolved (linkiem do ADR 0001).
- [ ] T905 `graphify update .` po finalnym przebiegu kodu; sprawdzenie czy widget i feature są na zdrowych pozycjach w grafie.
- [ ] T906 Weryfikacja końcowa wg `references/definition-of-done.md`: typecheck zielony, testy przechodzą, ręczne przejścia trainee/coach, lint, Convex codegen czysty.

## Notes

- Jeśli `shared/ui` nie ma jeszcze komponentu Dialog (modal) — dodać go _przed_ T012 jako osobny commit. Nie tworzyć ad hoc modala w feature slice; modal musi być design-system primitive bez publicznego `className` (per `TECH.md`/atomic-design rules).
- Hard override: zmiana schemy w T003 wywala `bodyweightEntries` bez migracji. To jest świadoma decyzja MVP (patrz ADR 0001). Jeśli przed pushem schemata Convex zarzuca o niezgodność typów, oznacza to że w środowisku są stare wiersze — wyczyścić tabelę w dashboardzie.
- Authorization wzorować na istniejących Convex modułach (`progressPhotos.ts`, `trainingResults.ts`) zamiast wymyślać własny pattern. Sprawdzić `convex/_generated/ai/guidelines.md` przed implementacją.
