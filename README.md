# LIVECTRA · 老李

**Make inspiration editable.** A local-first image-to-SVG studio, designed and open sourced by 老李.

LIVECTRA converts PNG, JPG, WebP, GIF and BMP images into editable SVG paths in your browser. It offers three tracing presets, color/detail controls, path recoloring, path deletion, undo, preview, and SVG download. No account or upload server is involved.

## Try it

Visit **https://oldleeo.github.io/laoli-livectra/**, or run the site locally:

```bash
python -m http.server 8080
```

Open `http://localhost:8080`. No build step is required. All runtime files, including the tracing engine, are in this repository.

## How it works

1. The browser loads the selected image through the File API and draws it to a canvas.
2. [ImageTracerJS](https://github.com/jankovicsandras/imagetracerjs) quantizes the colors and traces the shapes into SVG paths.
3. LIVECTRA keeps only path geometry and drawing attributes in the final SVG. The resulting file does **not** contain an embedded raster image or font-dependent text.
4. Users can select paths, change fill colors, delete paths, undo changes, and export SVG. Illustrator can open the SVG and save it as `.ai`.

All conversion happens locally. There is no image generation model, hosted AI inference, or image upload. The visual design is inspired by contemporary creative software; the feature description deliberately reflects the actual implementation.

## Scope and limitations

Automatic tracing creates a useful vector **starting point**. It cannot infer the intended layers, editable wording, realistic gradients, or construction choices of a human illustrator for arbitrary images. The hand-redrawn keychain example that led to this project used image-specific paths and is not represented as a one-click result. SVG output dimensions are capped at 1400 pixels on the longest edge to keep browser processing practical. Animated GIFs are treated as a still frame.

## Privacy

The page makes no conversion API request. Files are read in the browser and are not sent to a server. Once the static website and its vendored script have loaded, conversion can run without a network connection while the page remains open.

## Credits and license

LIVECTRA source code and original site artwork: © 2026 老李 (Oldleeo), [MIT License](LICENSE).

The vendored `vendor/imagetracer.js` is ImageTracerJS 1.2.6 by András Jankovics, released under [The Unlicense](vendor/LICENSE-ImageTracer). The vendored library is not covered by the LIVECTRA MIT copyright claim.

Please provide images you have permission to process and publish. No user-provided image is included in this repository.

