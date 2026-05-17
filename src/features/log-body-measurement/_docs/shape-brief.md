# Body Measurements — Shape Brief

Status: draft, oczekuje na confirmation od użytkownika.

## 1. Feature Summary

Powierzchnia do logowania i przeglądania pomiarów ciała podopiecznego: waga, body fat, 14 obwodów + opcjonalne zdjęcie postępu. Podopieczny dodaje wpisy „kiedy chce" (ambient, on-demand, nie obowiązkowy rytuał). Trainee i coach widzą tę samą historię — chart aktywnej metryki, lista wpisów, sidebar metryk — ale coach jest read-only. Strategia produktu: zamiast medycznego formularza i fitness-app gamifikacji, zbudować spokojną, edytorską powierzchnię, która nie wstydzi się jednego dużego nagłówka i czytelnej historii.

## 2. Primary User Action

**Trainee:** otworzyć modal, wpisać tylko te wartości które dziś zmierzył, zatwierdzić. Sukces = wpis pojawia się w historii i zaktualizowany chart aktywnej metryki w <300ms od submitu.

**Coach (sekundarnie):** w 2 sekundy zorientować się czy klient w ogóle loguje pomiary i jaki jest trend wybranej metryki, bez przeklikiwania się przez 16 paneli.

## 3. Design Direction

**Color strategy:** Restrained. Jeden accent (`--color-primary` z istniejącego systemu — zielony oklch(52% 0.17 151)) używany TYLKO na: CTA „Dodaj pomiar", aktywny element w sidebarze metryk, linia chartu aktywnej metryki, ikony trendu góra/dół. Wszystko inne to warm graphite ink (`--color-foreground`) na warm off-white surface (`--color-background`). Brak drugiego koloru sygnałowego, brak per-metric color coding.

**Theme scene sentence:** podopieczny w spokojnej chwili tygodnia (po prysznicu, niedzielny wieczór, na kanapie z telefonem) — otwiera apkę nie żeby zadać sobie pracę, tylko żeby zobaczyć gdzie jest, ewentualnie dorzucić jeden-dwa pomiary. Light theme, bo całość produktu jest mobile-first i `PRODUCT.md` jasno odrzuca dark mode dla utrudniania input'u.

**Anchor references:** Linear (typografia, hairline dividers, spacing rhythm) ∩ Apple Fitness Summary (oversized last-value number, calm magazyn-rytm) ∩ DESIGN.md "formal sport". Probe A (`assets/measurements-probe-a-editorial.png`) jest north star kompozycji.

**Anti-references dla TEJ powierzchni:** medyczny formularz z 16 polami w siatce, BI-dashboard z kilkunastoma tile'ami KPI, Heavycoach-style „Log Client Measurement" modal, neon/gradient/progress-rings.

## 4. Scope

- **Fidelity:** production-ready.
- **Breadth:** 2 route'y + 1 modal feature + 1 widget + entity + Convex backend. Pełen end-to-end flow trainee + coach.
- **Interactivity:** shipped-quality, realtime przez Convex subscription, walidacja Formik+Zod, upload zdjęcia.
- **Time intent:** polish until it ships. Po implementacji obowiązkowy critique-and-fix loop w browserze na 3 viewportach.

## 5. Layout Strategy

### `/measurements` (trainee) i `/clients/$clientId/measurements` (coach) — ten sam layout

Desktop ≥1024px, trzy kolumny typograficzne ułożone jak rozkładówka magazynowa:

