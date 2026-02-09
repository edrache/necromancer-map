# Mechanika Gry: Necromancer Island

## 1. Cel
W *Necromancer Island* wcielasz sie w nekromante, ktorego celem jest zaburzanie rownowagi swiata. Gra nie ma klasycznego warunku zwyciestwa.

## 2. Swiat
Swiat to siatka 20x20. Kazde pole ma typ i parametry uzywane przez symulacje.

### 2.1 Typy terenu
- **Plain (PLAIN)**: neutralne pole startowe i docelowe dla ekspansji.
- **Forest (FOREST)**: produkuje sustain.
- **Water (WATER)**: produkuje sustain.
- **Village (VILLAGE)**: osada, zuzywa sustain i ma populacje.
- **City (CITY)**: miasto, zuzywa wiecej sustain i ma wieksza populacje.
- **Mountain (MOUNTAIN)**: bariera nieuczestniczaca w regionach (blokuje lacznosc regionow).

## 3. Parametry podstawowe
Najwazniejsze stale (skroty z `CONFIG`):
- `CONSUMPTION_RATE`: bazowe zuzycie sustain na osobe.
- `DIFFUSION_RATE`: sila wyrownania sustain miedzy zrodlami.
- `STABILITY_REGEN` / `STABILITY_DECAY`: zmiana stabilnosci przy nadwyzce lub deficycie.
- `EXPANSION_THRESHOLD` / `REGRESSION_THRESHOLD`: progi dla ekspansji i regresji.
- `CITY_SIZE_DEMAND_SCALE`: wzrost zapotrzebowania wraz z rozmiarem aglomeracji.
- `FOREST_EXPANSION_CHANCE` / `CITY_EXPANSION_CHANCE`: szansa ekspansji na ture.
- `FOREST_REGROWTH_CHANCE`: szansa odrostu lasu.
- `CITY_FOREST_BURN_SUSTAIN` + `CITY_FOREST_BURN_STABILITY_COST`: awaryjne spalanie lasu przez miasta.

## 4. Kiedy symulacja swiata sie wykonuje
Symulacja swiata (tura) wykonuje sie tylko wtedy, gdy **nie** jestes w trybie lokalnym (Game Mode), **albo** gdy postac spi (po smierci).
W praktyce:
- w Game Mode swiat stoi w miejscu,
- w God Mode swiat wykonuje tury,
- podczas snu swiat wykonuje tury automatycznie.

## 5. Kolejnosc tury (world step)
Kazda tura wykonuje sie w nastepujacej kolejnosci:
1. Aktualizacja zrodel smierci (Death Sources).
2. Produkcja sustain.
3. Dyfuzja sustain.
4. Aktualizacja rozmiarow aglomeracji (citySize).
5. Konsumpcja sustain.
6. Regresja i ekspansja.
7. Odrost lasow.
8. Aktualizacja nazw miast po rozpadzie aglomeracji.
9. Detekcja regionow.
10. Check repression (obecnie puste).
11. Rok +1 i ewentualne skracanie snu.

## 6. Sustain (produkcja, dyfuzja, konsumpcja)
### 6.1 Produkcja
Dla kazdego pola:
```
cell.sustain += CELL_TYPES[cell.type].sustainProduce
```
Produkuja tylko lasy i woda.

### 6.2 Dyfuzja (tylko miedzy forest/water)
Dla kazdego pola typu FOREST lub WATER liczona jest srednia sustainu z polami tego samego typu (4-kierunkowo):
```
cell.targetSustain = (cell.sustain + suma_sasiadow) / (1 + liczba_sasiadow)
cell.sustain = cell.sustain * (1 - DIFFUSION_RATE) + cell.targetSustain * DIFFUSION_RATE
```
To jest czesciowe wyrownanie, a nie natychmiastowe ujednolicenie.

### 6.3 Konsumpcja i stabilnosc
Dla kazdego pola liczony jest popyt:
```
sizeMultiplier = 1 + max(0, citySize - 1) * CITY_SIZE_DEMAND_SCALE
Demand = population * CONSUMPTION_RATE * sizeMultiplier
```

- **Village/City**: nie zuzywa wlasnego `cell.sustain`, tylko **zasysa** sustain z pobliskich zrodel (FOREST/WATER) w odleglosci Manhattan <= 2.
  - Zasysanie pomniejsza sustain **tylko** w lasach. Woda nie traci sustainu (dziala jak zrodlo nieskonczone).
  - Jesli miasto nadal ma deficyt, spala losowy pobliski las (<= 2):
    - zyskuje `target.sustain + CITY_FOREST_BURN_SUSTAIN`
    - las zmienia sie w PLAIN
    - stabilnosc miasta spada o `CITY_FOREST_BURN_STABILITY_COST`
