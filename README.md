<div align="center">
  <h1>quickOCR</h1>
  <p><b>Fast & Private In-Browser Text Extraction</b></p>
  <p>
    <a href="https://forhadkhan.github.io/quick-ocr/"><b>🔴 Live - Try Now</b></a>
  </p>
</div>

<br />

**quickOCR** is a high-performance, client-side Optical Character Recognition (OCR) web application. Designed for speed, privacy, and ease of use, it processes images entirely locally within the browser without relying on external servers or transmitting sensitive documents over the network.

## Features

- **Local Neural Engine**: Utilizes Tesseract.js to run OCR locally in the browser via WebAssembly.
- **Privacy-First**: No images or extracted texts are sent to the cloud. All operations are strictly self-contained.
- **Clipboard Integration**: Paste images directly from the clipboard to initiate extraction automatically.
- **Scan History**: Maintains a persistent history of previous scans for quick retrieval and reference.
- **Interactive Lightbox**: Inspect uploaded images directly within the application with full zoom and pan capabilities.
- **In-App Text Editing**: Modify and refine extracted text directly before copying to the clipboard.
- **Responsive Architecture**: Fluid interface ensuring seamless operation across mobile, tablet, and desktop viewports.

## How to Download Code

If you are using Google AI Studio Build, you can download the complete source code by clicking the **Settings (Gear Icon)** in the top right menu, then selecting **Export to ZIP** or **Export to GitHub**.

## Prerequisites

- Node.js (v18 or higher recommended)
- [pnpm](https://pnpm.io/) (Fast, disk space efficient package manager)

## Development Setup

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm run dev
   ```
4. Open your browser and navigate to the local server URL provided in the terminal output.

## Building for Production

To create an optimized production build:

```bash
pnpm run build
```

This command generates production-ready static assets in the `dist` directory.

## Hosting on GitHub Pages

This app is pre-configured to automatically deploy to GitHub pages using GitHub actions! 

1. Push your code to the `main` branch of your GitHub repository.
2. Go to your repository **Settings** > **Pages** on GitHub.
3. Under **Build and deployment**, ensure the **Source** is set to **GitHub Actions**.
4. The deployment will automatically run and publish your app to `https://<username>.github.io/<quick-ocr>/`.

## Technology Stack

- **React**: Core UI framework.
- **Vite**: Frontend tooling and bundler.
- **Tesseract.js**: Pure Javascript port of the Tesseract OCR engine.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Framer Motion**: Animation library.
- **Lucide React**: Vector SVG iconography.

## License

This project is open-source and available under the MIT License.
