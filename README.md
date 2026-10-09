# portfolio

My game art portfolio: a 3D room built with Three.js. Scrolling turns the camera from wall to wall, and selecting a piece opens it full size.

Live at https://trustiestegg.github.io/portfolio/

## What's on each wall

1. The versus screen, taken apart into layers
2. Character icons
3. Cutscenes (silent previews on the wall, full clips with sound when opened)
4. Banners, posters and scene art

## Files

- `index.html`: the headings and text. Spots to change are marked with `EDIT:` comments.
- `styles.css`: colours and fonts are set at the top of the file.
- `js/data.js`: the list of every piece on every wall, plus the wall colours.
- `js/main.js`: the 3D room.
- `js/vendor/`: Three.js r170 (MIT licence, see `THREE-LICENSE.txt`).
- `media/`: the images and videos.

## Adding a piece

1. Put the file in the matching folder inside `media/`.
2. Add a line for it to the right wall in `js/data.js`, with its width and height in pixels.
3. Update that wall's `rows` so the counts add up to the number of pieces.

A cutscene needs three files with the same name: the full clip (`name.mp4`), a small silent preview (`name-preview.mp4`) and a still (`name.jpg`).

## Previewing changes

The page loads its scripts as modules, so opening `index.html` straight from the folder won't work. Run a small local server from this folder and open the address it prints:

```
python -m http.server
```

## Publishing

Push to `main`. GitHub Pages redeploys the site in about a minute.