- **Pozostale pola**: zuzywaja wlasny sustain.

**Skutki deficytu**:
- jesli `remaining > 0` (deficyt):
  - `deaths = ceil(deficit * 0.5)` (tylko gdy populacja > 0)
  - `deathSeverity += deaths * 0.1`
  - `stability -= STABILITY_DECAY`
  - dla miast uruchamiana jest erozja aglomeracji (patrz 7.2)

**Skutki nadwyzki**:
- jesli brak deficytu: `stability += STABILITY_REGEN` (do max 1.0)

**Upadek osady**:
- gdy populacja <= 0 i typ to VILLAGE/CITY, pole staje sie PLAIN.

## 7. Regresja, ekspansja i odrost
### 7.1 Regresja
Dla kazdego pola typu FOREST lub CITY, gdy `stability < REGRESSION_THRESHOLD`:
- z prawdopodobienstwem 10% na ture pole zamienia sie w PLAIN.

### 7.2 Erozja aglomeracji miast
Jesli miasto ma deficyt, raz na ture dla danej nazwy miasta wybierana jest losowa komorka na brzegu aglomeracji:
- CITY -> VILLAGE (populacja <= 5, dodatkowy koszt stabilnosci)
- VILLAGE -> PLAIN

### 7.3 Ekspansja
Dla pol typu FOREST/VILLAGE/CITY (nie dotyczy PLAIN/WATER/MOUNTAIN):
- wymagana stabilnosc `> EXPANSION_THRESHOLD`
- wybierany jest losowy sasiad 4-kierunkowy typu PLAIN
- obowiazuje losowa szansa ekspansji:
  - FOREST: `FOREST_EXPANSION_CHANCE`
  - VILLAGE/CITY: `CITY_EXPANSION_CHANCE`
- blokada nazwy: jesli w sasiedztwie 8-kierunkowym nowego pola jest osada o **innej** nazwie, ekspansja jest blokowana
- ograniczenia odleglosci:
  - FOREST: zrodlo i cel musza byc w odleglosci <= 3 od wody
  - VILLAGE/CITY: cel musi miec w promieniu <= 2 **jednoczesnie** wode i las

**Efekt ekspansji**:
- nowe pole dostaje typ ekspandujacego, populacja = 5 (dla osad), stabilnosc = 0.5, nazwa miasta dziedziczona
- przy ekspansji CITY losowy pobliski las (<= 2) jest zamieniany na PLAIN

### 7.4 Odrost lasu
Dla pola PLAIN:
- jesli w promieniu <= 2 jest jednoczesnie woda i las
- z szansa `FOREST_REGROWTH_CHANCE` pole staje sie FOREST ze stabilnoscia 0.5

## 8. Aglomeracje i nazwy
### 8.1 Rozmiar aglomeracji (citySize)
Aglomeracje sa wyznaczane po osiach 8-kierunkowych. Komorki VILLAGE/CITY z ta sama nazwa tworza grupe.
Rozmiar grupy (`citySize`) wplywa na zapotrzebowanie na sustain (patrz 6.3).

### 8.2 Rozpad aglomeracji i nazwy
Jesli jedna nazwa miasta rozpadnie sie na kilka osobnych komponentow (8-kierunkowo), najmniejszy komponent dostaje nowa nazwe pochodna.

## 9. Regiony (lokalne ekosystemy)
Region to spojny obszar pol **niebedacych** MOUNTAIN lub WATER, laczonych 4-kierunkowo.
Dla kazdego regionu:
- `sustainCapacity` = suma `sustainProduce` pol w regionie
- `populationDemand` = suma `population * CONSUMPTION_RATE` (bez mnoznika `citySize`)
- `stability` = srednia stabilnosci pol
Regiony sa wykorzystywane do informacji UI (globalna i lokalna stabilnosc).

## 10. Zrodla smierci i akcje gracza
### 10.1 Death Source (Shift + D)
Przez 5 tur:
- dla kazdego sasiada 4-kierunkowego:
  - `stability -= 0.2`
  - zabija `ceil(population * 0.2)`
- `deathSeverity += killCount`

### 10.2 Zabojstwo na mapie (klik)
- gdy populacja > 0: cala populacja znika, stabilnosc = 0
- gdy populacja == 0: stabilnosc spada o 0.5
- osada zamienia sie w PLAIN

## 11. Co wplywa na co (skrot)
- **Sustain**: produkowany przez FOREST/WATER, wyrownany miedzy nimi, konsumowany przez populacje.
- **Stability**: rosnie przy nadwyzce, spada przy deficycie i w wyniku Death Sources.
- **Population**: spada przy deficycie i w wyniku akcji gracza.
- **City size**: zwieksza popyt osad na sustain.
- **Regiony**: tylko informacyjne (UI), nie steruja mechanika.
