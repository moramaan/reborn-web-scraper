require('dotenv').config();

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

async function scrapePage(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url);
    await page.waitForSelector(".ItemCardList__item");

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

async function uploadImagesToCloudinary(imageUrls, productId) {
  const uploadPromises = imageUrls.map((imageUrl) => {
    return cloudinary.uploader.upload(imageUrl, {
      folder: `reborn/${productId}`,
    });
  });

  const uploadResults = await Promise.all(uploadPromises);
  return uploadResults.map((result) => result.secure_url);
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
      await page.waitForSelector("wallapop-carousel");
      console.log("Wallapop carousel loaded");

      const imageUrls = await page.evaluate(() => {
        const imageElements = document.querySelectorAll(
          'wallapop-carousel img[slot="carousel-content"]'
        );
        return Array.from(imageElements).map((img) => img.getAttribute("src"));
      });
      console.log("Image URLs:", imageUrls);

      await page.waitForSelector(".item-detail_ItemDetail__description__7rXXT");
      const description = await page.evaluate(() => {
        const descriptionElement = document.querySelector(
          ".item-detail_ItemDetail__description__7rXXT"
        );
        return descriptionElement ? descriptionElement.textContent.trim() : "";
      });
      console.log("Description:", description);

      await page.waitForSelector(
        ".item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT"
      );
      const condition = await page.evaluate(() => {
        const conditionElement = document.querySelector(
          ".item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT"
        );
        return conditionElement ? conditionElement.textContent.trim() : "";
      });
      console.log("State:", condition);

      // Upload images to Cloudinary
      const cloudinaryUrls = await uploadImagesToCloudinary(
        imageUrls,
        product.uuid
      );

      const productWithImagesAndDescription = {
        ...product,
        description,
        condition,
        images: cloudinaryUrls, // Use Cloudinary URLs
      };
      productsWithImagesAndDescription.push(productWithImagesAndDescription);

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
    const url = process.argv[2];
    if (!url) {
      console.error("Usage: node scrape.js <url>");
      process.exit(1);
    }

    console.log("Scraping data from:", url);
    const first10Products = await scrapePage(url);

    if (first10Products.length > 0) {
      const productsWithImagesAndDescription =
        await scrapeImagesAndDescriptionFromUrls(first10Products);

      const resultsDir = path.join(__dirname, "results");
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
      }

      const filePath = path.join(resultsDir, "reborn_scraped_products.json");
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
    process.exit();
  }
}

main();
