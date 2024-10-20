import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs'; // Import the filesystem module

// Function to scrape individual page links from the #post div
const scrapePageLinks = async (page, url) => {
    // Navigate to the given URL
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Get the page content
    const content = await page.content();

    // Load the content into Cheerio for parsing
    const $ = cheerio.load(content);

    // Array to store the links
    const links = [];

    // Find the #post div and its <ul> elements
    $('#post ul').each((index, ul) => {
        // Iterate over each <li> inside the <ul>
        $(ul).find('li').each((liIndex, li) => {
            const linkElement = $(li).find('a');
            const link = linkElement.attr('href');
            const name = linkElement.text().trim();

            if (link && name) {
                links.push({ name, link });
            }
        });
    });

    return links;
};

const scraper = async () => {
    try {
        // Launch Puppeteer browser
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Load the existing JSON file with the initial scraped headings and links
        const jsonData = JSON.parse(fs.readFileSync('scrapedData.json', 'utf-8'));

        // Array to store results with further scraped links
        const resultsWithLinks = [];

        // Iterate over each heading from the initial JSON
        for (const item of jsonData) {
            console.log(`Scraping links from: ${item.link}`);
            // Scrape links from the individual page
            const pageLinks = await scrapePageLinks(page, item.link);

            // Store the heading along with the scraped page links
            resultsWithLinks.push({
                heading: item.title,
                link: item.link,
                pageLinks, // Store the links found in this page
            });
        }

        // Output the new results with all the scraped links
        console.log("Detailed Results with Links:", resultsWithLinks);

        // Save the new results to a JSON file
        fs.writeFileSync('detailedScrapedData.json', JSON.stringify(resultsWithLinks, null, 2), 'utf-8');
        console.log('Detailed data saved to detailedScrapedData.json');

        // Close the browser
        await browser.close();

    } catch (error) {
        console.error("An error occurred:", error);
    }
};

// Run the scraper
scraper();
