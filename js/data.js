// Everything shown on the site is listed here.
// To add a piece: put the file in /media, then add a line to the right wall.
// w and h are the file's size in pixels.

const icon = (file, title) => ({
  title,
  kind: 'Character icon',
  src: `media/icons/${file}.png`,
  w: 382,
  h: 400,
});

const cutscene = (file, title, kind) => ({
  title,
  kind,
  video: `media/cutscenes/${file}.mp4`,
  preview: `media/cutscenes/${file}-preview.mp4`,
  src: `media/cutscenes/${file}.jpg`,
  w: 1920,
  h: 1080,
});

const art = (file, title, kind, w, h, cutout = false) => ({
  title,
  kind,
  src: `media/art/${file}.png`,
  w,
  h,
  cutout, // true when the image has a transparent background
});

export const walls = [
  {
    key: 'hero',
    items: [art('versus-screen', 'Versus screen', 'Jeff the Chiller against Slendermann', 1252, 680, true)],
  },
  {
    key: 'characters',
    // How many pieces sit in each row, on wide and on narrow screens.
    rows: { wide: [6, 6], narrow: [3, 3, 3, 3] },
    items: [
      icon('c00lkidds', 'C00lkidds'),
      icon('jeff-the-chiller', 'Jeff the Chiller'),
      icon('slendermann', 'Slendermann'),
      icon('chuckles', 'Chuckles'),
      icon('makawai', 'Makawai'),
      icon('evil-greenie', 'Evil Greenie'),
      icon('koolest-killer', 'Koolest Killer'),
      icon('helperbot', 'Helperbot'),
      icon('nolee', 'Nolee'),
      icon('rust', 'Rust'),
      icon('vendor', 'Vendor'),
      icon('despacito', 'Despacito'),
    ],
  },
  {
    key: 'cutscenes',
    rows: { wide: [2, 2], narrow: [1, 1, 1, 1] },
    items: [
      cutscene('slendermann-intro', 'Slendermann intro', 'Intro cutscene, 7 seconds'),
      cutscene('spider-intro', 'Spider intro', 'Intro cutscene, 11 seconds'),
      cutscene('evil-greenie-intro', 'Evil Greenie intro', 'Intro cutscene, 10 seconds'),
      cutscene('slendermann-kill', 'Slendermann kill', 'Kill cutscene, 3 seconds'),
    ],
  },
  {
    key: 'art',
    rows: { wide: [3, 5, 4], narrow: [2, 3, 3, 4] },
    items: [
      art('tunnel', 'Cool Dr. tunnel', 'Scene art', 1536, 960, true),
      art('emergency-alert', 'Emergency alert', 'Alert screen', 853, 480),
      { ...art('last-good-guy-jeff', 'Last good guy standing: Jeff', 'Banner', 1009, 625, true), label: 'Jeff banner' },
      art('poster-do-not-listen', 'Do not listen to her!', 'Poster', 361, 531),
      art('poster-join-the-fight', 'Join the fight!', 'Poster', 361, 531),
      art('slendermann-note', 'Slendermann’s note', 'Prop', 361, 531),
      { ...art('last-good-guy-makawai', 'Last good guy standing: Makawai', 'Banner', 1009, 625, true), label: 'Makawai banner' },
      { ...art('last-good-guy-helperbot', 'Last good guy standing: Helperbot', 'Banner', 1009, 625, true), label: 'Helperbot banner' },
      art('c00l-angel', 'C00l angel', 'Sprite', 151, 225, true),
      { ...art('last-good-guy-vendor', 'Last good guy standing: Vendor', 'Banner', 1009, 625, true), label: 'Vendor banner' },
      { ...art('last-good-guy-carl', 'Last good guy standing: Carl', 'Banner', 1009, 625, true), label: 'Carl banner' },
      art('c00l-devil', 'C00l devil', 'Sprite', 152, 214, true),
    ],
  },
];

// The pieces of the versus screen. z is how far each one floats off the back of its box.
export const heroLayers = [
  { src: 'media/hero/jeff.png', w: 484, h: 680, x: -384, y: 0, z: 0.5 },
  { src: 'media/hero/slendermann.png', w: 602, h: 680, x: 325, y: 0, z: 0.5 },
  { src: 'media/hero/vs.png', w: 362, h: 318, x: -30, y: -20, z: 1.7 },
];

// Colours of the room at each stop: background, and the two floor tones.
export const moods = [
  { bg: '#3a9c5c', a: '#5cc280', b: '#3a9c5c' }, // start
  { bg: '#17141f', a: '#2b2639', b: '#1d1928' }, // characters
  { bg: '#a51733', a: '#dc1f45', b: '#a51733' }, // cutscenes
  { bg: '#f3e36a', a: '#fff590', b: '#f3e36a' }, // game art
  { bg: '#3a9c5c', a: '#5cc280', b: '#3a9c5c' }, // end
];
