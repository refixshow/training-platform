# ADR 0001: Jedna tabela `bodyMeasurements` zamiast `bodyweightEntries` + osobnych obwodów

Date: 2026-05-15

## Status

Accepted

## Context

W obecnym schemacie Convex istnieją dwa miejsca, w których fragmentarycznie żyją dane o ciele trainee:

- `bodyweightEntries` — wąska tabela z polem `valueKg`, bez kontekstu (skąd pochodzi waga, czy była częścią sesji pomiarowej).
- `progressPhotos.bodyweightKg` — pole opcjonalne na wpisie zdjęcia postępu.

`FEATURES.md` ma otwartą decyzję: „Should bodyweight be logged independently, attached to photos, attached to training summaries, or all three?". Nowy ficzer pomiarów ciała wymaga dodania ~15 obwodów + body fat — i z miejsca rodzi się pytanie: czy obwody trzymać w osobnej tabeli `bodyCircumferences`, czy obok wagi w nowej tabeli pomiarowej?

Produktowo trainee robi te pomiary „za jednym razem": staje przed lustrem, mierzy obwody, waży się, wpisuje wszystko (i opcjonalnie robi zdjęcie). To jest jeden artefakt z perspektywy użytkownika — jeden dzień, jeden zestaw wartości, opcjonalnie jedno zdjęcie. Rozcinanie tego na N tabel mnoży złączenia w UI (chart musi po dacie spinać wagę i obwody), bez praktycznej korzyści po stronie domeny.

## Decision

Wprowadzamy jedną tabelę `bodyMeasurements`. Zawiera:

- `traineeId`, `capturedAt`, `createdAt`, `updatedAt?` — metadane wpisu.
- Wszystkie pola liczbowe jako `optional<number>`: `bodyWeightKg`, `bodyFatPercent`, plus 14 obwodów.
- `photoStorageId?` — bezpośrednio na wpisie, bez równoległego wiersza w `progressPhotos`.
- `note?` — krótka notatka trainee.

Stara tabela `bodyweightEntries` zostaje usunięta ze schemy **bez migracji danych** (hard override). Projekt jest w fazie MVP / dev, istniejące dane wagowe są nieistotne produktowo i ich utrata jest świadomie akceptowana — koszt migracji nie zwraca się przy zerowej wartości historycznych wpisów. Przepływ pracy zakłada wyczyszczenie tabeli `bodyweightEntries` w dashboardzie Convex przed pushem schemy, jeśli będzie tego wymagała walidacja.

Pole `progressPhotos.bodyweightKg` na razie pozostaje — `progressPhotos` jest osobnym ficzerem (timeline/slider zdjęć) i jego refaktor nie jest w zakresie tego ADR. Open question w `spec.md` przewiduje przyszłą konsolidację.

Lean Body Mass nie staje się polem — jest pure derived: `bodyWeightKg × (1 - bodyFatPercent / 100)`.

## Alternatives Considered

- **Dwie tabele: zostawiamy `bodyweightEntries`, dodajemy `bodyCircumferences`.** Odrzucone: powiela timestamp + owner, wymaga jointu w UI dla pojedynczego sliderowego widoku, mnoży autoryzację, rodzi pytania „co jeśli waga i obwody mają inne `capturedAt`" — które produktowo nie istnieje, bo trainee robi to razem.
- **Trzy tabele: `bodyweightEntries`, `bodyCircumferences`, `progressPhotos` jak teraz.** Odrzucone: ta sama wada, tylko jeszcze bardziej rozdrobniona; trzy authorization checks zamiast jednego; trzy stany loading w UI.
- **Jedna tabela `bodyMeasurements` + osobna `progressPhotos` z FK.** Odrzucone w MVP: dodaje dwukierunkową referencję między tabelami (kto kogo trzyma), komplikuje delete cascade. W zamian `bodyMeasurements.photoStorageId` to bezpośrednia referencja do `_storage`. Jeśli kiedyś trainee będzie mógł użyć tego samego zdjęcia w dwóch widokach — wtedy refaktor.
- **Wide row per dzień (jeden wpis dziennie z lookupem unique).** Odrzucone: trainee może realnie zmierzyć się rano i wieczorem; sztuczne unique psuje UX.

## Consequences

### Positive

- Jeden query na ekranie pomiarów. Jeden authorization check. Jedna subskrypcja Convex.
- UI wykresu i historii dostaje gotowe wpisy z całym kontekstem; filtrowanie po metryce to czysta selekcja pola.
- Brak kodu migracyjnego do utrzymania — schema-change to dosłownie jeden drop + jeden add.
- Decyzja produktowa „Bodyweight storage" z `FEATURES.md` zostaje zamknięta dla MVP.
- Lean Body Mass jako derived: schemat zostaje czysty, nie ma zerwań przy zmianie wzoru.

### Negative

- Hard override traci ewentualne istniejące wpisy w `bodyweightEntries`. Akceptowalne tylko w fazie MVP / dev; gdyby tabela kiedyś trafiła na prod z realnymi danymi, ta decyzja byłaby nie do powtórzenia i wymagałaby ścieżki migracyjnej.
- Tabela jest „szeroka" (kilkanaście opcjonalnych pól numerycznych). Convex sobie z tym radzi, ale przy listowaniu zwracamy więcej pól niż potrzeba do wykresu pojedynczej metryki. Można zoptymalizować w przyszłości polem `metricsPresent: string[]` lub projekcją w query.
- `progressPhotos.bodyweightKg` zostaje jako legacy w jednym miejscu. Należy go uporządkować przy konsolidacji ficzera progress-photos.
- Jeśli kiedyś coach będzie miał wpisywać pomiar w imieniu klienta, autoryzacja `create` musi być rozszerzona w jednym miejscu — co jest plusem, ale wymaga świadomej decyzji.

### Follow-up

- Rozważyć usunięcie `progressPhotos.bodyweightKg` przy następnym refaktorze progress-photos i dopiąć go do `bodyMeasurements.bodyWeightKg` przez datę.
- Po pierwszej iteracji sprawdzić, czy query `listForTrainee` z 500 wpisami zwraca rozsądny payload; jeśli nie — dodać projection w query (`pick`).
- Otworzyć osobne ADR, gdy coach miałby logować w imieniu klienta — to dotknie autoryzacji i UI tego slice'a.
- Przed pierwszym wejściem na prod: jeśli tabela `bodyweightEntries` byłaby w międzyczasie używana z realnymi danymi, ta decyzja musi zostać zrewidowana i zastąpiona właściwą ścieżką migracyjną.
