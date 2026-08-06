# Bilder für „Gesichter unserer Stadt"

Die Seite `gesichter-der-stadt.html` erwartet die Fotos unter diesen Namen.
Solange eine Datei fehlt, zeigt die Fläche automatisch einen warmen Farbverlauf –
es entsteht kein kaputtes Bild.

| Datei | Wo | Motiv aus den Posts |
|---|---|---|
| `gesichter-hero.jpg` | Hero, ganz oben | Stimmungsbild Rottweil / Menschen |
| `rottweil-hauptstrasse.jpg` | Ende „Standpunkt" | Hauptstraße mit historischen Fassaden |
| `wochenmarkt.jpg` | „Einkaufen mit Haltung" | Marktstand mit Gemüse |
| `kulinarik.jpg` | „Kulinarik in Rottweil" | Kellner mit Aperitif-Gläsern |

Empfohlen: Querformat, mindestens 1600 px breit, JPG.

## Logos der Betriebe

Logos als PNG mit transparentem Hintergrund ablegen (z. B. `beach0741.png`,
`borrelli.png`). In der Karte den Platzhalter ersetzen:

```html
<div class="card__logo">
  <img src="img/beach0741.png" alt="beach0741" />
</div>
```

## Anderer Bildpfad?

Der Pfad steckt jeweils in `gesichter.css` in der Variable `--img`, z. B.

```css
.hero__media{ --img:url("img/gesichter-hero.jpg"); }
```
