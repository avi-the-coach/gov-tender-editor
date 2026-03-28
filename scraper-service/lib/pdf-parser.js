/**
 * pdf-parser.js
 * -----------------------------------------------
 * In-memory PDF text extraction using pdfjs-dist.
 * No files are written to disk.
 * -----------------------------------------------
 */

const fetch = require('node-fetch');

/**
 * Download a PDF and extract its text — entirely in memory.
 * @param {string} url - PDF URL
 * @returns {Promise<string>} Extracted text
 */
async function extractPdfText(url) {
  // Download PDF as ArrayBuffer
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL' },
    timeout: 20000,
  });
  if (!res.ok) throw new Error(`PDF fetch failed: ${res.status} for ${url}`);
  const buffer = await res.buffer();

  // Use pdfjs-dist (Node-compatible legacy build)
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = false; // No worker in Node.js

  const uint8 = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8 });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 20); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

/**
 * Extract text from multiple PDFs, return array of texts.
 * Silently skips failed PDFs.
 */
async function extractMultiplePdfs(urls, maxPdfs = 5) {
  const results = [];
  for (const url of urls.slice(0, maxPdfs)) {
    try {
      const text = await extractPdfText(url);
      if (text.length > 100) results.push(text);
    } catch (err) {
      console.warn(`[pdf-parser] Skipped ${url}: ${err.message}`);
    }
  }
  return results;
}

module.exports = { extractPdfText, extractMultiplePdfs };