- **Lewa kolumna 240–280px (sidebar metryk):** lista 17 elementów (16 pól + Lean Body Mass derived). Bez ikon. Typograficzne, hairline dividery między grupami (Sylwetka / Tułów / Kończyny górne / Kończyny dolne). Aktywny element: lewy `border-l-2` w `--color-primary` + bolder weight + filled dot prefix. Po prawej każdego itemu: tiny muted count „12" pokazujący ile wpisów ma daną metrykę. Brak karty wokół sidebara — żyje na background.
- **Centrum 1fr (chart + last value):** breadcrumb „Postępy / Pomiary" + page title „Pomiary" w 3xl display sans, tracking tight. Pod tym: oversized last-value `text-5xl font-semibold` w `--color-foreground` + label „Ostatni pomiar · 12 maja" w muted small + delta `−0,6 kg vs poprzedni` z ikoną trendu w primary. Pod tym chart aktywnej metryki: 280–320px wysokości, single thin line `--color-primary`, 5–7 data point dots, brak gridlines poza pojedynczą horizontal baseline, Y-axis 3 wartości muted, X-axis daty w `dd MMM`. Brak panelu/karty wokół chartu.
- **Prawa, sticky top:** primary CTA „+ Dodaj pomiar" (tylko trainee variant; coach widzi w tym miejscu pusty slot lub label „Widok klienta · tylko odczyt").
- **Pod chartem, full-width:** section label „HISTORIA" all-caps small. 5–10 wpisów historii jako wiersze (hairline dividers, brak karty), struktura: trend arrow + value w semibold + jednostka muted + (jeśli istnieje) miniatura zdjęcia 32px + actions edit/delete (tylko trainee, tylko dziś) + data right-aligned.

Mobile <640px — composition pivot, nie shrink:

- Sticky bottom: pełnoszerokościowy primary CTA „+ Dodaj pomiar" (tylko trainee).
- Top: compact „karta dnia" (bez bordera, mocna typografia): ostatnia data + last-value waga jako hero number + tile-row z 2 dodatkowymi metrykami top-N (tłuszcz, klatka) jako mini-stats.
- Pod tym horizontal scroller chipów metryk z badges count.
- Pod tym mały chart aktywnej metryki (180px wys).
- Pod tym lista historii zwinięta do 3 ostatnich + „zobacz wszystkie".

Tablet 640–1024px — pojedyncza kolumna jak mobile, ale chart pełnowymiarowy i sidebar staje się rozwijaną szufladą „Wybierz metrykę" w nagłówku.

### Modal logowania pomiaru (trainee only) — wizard 3-krokowy

- Desktop: centered modal ~560px szerokości, max-h-90vh, sticky header z tytułem kroku + progress dots (krok 1/3), sticky footer z „Wstecz / Dalej / Zapisz".
- Mobile: pełnoekranowy slide-in od dołu, sticky bottom action bar.
- Krok 1 „Waga i skład" (zawsze widoczny): 3 pola — `bodyWeightKg`, `bodyFatPercent`, opcjonalna notatka. Pierwszy fokus na waga.
- Krok 2 „Tułów" (skip dostępny): 6 pól w pionowej liście (Neck, Shoulder, Chest, Abdomen, Waist, Hips), każde z jednostką cm w suffixie. Layout: dwie kolumny par L/R kiedy aplikowalne; tu wszystkie single. Lekka grupacja: górny tułów (Neck, Shoulder, Chest) i dolny (Abdomen, Waist, Hips) hairline-separated.
- Krok 3 „Kończyny + zdjęcie" (skip dostępny): 8 pól sparowanych L/R w 2-kolumnowej siatce (Biceps L/P, Forearm L/P, Thigh L/P, Calf L/P) + dropzone zdjęcia.
- Każdy krok: zostawienie wszystkich pól pustych nie blokuje przejścia dalej, ale finalny submit waliduje „przynajmniej jedno pole liczbowe lub zdjęcie" (FR-002).

## 6. Key States

