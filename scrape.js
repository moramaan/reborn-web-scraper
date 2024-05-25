const fs = require("fs");
const { chromium } = require("playwright");
const path = require("path");
const crypto = require("crypto");

async function scrapePage(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url);

    // Wait for the product listings to appear
    await page.waitForSelector(".ItemCardList__item");

    const products = await page.evaluate(() => {
      const productListings = Array.from(
        document.querySelectorAll(".ItemCardList__item")
      );
      const first10Products = productListings.slice(0, 10).map((product) => {
        const name = product.getAttribute("title");
        const url = product.getAttribute("href");
        const priceElement = product.querySelector(".ItemCard__price");
        const price = priceElement ? priceElement.innerText.trim() : "";
        const uuid = crypto.randomUUID(); // Generate UUID for each product using crypto module
        return { uuid, name, url, price };
      });
      return first10Products;
    });

    await browser.close();
    return products;
  } catch (error) {
    console.error("Error:", error.message);
    await browser.close();
    return [];
  }
}

async function scrapeImagesAndDescriptionFromUrls(products) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const productsWithImagesAndDescription = [];

  try {
    for (const product of products) {
      const { url } = product;
      console.log("Visiting URL:", url);

      await page.goto(url);

      // Wait for the wallapop-carousel to load
      await page.waitForSelector("wallapop-carousel");
      console.log("Wallapop carousel loaded");

      // Extract image URLs
      const imageUrls = await page.evaluate(() => {
        const imageElements = document.querySelectorAll(
          'wallapop-carousel img[slot="carousel-content"]'
        );
        return Array.from(imageElements).map((img) => img.getAttribute("src"));
      });
      console.log("Image URLs:", imageUrls);

      await page.waitForSelector(".item-detail_ItemDetail__description__7rXXT");

      // Extract description
      const description = await page.evaluate(() => {
        const descriptionElement = document.querySelector(
          ".item-detail_ItemDetail__description__7rXXT"
        );
        return descriptionElement ? descriptionElement.textContent.trim() : "";
      });
      console.log("Description:", description);

      // Wait for the additional specifications to load
      await page.waitForSelector(
        ".item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT"
      );
      console.log("Additional specifications loaded");

      // Extract state
      const state = await page.evaluate(() => {
        const stateElement = document.querySelector(
          ".item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT"
        );
        return stateElement ? stateElement.textContent.trim() : "";
      });
      console.log("State:", state);

      // Add imageUrls, description, and state to new product object
      const productWithImagesAndDescription = {
        ...product,
        description,
        state,
        images: imageUrls,
      };
      productsWithImagesAndDescription.push(productWithImagesAndDescription);

      // If 10 products have been processed, exit the loop
      if (productsWithImagesAndDescription.length >= 10) {
        break;
      }
    }
  } catch (error) {
    console.error("Error while scraping images and description:", error);
  } finally {
    await browser.close();
  }

  return productsWithImagesAndDescription;
}

async function main() {
  try {
    // Get URL from command-line arguments
    const url = process.argv[2];

    // Check if URL is provided
    if (!url) {
      console.error("Usage: node final_scrape.js <url>");
      process.exit(1);
    }

    console.log("Scraping data from:", url);
    const first10Products = await scrapePage(url);

    if (first10Products.length > 0) {
      const productsWithImagesAndDescription =
        await scrapeImagesAndDescriptionFromUrls(first10Products);

      // Create 'results' directory if it doesn't exist
      const resultsDir = path.join(__dirname, "results");
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
      }

      // Save productsWithImagesAndDescription to a JSON file in the 'results' directory
      const filePath = path.join(resultsDir, "motorbike_gear.json");
      fs.writeFileSync(
        filePath,
        JSON.stringify(productsWithImagesAndDescription, null, 2)
      );
      console.log(`Data saved to ${filePath}`);
    } else {
      console.log("No data to save");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    // Exit the Node.js process
    process.exit();
  }
}

main();
