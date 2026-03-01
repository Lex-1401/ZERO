import sharp from "sharp";

async function optimizeFavicon() {
  const inputPath = "/Users/lex/Downloads/Arquivos/ZERO/ui/public/zerologo_without_background.png";
  const outputPath = "/Users/lex/Downloads/Arquivos/ZERO/ui/public/favicon.png";

  try {
    // Trim transparency first
    const trimmed = await sharp(inputPath).trim().toBuffer();

    // Resize to a perfect square 128x128, ensuring it fills as much as possible
    await sharp(trimmed)
      .resize(128, 128, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toFile(outputPath);

    console.log("Favicon optimized and squared successfully!");
  } catch (error) {
    console.error("Error optimizing favicon:", error);
  }
}

optimizeFavicon();
