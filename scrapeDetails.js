import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';

// Function to scrape details from a given detail page
const scrapeDetailsFromPage = async (page, url) => {
    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        const content = await page.content();
        const $ = cheerio.load(content);

        const title = $('h1').text().trim();
        $('script, ins').remove(); // Remove ads and script tags

        const postDate = $('td:contains("Post Date / Update:")').next('td').text().trim() || 'Not available';
        const shortInfo = $('td:contains("Short Information :")').next('td').text().trim() || 'Not available';

        // Extract important dates
        const importantDates = [];
        const importantDatesSection = $('td:contains("Important Dates")').next('td');

        importantDatesSection.find('ul li, p').each((i, el) => {
            importantDates.push($(el).text().trim());
        });

        // If important dates are empty, try to find them in other elements
        if (importantDates.length === 0) {
            importantDatesSection.find('p').each((i, el) => {
                importantDates.push($(el).text().trim());
            });
        }

        // Extract application fees
        const applicationFees = [];
        const applicationFeesSection = $('td:contains("Application Fee")').next('td');

        applicationFeesSection.find('ul li, p').each((i, el) => {
            applicationFees.push($(el).text().trim());
        });

        // If application fees are empty, try to find them in other elements
        if (applicationFees.length === 0) {
            applicationFeesSection.find('p').each((i, el) => {
                applicationFees.push($(el).text().trim());
            });
        }

        // Extract useful links
        const links = {};
        $('h2:contains("Some Useful Important Links")').next('table').find('a').each((i, el) => {
            const linkText = $(el).text().trim();
            const linkHref = $(el).attr('href');
            links[linkText] = linkHref;
        });

        // Log warnings if sections are empty
        if (importantDates.length === 0) {
            console.warn(`No important dates found for URL: ${url}`);
        }
        if (applicationFees.length === 0) {
            console.warn(`No application fees found for URL: ${url}`);
        }
        if (Object.keys(links).length === 0) {
            console.warn(`No useful links found for URL: ${url}`);
        }

        return {
            title,
            postDate,
            shortInfo,
            importantDates,
            applicationFees,
            links,
        };
    } catch (error) {
        console.error(`Error scraping details from ${url}:`, error);
        return {
            title: 'Not available',
            postDate: 'Not available',
            shortInfo: 'Not available',
            importantDates: [],
            applicationFees: [],
            links: {},
        };
    }
};

const scrapeDetails = async () => {
    try {
        // Launch Puppeteer browser
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Load the existing JSON file with the links to scrape
        const jsonData = JSON.parse(fs.readFileSync('data.json', 'utf-8'));

        // Array to store results with scraped details
        const resultsWithDetails = [];

        // Iterate over each item in the JSON file
        for (const item of jsonData) {
            console.log(`Scraping details for heading: ${item.heading}`);

            // Iterate over the links in the "pageLinks" array
            for (const linkData of item.pageLinks) {
                console.log(`Scraping details from: ${linkData.link}`);

                // Scrape details from the individual page link
                const details = await scrapeDetailsFromPage(page, linkData.link);

                // Store the heading, link, and scraped details
                resultsWithDetails.push({
                    heading: item.heading,
                    pageName: linkData.name,
                    link: linkData.link,
                    details, // Store the scraped details from this link
                });
            }
        }

        // Output the new results with all the scraped details
        console.log("Detailed Results with Data:", resultsWithDetails);

        // Save the new results to a JSON file
        fs.writeFileSync('detailedScrapedData.json', JSON.stringify(resultsWithDetails, null, 2), 'utf-8');
        console.log('Detailed data saved to detailedScrapedData.json');

        // Close the browser
        await browser.close();

    } catch (error) {
        console.error("An error occurred:", error);
    }
};

// Run the scraper
scrapeDetails();
