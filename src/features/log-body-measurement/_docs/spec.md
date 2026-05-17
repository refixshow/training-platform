# Body Measurements Spec

## Purpose

Pozwolić podopiecznemu rejestrować okresowe pomiary ciała (waga, body fat, obwody) wraz z opcjonalnym zdjęciem postępu, oraz dać coachowi wgląd w tę samą historię, by mógł interpretować postęp klienta obok wyników treningowych. Ten ficzer zastępuje dotychczasową, wąską tabelę `bodyweightEntries` jednym wpisem pomiarowym, który spina wagę, obwody i opcjonalne zdjęcie w pojedynczy artefakt z datą.

Zakres MVP: jeden pomiar = jeden moment w czasie. Brak edycji historycznej, brak komentarzy coacha, brak alertów.

## Users

- **Trainee:** dodaje wpis pomiarowy, edytuje wpis dnia bieżącego, usuwa własny wpis, przegląda własną historię i wykresy.
- **Coach:** przegląda historię i wykresy dla każdego przypisanego klienta. Nie wpisuje, nie edytuje, nie usuwa.
- **Admin:** rola admina jest obsługiwana przez coacha w MVP (zgodnie z `AGENTS.md`/`FEATURES.md`). Nie ma osobnych uprawnień.

## User Stories

### US1: Trainee loguje pomiar

Priority: P1

Jako podopieczny chcę dodać wpis z dzisiejszą datą zawierający wagę, body fat, dowolny zestaw obwodów i opcjonalne zdjęcie postępu, żeby udokumentować swój stan w jednym momencie.

Independent test: zalogowany trainee otwiera modal logowania, wypełnia przynajmniej jedno pole liczbowe (np. wagę), zapisuje — pojawia się w jego historii pomiarów z dzisiejszą datą i wyborem metryki.

Acceptance:

- GIVEN trainee bez żadnego wcześniejszego pomiaru, WHEN otworzy modal i zapisze z samą wagą 78.4 kg, THEN tworzy się wpis z `bodyWeightKg = 78.4`, `capturedAt = dziś`, pozostałe pola puste, a strona pomiarów wychodzi z empty state.
- GIVEN trainee, WHEN spróbuje zapisać modal bez wypełnienia żadnego pola i bez zdjęcia, THEN przycisk zapisu jest disabled i pokazuje czytelny komunikat „Wpisz przynajmniej jeden pomiar albo dodaj zdjęcie".
- GIVEN trainee z aktywną sesją, WHEN wypełni body weight + obwody + zdjęcie i zapisze, THEN powstaje wpis `bodyMeasurements` z `photoStorageId` referencującym przesłany plik; brak osobnego wpisu w `progressPhotos` poza tym co utworzy upload.
- GIVEN nieuwierzytelniony użytkownik, WHEN spróbuje wywołać mutację `bodyMeasurements.create`, THEN Convex odrzuca z 401-equivalent (`requireAuth`).

### US2: Trainee przegląda swoją historię i trend

Priority: P1

Jako podopieczny chcę zobaczyć listę swoich pomiarów i wykres wybranej metryki w czasie, żeby ocenić swój postęp i powtarzalność.

Independent test: trainee z co najmniej 3 wpisami widzi: aktywną metrykę w bocznej liście, wykres dla tej metryki, listę historii posortowaną malejąco po dacie, ostatnią wartość ze strzałką trendu (góra/dół/równo) względem poprzedniego wpisu.

Acceptance:

- GIVEN trainee z 5 wpisami w ciągu miesiąca, WHEN otworzy `/measurements`, THEN domyślnie aktywna metryka to ta z największą liczbą wypełnień (waga jeśli remis), wykres pokazuje serię punktów po `capturedAt` rosnąco, oś Y ma jednostkę.
- GIVEN trainee, WHEN przełączy metrykę w lewym pasku na np. „Klatka piersiowa", THEN wykres i historia natychmiast pokazują tylko wpisy, które mają wartość dla `chestCm`; wpisy bez tej metryki nie znikają z bazy, tylko nie są punktami na wykresie.
- GIVEN trainee bez żadnego wpisu, WHEN otworzy `/measurements`, THEN widzi empty state z CTA „Dodaj pierwszy pomiar", boczna lista metryk jest disabled.
- GIVEN trainee, WHEN ma jeden wpis z body weight i body fat, THEN w widoku metryki „Lean Body Mass" wykres rysuje wyliczoną wartość `weight × (1 - bodyFat/100)`; metryka jest oznaczona jako wyliczona (tooltip „obliczone na podstawie wagi i % tłuszczu").

