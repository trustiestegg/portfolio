# portfolio

My portfolio site. Plain HTML and CSS, no build step.

## Files

- `index.html`: all the content. Every spot to change is marked with an `EDIT:` comment.
- `styles.css`: colors and fonts are set at the top of the file.
- `images/`: project images and the favicon. The three `project-*.svg` files are placeholders.

## Editing

1. Open `index.html` and search for `EDIT:`. Replace the placeholder text under each one.
2. Put your own images in `images/` and point each project's `src` at them. A 4:3 image at least 960px wide looks best.
3. To add a project, copy one whole `<li class="project">` block. To remove one, delete it.

Open `index.html` in a browser to preview your changes.

## Publishing with GitHub Pages

1. Push this folder to the `main` branch.
2. On GitHub, open the repo's **Settings**, then **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.

The site goes live at https://trustiestegg.github.io/portfolio/ a minute or two later.