- **Default trainee z pomiarami:** layout pełny jak wyżej.
- **Default coach z pomiarami klienta:** identyczny widok bez CTA, bez actions edit/delete, header dodaje breadcrumb „Klienci / Jan Kowalski / Pomiary".
- **Empty trainee (zero wpisów):** centralna kompozycja — duża ikona wagi (Lucide `Scale`) muted, headline „Brak pomiarów" w 2xl, lead „Dodaj pierwszy wpis, żeby zacząć śledzić postęp" muted, primary CTA pod spodem. Sidebar metryk wyszarzony (opacity 50%). Pełni rolę zaproszenia, nie błędu.
- **Empty coach (klient bez wpisów):** identyczna kompozycja, headline „Klient nie dodał jeszcze pomiarów", lead „Zostanie tutaj pokazane gdy {imię klienta} wprowadzi pierwsze dane", brak CTA.
- **Empty per metric (wybrana metryka bez wypełnień):** chart pokazuje pusty obszar z placeholder „Brak danych dla metryki „Lewa łydka"" w centrum i sugerowanymi alternatywami: „Spróbuj: Waga · Klatka piersiowa · Talia" jako muted chips. Historia poniżej dalej pokazuje wszystkie wpisy, z subtelnym oznaczeniem wierszy które MAJĄ tę metrykę.
- **Loading (initial fetch):** sidebar shimmer + chart-area shimmer + 3 history row shimmers. Trwa <500ms typowo, nie blokuje całego layoutu.
- **Loading (mutation submit):** primary CTA w modalu zamienia się w „Zapisywanie..." z disabled state, modal nie zamyka się aż mutation wróci.
- **Error (query):** karta inline pod nagłówkiem z `--color-destructive` icon + tekst „Nie udało się pobrać pomiarów. {error.message}" + button „Spróbuj ponownie".
- **Error (submit):** komunikat pod CTA w modalu, nie toast (modal jest centrum uwagi).
- **Error (photo upload OK + numerics OK ale photo failed):** toast hybrydowy „Pomiar zapisany, ale zdjęcie się nie wgrało" z linkiem „Spróbuj wgrać ponownie".
- **Permission denied (coach na obcego klienta):** dedicated stan zamiast danych: ikona zamka + „Brak dostępu do tego klienta" + link do listy własnych klientów.
- **Edit lock (wpis nie z dzisiaj):** akcje edit/delete renderują się jako muted/disabled z tooltipem „Pomiary starsze niż dziś są tylko do odczytu". Klikanie nic nie robi, brak zmiany layoutu.
- **First measurement saved (sukces P0 ekran):** modal zamyka się, na stronie animuje fade-in last-value number z neutral „pierwszy pomiar" zamiast strzałki trendu, toast „Pierwszy pomiar zapisany. Wracaj co kilka tygodni dla porównania."
- **Reduced motion:** wszystkie fade/slide replaced opacity-only fade ≤120ms.

## 7. Interaction Model