### US3: Coach przegląda pomiary swojego klienta

Priority: P1

Jako coach chcę otworzyć stronę klienta i zobaczyć tę samą historię pomiarów i wykres co klient, żeby uwzględnić ją w decyzjach programowych.

Independent test: coach z przypisanym klientem widzi `/clients/$clientId/measurements`, dostaje identyczny widget historii co trainee, ale bez przycisku „Dodaj pomiar" i bez akcji usuwania.

Acceptance:

- GIVEN coach z klientem mającym pomiary, WHEN wejdzie na `/clients/$clientId/measurements`, THEN widzi wykres + historię w trybie read-only, a przycisk „Dodaj pomiar" nie istnieje w drzewie.
- GIVEN coach próbujący wejść na stronę klienta, który NIE jest jego klientem, WHEN trafi na `/clients/$clientId/measurements`, THEN Convex query zwraca 403-equivalent, a strona pokazuje stan „Brak dostępu" zamiast danych.
- GIVEN coach, WHEN spróbuje wywołać `bodyMeasurements.create` / `.update` / `.remove` z UI lub bezpośrednio, THEN mutacja jest odrzucana z błędem autoryzacji.

### US4: Trainee koryguje świeży wpis

Priority: P2

Jako podopieczny chcę móc poprawić błędnie wpisany pomiar w tym samym dniu (literówka w obwodzie) bez tworzenia duplikatu, żeby historia była czysta.

Independent test: trainee z wpisem dzisiejszym otwiera akcję „edytuj" na wpisie z historii, zmienia wartość, zapisuje — wpis z tym samym `_id` ma nową wartość, `capturedAt` bez zmian, `updatedAt` ustawione.

Acceptance:

- GIVEN trainee z dzisiejszym wpisem, WHEN otworzy edycję i zapisze, THEN nie powstaje nowy wpis; istniejący `bodyMeasurements` jest patchowany.
- GIVEN trainee z wpisem starszym niż 24 h, WHEN otworzy historię, THEN przycisk „edytuj" jest niedostępny — pole notatki w UI tłumaczy, że stare wpisy są tylko do odczytu (próbujemy uniknąć retro-fittingu historii).
- GIVEN trainee, WHEN usuwa dzisiejszy wpis przez akcję „usuń", THEN mutacja wymaga potwierdzenia i kasuje dokument + powiązane storage references zdjęcia jeśli ten wpis był jedynym właścicielem photoStorageId.

## Requirements

- FR-001: Schema `bodyMeasurements` zawiera dokładnie te pola liczbowe (wszystkie opcjonalne): `bodyWeightKg`, `bodyFatPercent`, `neckCm`, `shoulderCm`, `chestCm`, `leftBicepCm`, `rightBicepCm`, `leftForearmCm`, `rightForearmCm`, `abdomenCm`, `waistCm`, `hipsCm`, `leftThighCm`, `rightThighCm`, `leftCalfCm`, `rightCalfCm`. Plus `traineeId`, `capturedAt`, `photoStorageId?`, `note?`, `createdAt`, `updatedAt?`.
- FR-002: Walidacja Zod (oraz `parseBodyMeasurementPayload` w Convex) wymaga że co najmniej jedno pole liczbowe LUB zdjęcie jest wypełnione.
- FR-003: Walidacja zakresów (Convex i Zod, wspólne stałe w `src/entities/body-measurement`):
  - `bodyWeightKg` 20–300, krok 0.1
  - `bodyFatPercent` 1–70, krok 0.1
  - każdy obwód `*Cm` 5–250, krok 0.1
