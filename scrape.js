require("dotenv").config();

const fs = require("fs");
const { chromium } = require("playwright");
const path = require("path");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to scrape the main page for product listings
async function scrapePage(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the URL
    await page.goto(url);
    await page.waitForSelector(".ItemCardList__item");

    // Extract product details from the page
    const products = await page.evaluate(() => {
      const productListings = Array.from(
        document.querySelectorAll(".ItemCardList__item")
      );
      const first10Products = productListings.slice(0, 10).map((product) => {
        const title = product.getAttribute("title");
        const url = product.getAttribute("href");
        const priceElement = product.querySelector(".ItemCard__price");
        const price = priceElement ? priceElement.innerText.trim() : "";
        const id = crypto.randomUUID();
        return { id, title, url, price };
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

// Function to upload images to Cloudinary and get secure URLs
async function uploadImagesToCloudinary(imageUrls, productId) {
  if (process.argv.includes("--no-upload")) {
    // return imageUrls.map((_) => "Test Mode"); // Return 'Test Mode' for each image
    return [`Test Mode. Images: ${imageUrls.length}`];
  }

  const uploadPromises = imageUrls.map((imageUrl) => {
    return cloudinary.uploader.upload(imageUrl, {
      folder: `reborn/${productId}`,
    });
  });

  const uploadResults = await Promise.all(uploadPromises);
  return uploadResults.map((result) => result.secure_url);
}

// Function to scrape product details from individual product pages
async function scrapProductDetails(products) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const arrProductsWithDetails = [];

  try {
    for (const product of products) {
      const { url } = product;
      console.log("Visiting URL:", url);

      await page.goto(url);
      await page.waitForSelector("wallapop-carousel");
      console.log("Wallapop carousel loaded");

      // Extract image URLs from the page
      const imageUrls = await page.evaluate(() => {
        const imageElements = document.querySelectorAll(
          'wallapop-carousel img[slot="carousel-content"]'
        );
        return Array.from(imageElements).map((img) => img.getAttribute("src"));
      });
      console.log("Image URLs:", imageUrls);

      // Extract product description from the page
      await page.waitForSelector(".item-detail_ItemDetail__description__7rXXT");
      const description = await page.evaluate(() => {
        const descriptionElement = document.querySelector(
          ".item-detail_ItemDetail__description__7rXXT"
        );
        return descriptionElement ? descriptionElement.textContent.trim() : "";
      });
      console.log("Description:", description);

      // Attempt to extract product condition, handle case where element may not be found
      let condition = "";
      try {
        await page.waitForSelector(
          ".item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT",
          { timeout: 5000 } // Reduced timeout to 5 seconds
        );
        condition = await page.evaluate(() => {
          const conditionElement = document.querySelector(
            ".item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT"
          );
          return conditionElement ? conditionElement.textContent.trim() : "";
        });
        console.log("Condition:", condition);
      } catch (timeoutError) {
        console.log("Condition element not found, skipping...");
      }

      // Check for "Reservado" badge to determine if the product is reserved
      const isReserved = await page.evaluate(() => {
        const badgeElement = document.querySelector(
          'wallapop-badge[badge-type="reserved"][text="Reservado"]'
        );
        return badgeElement !== null;
      });
      console.log("Is Reserved:", isReserved);

      // Upload images to Cloudinary and get their secure URLs
      const cloudinaryUrls = await uploadImagesToCloudinary(
        imageUrls,
        product.id
      );

      // Create a product object with all extracted details and add it to the list
      const productWithDetails = {
        ...product,
        description,
        condition,
        reserved: isReserved,
        images: cloudinaryUrls,
        category: process.argv[3],
      };
      arrProductsWithDetails.push(productWithDetails);

      // Stop after processing 10 products
      if (arrProductsWithDetails.length >= 10) {
        break;
      }
    }
  } catch (error) {
    console.error("Error while scraping images and description:", error);
  } finally {
    await browser.close();
  }

  return arrProductsWithDetails;
}

// Main function to coordinate the scraping process
async function main() {
  try {
    const url = process.argv[2];
    const category = process.argv[3];
    if (!url || !category) {
      console.error("Usage: node scrape.js <url> <category> --no-upload");
      process.exit(1);
    }

    console.log("Scraping data from:", url);
    const first10Products = await scrapePage(url);

    if (first10Products.length > 0) {
      const arrProductsWithDetails = await scrapProductDetails(first10Products);

      // Create a results directory if it doesn't exist
      const resultsDir = path.join(__dirname, "results");
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
      }

      // Save the results to a file
      const filePath = path.join(resultsDir, "reborn_scraped_products.json");
      fs.writeFileSync(
        filePath,
        JSON.stringify(arrProductsWithDetails, null, 2)
      );
      console.log(`Data saved to ${filePath}`);
    } else {
      console.log("No data to save");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    process.exit();
  }
}

main();
