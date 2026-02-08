# Necromancer Island

Mroczna, minimalistyczna symulacja ekosystemu na siatce 20x20, w ktorej jako nekromanta zaklocasz lokalna rownowage. Gra nie ma klasycznego celu zwyciestwa: obserwujesz, jak swiat reaguje na ingerencje, jak regiony stabilizuja sie lub zapadaja, oraz jak miasta bronia sie przed glodem.

## Najwazniejsze cechy
- Dwuetapowy widok: mapa swiata (20x20) oraz lokalny widok terenu (20x20) generowany na biezaco.
- Symulacja zasobow (sustain) z produkcja, dyfuzja i konsumpcja.
- Stabilnosc komorek wpływa na ekspansje, regresje i wizualna czytelnosc.
- Miasta i wioski grupuja sie w aglomeracje z unikatowymi nazwami.
- Nekromanta wprowadza chaos: bezposrednie zabojstwa i zrodla smierci.
- Sterowanie czasem: pauza, predkosci tur, suwak TPS.

## Fabuła i cel rozgrywki
Wcielasz sie w nekromante, ktory burzy naturalna rownowage. Nie ma warunku zwyciestwa. Twoja rola to eksperymentowanie z systemem: destabilizuj, obserwuj, reaguj.

## Swiat gry
Mapa swiata to siatka 20x20 pol. Kazde pole ma typ, stabilnosc, zasoby i ewentualna populacje.

Typy terenu:
- Rownina (PLAIN)
- Las (FOREST)
- Woda (WATER)
- Wioska (VILLAGE)
- Miasto (CITY)
- Gory (MOUNTAIN)

## Symulacja (kolejnosc tury)
Kazda tura wykonuje sie w kolejnosci:
1. Aktualizacja zrodel smierci.
2. Produkcja zasobow przez lasy i wode.
3. Dyfuzja zasobow pomiedzy komorkami.
4. Aktualizacja rozmiarow grup miejskich.
5. Konsumpcja zasobow przez populacje.
6. Regresja i ekspansja terenow.
7. Odnawianie lasow.
8. Korekty nazw miast po rozpadzie grup.
9. Detekcja regionow (lokalnych ekosystemow).
10. Aktualizacja UI.

## Zasoby, populacja i stabilnosc
- Lasy i woda produkuja sustain.
- Wioski i miasta konsumują sustain proporcjonalnie do populacji i rozmiaru aglomeracji.
- Brak zasobow powoduje spadek stabilnosci i wymieranie ludnosci.
- Wysoka stabilnosc sprzyja ekspansji, niska powoduje regresje (np. lasy lub miasta moga zamienic sie w rowniny).

## Miasta, nazwy i erozja
- Sasiednie wioski i miasta lacza sie w grupy o jednej nazwie.
- Rozmiar grupy zwieksza zapotrzebowanie na zasoby.
- Miasta moga spalac pobliskie lasy, by przetrwac, kosztem stabilnosci.
- Przy chronicznych niedoborach miasta eroduja (miasto -> wioska -> rownina).

## Akcje nekromanty
- Klikniecie na mapie: natychmiastowe zabojstwo populacji i spadek stabilnosci pola.
- Shift + D: tworzy Zrodlo Smierci, ktore przez kilka tur obniza stabilnosc sasiadow i zabija czesc populacji.

## Sterowanie
- Klik (mapa): zabojstwo / zaklocenie
- WASD: ruch postaci w lokalnym widoku
- Shift + D: Zrodlo Smierci
- F: fullscreen
- Space: pauza / wznowienie
- Przyciski I/II/V/X lub klawisze 1-4: szybkosci tur (1, 2, 5, 10 TPS)
- Suwak TPS: plynna zmiana szybkosci (1-20 TPS)

## Interfejs
- Mapa swiata pokazuje aktualne typy terenu oraz stabilnosc (jasnosc/nasycenie).
- Widok lokalny generuje szczegolowy wycinek otoczenia na podstawie typu pola.
- Najechanie na wioske/miasto pokazuje nazwe i podswietla cala aglomeracje.

## Uruchomienie
Opcja 1: otworz `index.html` w przegladarce.

Opcja 2: uruchom lokalny serwer statyczny (przyklad):
```bash
python -m http.server 8080
```
Nastepnie otworz `http://localhost:8080`.

## Konfiguracja
Najwazniejsze parametry gry znajduja sie w obiekcie `CONFIG` w `script.js`, m.in.:
- rozmiar siatki, predkosc ruchu, TPS
- wspolczynniki dyfuzji, konsumpcji, ekspansji i regresji
- progowe wartosci stabilnosci

Typy terenu i ich bazowe parametry mozna modyfikowac w `CELL_TYPES` w `script.js`.

## Ograniczenia i stan funkcji
- Mechanika represji/"smierci" nekromanty jest przygotowana w konfiguracji, ale aktualnie wylaczona w kodzie (funkcja `checkRepression()` jest pusta).
- Widok lokalny jest wizualizacja, nie wplywa bezposrednio na symulacje.

## Struktura projektu
- `index.html` - layout i UI
- `style.css` - stylizacja
- `script.js` - cala logika symulacji i renderowania
- `Mechanika_Gry.md` oraz `Design/` - dokumentacja i zalozenia projektowe

## Licencja
Brak zdefiniowanej licencji. Jesli chcesz otworzyc projekt, dodaj odpowiedni plik LICENSE.

## Credits
Fonty z Google Fonts: Cinzel, Cinzel Decorative, Cormorant Garamond, Outfit.