- FR-004: Mutacja `bodyMeasurements.create` jest wywoływana tylko przez zalogowanego trainee. `traineeId` jest brane z `getAuthUserId(ctx)` — nigdy z argumentu klienta.
- FR-005: Query `bodyMeasurements.listForTrainee({ traineeId })` zwraca pomiary tylko gdy `getAuthUserId(ctx)` == `traineeId` LUB gdy zalogowany użytkownik to coach przypisany do tego trainee (`users.coachId == coachId`).
- FR-006: Tabela `bodyweightEntries` zostaje usunięta ze schemy bez migracji danych. Istniejące wiersze w środowiskach dev są świadomie odrzucane (hard override). Decyzja udokumentowana w ADR 0001.
- FR-007: Zdjęcie z modala (`photoStorageId`) jest zapisywane jako `_storage` blob i referenced z pola `bodyMeasurements.photoStorageId`. Nie powstaje równoległy wpis w `progressPhotos` — istniejący ficzer progress-photos zostaje nietknięty i osobny. (Decyzja w ADR 0001.)
- FR-008: Lean Body Mass nie jest polem w bazie. Jest derived w UI z `bodyWeightKg × (1 - bodyFatPercent / 100)` i pokazywane TYLKO gdy oba pola są wypełnione w danym wpisie.
- FR-009: Widget historii (`src/widgets/body-measurement-history`) jest jednym komponentem reużywanym przez trainee route i coach route. Tryb read-only kontrolowany propem `canEdit: boolean`.
- FR-010: Domyślnie aktywna metryka to ta z najwyższą liczbą wypełnień w historii; przy remisie kolejność: `bodyWeightKg` → `bodyFatPercent` → kolejność jak w `bodyMeasurementMetrics`.
- FR-011: Trainee może edytować/usuwać tylko wpis z `capturedAt` w dzisiejszej dacie kalendarzowej w strefie czasowej klienta (`Date.now()` w dniu `capturedAt`). Pozostałe są read-only.
- FR-012: Jednostki w UI: kg (1 miejsce po przecinku), % (1 miejsce po przecinku), cm (1 miejsce po przecinku). Brak przełącznika imperialnego w MVP.

## Edge Cases

- Modal pozwala dodać wpis z samym zdjęciem (bez liczb) — wykresy nie pokażą tego wpisu, ale historia pokaże miniaturę i datę.
- Trainee próbuje dwa razy zapisać modal w tej samej chwili (double-click): formularz blokuje submit na czas trwania mutacji. Convex nie wymusza unikalności daty — to jest dozwolone (np. pomiar rano i wieczorem).
- Coach traci dostęp (relacja `coachId` jest zerwana): kolejne odświeżenie strony pomiarów zwraca błąd autoryzacji, lista klientów coacha już nie pokaże tego klienta.
- Zdjęcie nie powiodło się przy uploadzie, ale liczby się zapisały: pomiar powstaje bez `photoStorageId`, UI informuje toastem „Pomiar zapisany, ale zdjęcie się nie wgrało — spróbuj ponownie".
- Body fat zero lub bliskie 100% — walidacja blokuje wartości poza 1–70. Trainee dostaje czytelny komunikat zakresu.
- Lean Body Mass dla wpisu bez body fat: wykres LBM nie rysuje punktu dla tego wpisu (gap w linii zamiast spadku do zera).
- Pierwszy wpis trainee: strzałka trendu w historii pokazuje neutralny stan („pierwszy pomiar"), nie „rośnie/maleje".
- Bardzo długa historia (>500 wpisów): query pobiera ostatnie 365 dni domyślnie; filtr „Wszystkie dane" robi drugi query z limitem 2000 i wymaga jawnego kliknięcia.

## Out Of Scope

- Notatki coacha do konkretnego pomiaru (Coach Review później).
- Eksport CSV/PDF.
- Imperial units.
- Edycja pomiarów starszych niż dzisiejszy dzień.
- Porównanie zdjęć bok-bok (to żyje w osobnym ficzerze progress-photos).
- Powiadomienia o brakujących pomiarach.
- Liczenie BMI, FFMI, talia-do-bioder, innych derived metryk poza LBM.
- Mobile native flow / offline.
- Wstecznym datowaniem wpisów (`capturedAt` zawsze = `Date.now()` przy create w MVP).

## Open Questions

- [ ] Czy zdjęcia pomiaru mają osobny rolldown widoczności coacha (FEATURES.md open decision: „Should progress photos be visible to coach by default?"). Tu zakładam: skoro coach widzi pomiary, to widzi też zdjęcie powiązane z pomiarem. Potwierdzić przed wdrożeniem.
- [ ] Czy w przyszłości chcemy notyfikację coacha gdy klient doda pomiar po >N dni przerwy — to follow-up, nie blokuje MVP.
- [ ] Czy pomiary mają wpadać do tabeli `activities` jako event aktywności (jak `trainingResults`)? Tymczasowo: nie. Decyzja do podjęcia kiedy zbieramy „weekly summary".
