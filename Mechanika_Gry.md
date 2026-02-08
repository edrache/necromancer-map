# Mechanika Gry: Necromancer Island

## 1. Cel Gry
W *Necromancer Island* wcielasz się w rolę nekromanty, którego celem jest zaburzanie naturalnej równowagi świata. Gra nie posiada klasycznego warunku zwycięstwa. Porażka następuje w momencie utraty wpływu systemowego na świat – gdy Twoje działania przestają wywoływać istotne zmiany w regionach.

## 2. Świat Gry
Świat jest reprezentowany przez siatkę 2D (20x20 pól). Każde pole posiada określony typ i właściwości.

### 2.1 Typy Terenu
- **Równina (Plain) ⬜**: Neutralny teren, na który mogą rozprzestrzeniać się inne typy.
- **Las (Forest) 🌲**: Produkuje zasoby (Sustain).
- **Woda (Water) 🌊**: Produkuje zasoby (Sustain).
- **Wioska (Village) 🏡**: Konsumuje zasoby, posiada populację.
- **Miasto (City) 🏙️**: Konsumuje dużą ilość zasobów, posiada dużą populację.
- **Góry (Mountain) ⛰️**: Nieprzebyta bariera, blokuje przepływ zasobów i połączenia regionów.

## 3. System Ekosystemu (Lokalna Równowaga)

### 3.1 Zasoby (Sustain)
Zasoby reprezentują pożywienie i wodę niezbędne do przetrwania populacji.
- **Produkcja**: Lasy i Woda generują punkty zasobów w każdej turze.
- **Dyfuzja**: Zasoby płyną między sąsiednimi polami (z wyjątkiem Gór), dążąc do wyrównania poziomu.
- **Konsumpcja**: Osady (Wioski/Miasta) zużywają zasoby proporcjonalnie do swojej populacji.

### 3.2 Stabilność i Populacja
- **Stabilność**: Odzwierciedla kondycję danego pola. Wysoka stabilność sprzyja rozwojowi, niska prowadzi do rozpadu. Wizualnie objawia się nasyceniem kolorów i przejrzystością emoji.
- **Ludność**: Tylko Wioski i Miasta posiadają populację. Gdy brakuje zasobów, populacja zaczyna wymierać, co generuje "Nasilenie Śmierci".

### 3.3 Regiony
Świat dzieli się na regiony – grupy połączonych pól (Woda i Góry stanowią granice). Każdy region dąży do równowagi:
- Jeśli produkcja zasobów ≥ zapotrzebowanie -> region stabilizuje się.
- Jeśli produkcja < zapotrzebowanie -> region wchodzi w fazę regresji (spadek populacji i stabilności).

## 4. Akcje Gracza (Nekromanty)

Jako nekromanta wprowadzasz lokalne zaburzenia, które niszczą równowagę:

1.  **Zabójstwo (Kliknięcie myszą)**: Bezpośrednia eksterminacja populacji na wybranym polu i gwałtowny spadek stabilności. Jeśli pole było osadą, zamienia się w ruiny (Równinę).
2.  **Źródło Śmierci (Klawisz 'D')**: Tworzy tymczasowy obiekt (Czaszkę), który przez kilka tur wysysa stabilność z sąsiednich pól i powoduje pasywne zgony mieszkańców.

## 5. Konsekwencje i Śmierć Nekromanty

### 5.1 Nasilenie Śmierci (Death Severity)
Każda śmierć (spowodowana przez gracza lub głód) zwiększa globalne "Nasilenie Śmierci". Jest to miara Twojej ingerencji w świat.

### 5.2 Represja i Odrodzenie
Jeśli Nasilenie Śmierci przekroczy krytyczny próg, świat "odpowiada" – nekromanta zostaje tymczasowo wyeliminowany (ginie).
- **Przeskok Czasu**: Podczas Twojej nieobecności symulacja przyspiesza. Regiony próbują się zrebalansować bez Twojej ingerencji. Niektóre mogą rozkwitnąć, inne pogrążyć się w totalnym chaosie.
- **Powrót**: Po określonej liczbie tur odradzasz się w zmienionym świecie, musząc na nowo budować swoją dominację.

## 6. Rozwój i Regresja
- **Ekspansja**: Jeśli pole ma wysoką stabilność (>80%) i nadmiar zasobów, może "zająć" sąsiednią Równinę:
    - **Lasy**: Rozrastają się tylko w odległości do 3 pól od Wody.
    - **Miasta**: Rozrastają się tylko w odległości do 3 pól od Lasów lub Wody.
    - **Woda**: Nigdy się nie rozrasta.
- **Regresja**:
    - Brak zasobów lub niska stabilność prowadzą do wymierania osad.
    - **Lasy i Miasta** o bardzo niskiej stabilności (<30%) mają szansę na regresję – powrót do formy Równiny.

## 7. Informacje Wizualne
Gra nie używa liczb w interfejsie. Wszystkie informacje czerpiesz z obserwacji:d
- **Przejrzystość/Jasność**: Wysoka stabilność.
- **Szarość/Zanikanie**: Upadek, niska stabilność.
- **Gęstość elementów**: Wielkość populacji i intensywność życia.
