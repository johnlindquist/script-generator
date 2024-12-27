## 1. **Foundational**

### 1.1 **Color Palette**

While most of the project relies heavily on [Tailwind’s default color palette](https://tailwindcss.com/docs/customizing-colors) (gray, slate, amber, cyan, pink, etc.), you also have specific usage patterns worth calling out:

<details>
<summary><strong>Commonly Used Tailwind Colors</strong></summary>

- **Gray/Slate Scale**  
  - `gray-700, gray-800, gray-900, gray-950` used for backgrounds, borders, and text in dark mode.  
  - `slate-100, slate-200, slate-300, slate-400, slate-500` used for text, placeholders, and utility classes in forms (light mode).
- **Amber/Yellow**  
  - `amber-300, amber-400, amber-500` used for highlights, buttons, CTAs, transitional states on hovers, etc.
- **Cyan/Teal**  
  - `cyan-300, cyan-400, cyan-500, teal-200, teal-400` often used for solution badges, check icons, or completion highlights.
- **Sky/Indigo**  
  - `sky-200, sky-300, sky-400, sky-500` used in badges, overlays, or accent text.
  - `indigo-300, indigo-500` sometimes used in backgrounds for special sections.
- **Black/White**  
  - `bg-black, text-white` frequently used in dark mode, overlay wrappers, etc.
- **Opacity**  
  - Many classes combine a color with `opacity-10, opacity-20, ..., opacity-80`, e.g. `bg-black/40`, `bg-gray-800/50`.
</details>

<details>
<summary><strong>Custom / Extended Colors & Utilities</strong></summary>

- **Gradients**:  
  Used frequently in buttons, e.g. `bg-gradient-to-tr from-amber-300 to-amber-400`, `bg-gradient-to-r from-cyan-300 to-transparent`, etc.  

- **Backdrop Filters**:  
  `.bg-blur` uses `backdrop-filter: blur(12px)`.
  
- **DocSearch**:  
  Custom properties are set (e.g., `--docsearch-primary-color: red; --docsearch-muted-color: theme('colors.slate.500');`), but these are mostly overrides for the DocSearch plugin styling.

- **Animations**:  
  - A `.blink` keyframes used by `.animate-blink` for a blinking effect.
</details>

In general, these are combined within standard Tailwind classes. The main thing to note is the frequent combination of **dark backgrounds** with **amber/cyan accent colors**.

### 1.2 **Typography & Fonts**

Your project uses a few font families: **Articulat** (custom), **Inter** and **Lexend** (variable fonts). Make sure your sister site either has access to these font files or uses a fallback.

- **Articulat**: Imported from local `.woff` / `.woff2` files, declared at different weights (300–800).  
- **Inter**: Loaded as a variable font (`Inter-roman.var.woff2` and `Inter-italic.var.woff2`) with weights 100–900, `font-display: block`.  
- **Lexend**: Single `.woff2` file with weight range 100–900, `font-display: swap`.

Typical usage in your CSS:

```css
@font-face {
  font-family: 'Articulat';
  font-weight: 300; /* etc. */
  font-style: normal;
  src: url('./filename.woff2') format('woff2'), ...
}
/* ... similarly for other weights and styles ... */

@font-face {
  font-family: 'Lexend';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/lexend.woff2') format('woff2');
}
```

Then, in Tailwind or general CSS:

```css
body {
  font-family: 'Inter', sans-serif; /* or 'Articulat', or 'Lexend' depending on usage */
}
```

### 1.3 **Dark Mode**

By default, you appear to use `dark:` classes from Tailwind. You also set:
```css
:root {
  color-scheme: dark;
}
```
This effectively forces a dark theme baseline. So you rely on `dark:` variants to invert certain `.prose` elements, placeholders, backgrounds, etc.

---

## 2. **Layout & Utility Patterns**

### 2.1 **Masonry Utilities**

In `globals.css`, you define a custom utility layer for “masonry” layouts:

```css
@layer utilities {
  .masonry-3 {
    column-count: 3;
  }
  .masonry-2 {
    column-count: 2;
  }
  .masonry-1 {
    column-count: 1;
  }
  .break-inside {
    break-inside: avoid;
  }
}
```
Use these to quickly create multi-column masonry grids.

### 2.2 **Form & Button Styles**

You have a consistent pattern of:

- **Rounded** corners: `rounded-md, rounded-full`  
- **Gradients**: `bg-gradient-to-tr from-amber-300 to-amber-400` or `bg-gradient-to-b from-yellow-300 to-yellow-500` for CTA buttons.  
- **Shadow**: `shadow-2xl`, often combined with `transition hover:brightness-110`.

Example from `subscribe-form.css`:

```css
[data-sr-button] {
  @apply relative flex items-center justify-center rounded-md 
         bg-gradient-to-tr from-amber-300 to-amber-400
         px-8 py-5 text-xl font-semibold text-white 
         shadow-2xl transition focus-visible:ring-white 
         hover:brightness-110;
}
```

### 2.3 **Simple Bar (Scrollbars)**

You import `simplebar-react/dist/simplebar.min.css` and then override:

```css
.simplebar-scrollbar:before {
  @apply bg-gray-700;
  position: absolute;
  content: '';
  border-radius: 7px;
  left: 2px;
  right: 2px;
  opacity: 0;
  transition: opacity 0.2s 0.5s linear;
}
```
Which is how you style the custom scrollbar in dark backgrounds.

### 2.4 **Focus & Visibility**

You’re using the `focus-visible` polyfill approach:

```css
.js-focus-visible :focus:not(.focus-visible) {
  outline: none;
}
```
This ensures outlines only show on keyboard navigation, not mouse clicks (accessibility best practice).

---

## 3. **Common Components**

### 3.1 **Video Overlays**

Under `[data-video-overlay-wrapper]` and `[data-video-overlay="..."]`, you have multiple states like “default,” “blocked,” “loading,” “finished.” Each has its own layout with a background overlay, center alignment, and CTA sections.  

**Highlights:**
- Overlays often use `bg-[#070B16]` (very dark navy) or `bg-black` with opacity for backgrounds.  
- The “blocked” state includes a large subscription form or buy interface.  
- The “finished” overlay includes share buttons, replay, continue, etc.

If your sister site also has video content, you could replicate these states or keep them for consistency.

### 3.2 **Lesson Navigation / Module Navigator**

`[data-module-navigator]` defines a left panel with collapsible sections for lessons. Major points:
- Collapsible sections: `data-accordion-*` indicates usage of an accordion library or pattern.  
- Active lesson uses `bg-gradient-to-r from-cyan-300/5 to-transparent` or `text-yellow-300`.  
- Completed lessons dim to `opacity-80`.  

### 3.3 **Lesson Description & Title**

- `h1[data-lesson-title]` is typically `text-3xl font-bold sm:text-4xl`.  
- Badges (`[data-lesson-badge]`) get color-coded backgrounds, e.g. `solution = bg-cyan-500/20 text-cyan-300`.

---

## 4. **Typography Patterns (Prose)**

You have `.prose` with extended styling (especially in `[data-video-transcript]`, `.discussion`, `.docs`, etc.):

- **Heading hierarchy**:  
  - `h1`: `text-3xl font-bold mb-4`  
  - `h2`: `text-3xl font-bold my-8`  
  - `h3`: `text-2xl font-bold my-8`  
- **Paragraphs**: `leading-relaxed`, spacing classes.  
- **Links**: Typically `text-yellow-300 hover:underline` in light mode, can be `text-cyan-300` or `hover:brightness-110` in certain contexts.  
- **Blockquote**: `border-l-4 p-3 italic text-sm rounded-sm m-10 border-yellow-400 text-gray-300`
- **Inline code**: `.inline-code` => `@apply font-mono bg-white bg-opacity-10 px-1 py-0.5 rounded-sm text-yellow-300;`

---

## 5. **DocSearch & Prism**

- **DocSearch**: Uses custom properties for theming (e.g., `--docsearch-primary-color`, `--docsearch-muted-color`). Typically overrides default docsearch styles with your dark theme in mind.
- **Prism**: Syntax highlighting uses Tailwind colors for tokens:
  - `.token.selector, .token.class-name, .token.function`: `theme('colors.pink.400')`
  - `.token.attr-name, .token.keyword`: `theme('colors.slate.300')`
  - `.token.attr-value, .token.string`: `theme('colors.sky.300')`
  - `.token.comment`: `theme('colors.slate.400')`
  
This is where your code blocks get the bright highlight in pink, sky, slate, etc.

---

## 6. **Key Takeaways

1. **Keep the Dark Theme**: A large portion of the site is designed with dark backgrounds (`bg-gray-900`, etc.) and bright accent text (`text-amber-300` or `text-cyan-300`).  
2. **Accent Colors**: Amber and cyan are your big highlight colors. Pink and sky are secondary for syntax or badges.  
3. **Font Families**: Use “Inter” or “Articulat” for body text, possibly “Lexend” for headings if you want synergy.  
4. **Buttons & CTAs**: Usually large, round-cornered, and gradient-based with a “pop” hover state.  
5. **Prose**: Keep the same spacing and heading scales if you want to maintain brand consistency.  
6. **Utility Classes**: Lean on Tailwind plus your custom `.masonry-*` and `focus-visible` setup.  