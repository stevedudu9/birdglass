# Image and asset sources

## Hero photograph

The homepage hero, the closing banner and the assessment page header use `public/images/ara-damansara-township.jpg`. It shows shoplots with glass shopfronts in Ara Damansara, a Sime Darby Property township in Petaling Jaya.

- Source: "Ara Damansara 1.jpg" by Slleong, Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Ara_Damansara_1.jpg)
- Licence: CC0 1.0 (public domain dedication)
- Resized to 2400 × 1800 px, with photo metadata removed
- A credit line is shown on the homepage hero

The photo shows existing, untreated glass. It is not a picture of a BirdGlass treatment.

## Example window

`public/images/window-example.png` (1448 × 1086 px) is the example window used in the app, supplied by the team. The app labels it "Illustrated example" wherever it appears. Its physical size cannot be measured from the picture, so the built-in dimensions (120 × 150 cm) are demonstration values only.

Glass corners for the example, as pixel positions: TL (384, 201), TR (1191, 203), BR (1193, 810), BL (385, 811). They mark the exposed glass inside the black frame and can be edited in the app.

The example appears in the process cards, the before/after slider, the dashboard, the assessment photo area, window thumbnails, image downloads and treatment summaries. Saved projects that still use the older built-in example are upgraded when the page loads; their names, dimensions, layouts and plan entries are kept.

## Material previews

The film-sheet previews in the material section are HTML/CSS drawings placed over the example window. They are labelled "Material concept" and are not supplier product photos.

## Icons, logo and fonts

- The bird logo, interface icons and foliage are inline SVG drawings in `src/site/Icon.tsx`. The favicon is `public/birdglass.svg`.
- Dot patterns on photos are drawn by the app's own pattern and perspective code.
- The Manrope font is served locally from `public/fonts/Manrope.ttf`, with its licence in `OFL.txt`. No external font service is needed.