- **Wejście trainee:** klik w „Pomiary" w trainee nav → `/measurements` → lazy query `bodyMeasurements.listForTrainee` → render z domyślną aktywną metryką (najwięcej wypełnień; tie-break: `bodyWeightKg`, potem kolejność z `bodyMeasurementMetrics`).
- **Wybór metryki:** klik w item sidebara → instant local state update → chart + last-value + delta + historia re-render bez nowego query (te same dane, inna projekcja).
- **Otwarcie modala (trainee):** klik primary CTA → focus trap, pierwszy input focused, Esc/X-close pyta confirm jeśli dirty.
- **Wizard nav:** „Dalej" zawsze enabled (skipy dozwolone), „Wstecz" zachowuje wpisane wartości, ostatni krok ma „Zapisz pomiar" zamiast „Dalej".
- **Upload zdjęcia:** dropzone w kroku 3 — accept image/*, preview miniatury po wyborze, możliwość remove. Upload odpalany dopiero przy submit całego wpisu (nie eager), żeby nie zostawiać sierot w storage gdy trainee się rozmyśli.
- **Submit success:** mutation realtime → Convex subscription odświeża listę → modal close fade-out → toast „Zapisano pomiar".
- **Edit dzisiejszego wpisu (trainee):** klik „Edytuj" na wierszu historii → otwiera ten sam wizard z prefilled wartościami, submit patchuje istniejący doc.
- **Delete dzisiejszego wpisu (trainee):** klik „Usuń" → confirm dialog inline („Usunąć pomiar z dziś? Tej akcji nie da się cofnąć.") → mutation remove → wpis znika z historii, jeśli był jedyny dla aktywnej metryki, chart wraca do empty-per-metric.
- **Coach view klienta:** klik „Pomiary" w sub-nav klienta → `/clients/$clientId/measurements` → ten sam widget z `canEdit={false}` → wszystkie actions niedostępne, brak modala.
- **Hover/focus:** wszystkie interaktywne elementy mają focus-visible ring w `--color-ring` (≡ primary). Hover na wierszu historii: bg `--color-muted` 50%.
- **Keyboard nav:** Tab przez sidebar metryki → CTA → modal/historia. Strzałki w sidebarze (up/down) zmieniają aktywną metrykę.

## 8. Content Requirements

Wszystko po polsku. Konwencja: kg / cm / % w sufixach inputów; daty w `dd MMM` (np. „12 maja") na osi chartu i historii, pełne `dd MMMM yyyy` w nagłówku karty dnia.

- Page title: „Pomiary"
- Breadcrumb trainee: „Postępy / Pomiary"
- Breadcrumb coach: „Klienci / {imię klienta} / Pomiary"
- Primary CTA: „+ Dodaj pomiar" (desktop) / „Dodaj" (mobile sticky)
- Sidebar header: brak (typo nadaje hierarchii)
- Sidebar grupy: „Sylwetka", „Tułów", „Kończyny górne", „Kończyny dolne"
- Etykiety metryk PL z `body-measurement.constants.ts`: Waga, Tłuszcz %, Beztłuszczowa masa, Szyja, Barki, Klatka piersiowa, Lewy biceps, Prawy biceps, Lewe przedramię, Prawe przedramię, Brzuch, Talia, Biodra, Lewe udo, Prawe udo, Lewa łydka, Prawa łydka
- Last value label: „Ostatni pomiar · {data}"
- Delta: „−0,6 kg vs poprzedni" / „+0,3 cm vs poprzedni" / „pierwszy pomiar" (gdy brak poprzedniego)
- Historia section: „HISTORIA" all-caps small
- Empty trainee: headline „Brak pomiarów", lead „Dodaj pierwszy wpis, żeby zacząć śledzić postęp.", CTA „Dodaj pierwszy pomiar"
- Empty coach: headline „Klient nie dodał jeszcze pomiarów", lead „Zostanie tutaj pokazane gdy {imię klienta} wprowadzi pierwsze dane."
- Empty per metric: „Brak danych dla metryki „{label}"" + suggestion „Spróbuj: {3 metryki z największą liczbą wypełnień}"
- Modal title: „Nowy pomiar" / „Edytuj pomiar"
- Wizard kroki: „1. Waga i skład", „2. Tułów (opcjonalne)", „3. Kończyny i zdjęcie (opcjonalne)"
- Wizard nav: „Wstecz", „Dalej", „Pomiń", „Zapisz pomiar"
- Validation: „Wartość musi być między {min} a {max} {unit}", „Wpisz przynajmniej jeden pomiar albo dodaj zdjęcie."
- Toast success: „Zapisano pomiar" / „Pierwszy pomiar zapisany. Wracaj co kilka tygodni dla porównania." (kontekstowo)
- Toast hybryd: „Pomiar zapisany, zdjęcie się nie wgrało"
- Permission denied: „Brak dostępu do tego klienta"
- Confirm delete: „Usunąć pomiar z dziś? Tej akcji nie da się cofnąć."

**Realistic content ranges (do prototypowania i UI testów):**
- Waga: 50–120 kg (mediana populacji)
- Body fat: 8–35%
- Obwody: neck 30–48cm, shoulder 90–140cm, chest 80–130cm, biceps 25–45cm, forearm 22–35cm, abdomen/waist 65–120cm, hips 80–130cm, thigh 45–75cm, calf 30–48cm
- Historia: realistycznie 0 / 1 / 5 / 50 / 500+ wpisów (testować wszystkie scenariusze)

## 9. Recommended References

- **`spatial-design.md`** — desktop trzy-kolumnowy layout + mobile composition pivot wymaga deliberate spacing rhythm (Probe A jest editorial, więc gęstość białej przestrzeni jest sama w sobie design decision).
- **`typography.md`** — oversized last-value, display title, all-caps section labels, count badges, numerics w historii — to surface wygrana lub przegrana w typografii.
- **`interaction-design.md`** — wizard 3-step + skip logic + edit lock per-day + photo upload sub-flow.
- **`responsive-design.md`** — composition pivot mobile↔desktop nie shrink; sticky CTA mobile; sidebar→drawer↔chips scroll.
- **`ux-writing.md`** — empty states, delta copy, validation, toast tone (calm coaching, nie hype motivational).
- **Nie dotyczy:** `motion-design.md` poza fade-in last-value i reduced-motion; `color-and-contrast.md` poza weryfikacją że primary OKLCH 52% spełnia AA na CTA.

## 10. Open Questions (resolved)

- ~~First-measurement toast~~ → **resolved:** cichy zawsze ten sam „Zapisano pomiar", bez rozróżnienia pierwszego razu. Brak motivational copy w toastach.
- ~~Lean Body Mass widoczność~~ → **resolved:** zawsze widoczna w sidebarze. Badge count pokazuje 0 gdy żaden wpis nie ma jednocześnie wagi i body fat; klik na metrykę renderuje empty-per-metric z hintem „Uzupełnij wagę i % tłuszczu w jednym pomiarze, żeby zobaczyć trend".
- Sub-nav klienta w widoku coacha — gdzie wpiąć link „Pomiary" — sprawdzić w trakcie Step 2 (load existing pattern z `clients.$clientId.tsx`).

---

## Mock Fidelity Inventory (z Probe A)

Co BIERZEMY do kodu z probe `assets/measurements-probe-a-editorial.png`:

| Ingredient | Implementation |
| --- | --- |
| Oversized hero number (last value) | Semantic `<p>` z Tailwind `text-5xl font-semibold tracking-tight` |
| Single thin chart line z 5 data points, brak gridlines poza baseline | Recharts `<LineChart>` z `strokeWidth=2`, `dot` filled, `CartesianGrid` tylko horizontal lub `strokeDasharray` |
| Typographic sidebar bez ikon, hairline dividers między grupami | Semantic `<nav>` + `<ul>` z `border-b` hairline w `--color-border` |
| Hairline page divider między sidebar a main | `border-l border-border` na main column |
| All-caps small section labels („HISTORIA") | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Right-aligned count badges w sidebarze | `<span>` w muted-foreground, tabular-nums |
| Down-arrow + delta inline z primary | Lucide `ArrowDown`/`ArrowUp` w `text-primary` + tekst |
| Trend arrows w historii | Lucide `ArrowUp`/`ArrowDown`/`ArrowRight` (neutral pierwszy pomiar) |
| Big primary CTA top-right | `Button` design-system primary, ikona Lucide `Plus` |
| Hairline divider między wierszami historii | `border-b border-border` na każdym wierszu |
| Brak card shadows, brak rounded card backgrounds (oprócz CTA) | Wszystkie kontenery flat, tylko CTA ma `rounded-md` |

Co NIE bierzemy literalnie z probe:

- **Slate-blue accent** → zamieniamy na istniejący `--color-primary` (zielony oklch 52% 0.17 151). Probe służył kompozycji, nie palecie.
- **Konkretne wartości („78,4 kg", „−0,6 kg")** → realne dane z Convex query.
- **Brak miniatury zdjęcia w wierszach historii w probe** → kod MUSI dodać miniaturę zdjęcia gdy istnieje (FR-007), bo wierze pomiarów z photo są materialnie różne i probe ich nie pokazuje.
- **Brak akcji edit/delete w probe** → kod MUSI dodać (US4), inline w wierszu w trainee variant only.
- **Sidebar bez nagłówków grup w probe** → kod MUSI dodać nagłówki „Sylwetka / Tułów / Kończyny górne / Kończyny dolne" zgodnie z brief 5.
- **Tylko jedna metryka „Waga" widoczna jako aktywna** → kod implementuje pełen state switcher.

Co probe NIE pokazuje a kod musi mieć:

- Empty states (trainee, coach, per-metric).
- Modal wizard 3-step.
- Coach variant header (breadcrumb + brak CTA).
- Mobile composition pivot.
- Loading shimmers.
- Lean Body Mass derived metric oznaczenie.
