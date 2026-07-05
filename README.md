# Figure Distances

An [Owlbear Rodeo](https://www.owlbear.rodeo/) extension that instantly shows the distance from a selected character token to every other visible character on the map — sorted nearest to farthest, using your scene's current grid settings.

## Install

In Owlbear Rodeo, open the extensions menu and add this manifest URL:

```
https://anthonyhauck.github.io/figure-distances/manifest.json
```

## How to Use

1. Select the **Measure Distances** tool from the toolbar (shortcut: **M**).
2. Click any character token on the map.
3. The panel opens showing distances to all other visible character tokens.

Distances update live as tokens move, and tokens hidden by fog of war are automatically excluded.

## Features

- Respects your grid type (square, hex) and scale settings.
- Distances display in your scene's configured unit (ft, m, etc.).
- Supports square-grid measurement rules: Chebyshev, Alternating (D&D 3.5e diagonals), Manhattan, and Euclidean.
- Excludes tokens hidden in fog of war.
- Sorted nearest to farthest for quick reference.
- Adapts to Owlbear Rodeo's light and dark themes.

## Development

Built with React, TypeScript, and Vite.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```

Pushes to `main` deploy automatically to GitHub Pages via the workflow in `.github/workflows/deploy.yml`.

## Support

For bug reports or feature requests, please [open an issue](https://github.com/anthonyhauck/figure-distances/issues).
