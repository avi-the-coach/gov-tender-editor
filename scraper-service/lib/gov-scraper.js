/**
 * gov-scraper.js
 * -----------------------------------------------
 * Modular scraper for mr.gov.il procurement portal.
 * Can be extracted and used independently of Express.
 * -----------------------------------------------
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');

const BASE_URL = 'https://mr.gov.il/ilgstorefront/he';
const SITE_ROOT = 'https://mr.gov.il';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

// Session cache — mr.gov.il requires JSESSIONID to serve tender detail pages.
// We initialize once by hitting the homepage, then reuse the cookies.
let _sessionCookies = null;

async function getSessionCookies() {
  if (_sessionCookies) return _sessionCookies;
  const res = await fetch(`${SITE_ROOT}/ilgstorefront/he/`, {
    headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html', 'Accept-Language': 'he-IL,he;q=0.9' },
    timeout: 10000,
  });
  const rawCookies = res.headers.raw()['set-cookie'] || [];
  _sessionCookies = rawCookies.map(c => c.split(';')[0]).join('; ');
  return _sessionCookies;
}

/**
 * Search for tenders by topic.
 * @param {string} topic - Hebrew search term
 * @param {number} limit - Max results to return
 * @returns {Promise<Array>} Array of tender objects
 */
async function searchTenders(topic, limit = 10) {
  const encoded = encodeURIComponent(topic);
  // s=TENDER filters only tender type (מכרזים), not all document types.
  // text= is the correct search param when combined with s= category filter.
  // Using ?q= alone returns mixed/unrelated results.
  const url = `${BASE_URL}/search/?s=TENDER&text=${encoded}&pageSize=${limit}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GovTenderBot/1.0)', 'Accept-Language': 'he-IL,he;q=0.9' },
    timeout: 15000,
  });

  if (!res.ok) throw new Error(`mr.gov.il returned ${res.status}`);
  const html = await res.text();
  return parseTenderList(html, limit);
}

/**
 * Parse tender list from search results HTML.
 */
function parseTenderList(html, limit) {
  const $ = cheerio.load(html);
  const tenders = [];

  // Try multiple selectors for resilience
  const selectors = [
    '.product-listing .product--summary',
    '.search-result-items .item',
    '.procurement-item',
    'article.product',
  ];

  let found = false;
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      $(sel).each((i, el) => {
        if (i >= limit) return false;
        const title = $(el).find('h2, h3, .name, .title').first().text().trim();
        const href = $(el).find('a').first().attr('href') || '';
        const ministry = $(el).find('.ministry, .publisher, .organization').first().text().trim();
        const date = $(el).find('.date, time').first().text().trim();
        const id = href.match(/\/p\/(\d+)/)?.[1] || String(i);

        if (title) {
          tenders.push({
            id,
            title,
            ministry: ministry || 'לא צוין',
            date: date || '',
            url: href.startsWith('http') ? href : `${SITE_ROOT}${href}`,
          });
        }
      });
      found = true;
      break;
    }
  }

  // Fallback: generic link extraction
  if (!found) {
    $('a[href*="/p/"]').each((i, el) => {
      if (i >= limit) return false;
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim();
      const id = href.match(/\/p\/(\d+)/)?.[1] || String(i);
      if (title && title.length > 5) {
        tenders.push({
          id,
          title,
          ministry: 'לא צוין',
          date: '',
          url: href.startsWith('http') ? href : `${SITE_ROOT}${href}`,
        });
      }
    });
  }

  return tenders.slice(0, limit);
}

/**
 * Get tender detail page and extract PDF links.
 * @param {string} tenderId
 * @returns {Promise<{title, pdfUrls, ministry, date}>}
 */
async function getTenderDetails(tenderId) {
  const url = `${BASE_URL}/p/${tenderId}`;
  const cookies = await getSessionCookies();
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept': 'text/html',
      'Accept-Language': 'he-IL,he;q=0.9',
      'Cookie': cookies,
      'Referer': `${BASE_URL}/`,
    },
    timeout: 15000,
  });
  if (!res.ok) throw new Error(`Tender ${tenderId} not found (${res.status})`);
  const html = await res.text();
  return parseTenderDetails(html, url);
}

function parseTenderDetails(html, pageUrl) {
  const $ = cheerio.load(html);

  // Title
  const title = $('h1, .product-name, .tender-title').first().text().trim();

  // Publisher — appears as the 3rd h2 in the bids-body section (after labels)
  const publisherEl = $('.bids-body h2').filter((i, el) => {
    const t = $(el).text().trim();
    return t.length > 5 && !t.includes('מס') && !t.includes('סטטוס') && !t.includes('תאריך') && !t.includes('מועד');
  }).first();
  const publisher = publisherEl.text().trim();

  const date = $('.date, time').first().text().trim();

  // Subjects/Topics — in [class*="subjects"] container, link or tag elements
  const subjects = [];
  $('[class*="subjects"] a, [class*="subjects"] .tag, [class*="subject-tag"], [class*="noshei"] a').each((i, el) => {
    const t = $(el).text().trim();
    if (t && t !== 'נושאים' && t.length > 1) subjects.push(t);
  });
  // Fallback: try text of the container, split by comma
  if (subjects.length === 0) {
    const subjectsText = $('[class*="subjects"]').last().text().replace('נושאים', '').trim();
    if (subjectsText.length > 2) {
      subjectsText.split(/[,،;]/).forEach(s => {
        const t = s.trim();
        if (t.length > 1) subjects.push(t);
      });
    }
  }

  // Documents — /attachment/{GUID}/{name} format (no .pdf extension on this site)
  const SKIP_TYPES = ['מודעה לעיתונות', 'מענה לשאלות', 'נוסח פרסום'];
  const PRIORITY_TYPES = ['חוברת המכרז', 'מסמכי הצעה', 'הסכם התקשרות', 'דרישות'];

  const allDocs = [];
  $('a[href*="/attachment/"]').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (!href) return;
    const segments = decodeURIComponent(href).split('/');
    const docName = segments[segments.length - 1] || '';
    const fullUrl = href.startsWith('http') ? href : new URL(href, pageUrl).href;

    if (allDocs.find(d => d.url === fullUrl)) return;
    if (SKIP_TYPES.some(t => docName.includes(t))) return;

    const priority = PRIORITY_TYPES.findIndex(t => docName.includes(t));
    allDocs.push({ url: fullUrl, name: docName, priority: priority === -1 ? 99 : priority });
  });

  allDocs.sort((a, b) => a.priority - b.priority);

  return {
    title,
    publisher,
    ministry: publisher, // backward compat
    date,
    subjects,
    docInfos: allDocs.map(d => ({ name: d.name, url: d.url })),
    pdfUrls: allDocs.map(d => d.url), // backward compat for insights route
    pageUrl,
  };
}

module.exports = { searchTenders, getTenderDetails };
