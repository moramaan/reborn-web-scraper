# Reborn Web Scraper

Welcome to Reborn Web Scraper!

## Introduction

Reborn Web Scraper is a tool designed to extract data from websites with ease. Whether you're a developer, a data enthusiast, or a curious learner, this scraper simplifies the process of gathering information from the web. With a minimum `HTML` and `CSS` knowledge you can use the tool.

It could provide the first experience with web scraping, using `playwright` lib.
Learn how to extract various types of data including text, images, links, and more.


## Legal Disclaimer

This project is for academic purposes only. The data obtained through this tool should be used responsibly and in compliance with the terms of service of the websites being scraped. The developers of this tool are not responsible for any misuse of the extracted data.

## Getting Started

To get started with Reborn Web Scraper, follow these steps:

1. Clone this repository:

```bash
git clone https://github.com/moramaan/reborn-web-scraper.git
```

2. Navigate to the project directory:

```bash
cd reborn-web-scraper
```

3. Install dependencies:

```bash
npm install
```

4. Set up Cloudinary SDK:
   
   Reborn Web Scraper utilizes Cloudinary for image upload. Before running the scraper, you need to sign up for a Cloudinary account and set up your `.env` file with the required keys. Get your Cloudinary API Key, API Secret, and Cloud Name from your Cloudinary dashboard and add them to the `.env` file in the root directory of the project.

   ```
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   ```

5. Analize the website you want to scrap and adapt the code

You should to know the markup structure and selectors of where your desired info is and then adapt the base code with your specific usecase.
In my personal usecase I needed to get quickly data with a specific structure to fill the database of Reborn project to being able to make a demo to my teachers so I scraped a well known second hand marketplace.

1. Run the scraper with the desired URL and category:

```bash
node scraper.js "https://example.com" "products"
```

Replace `https://example.com` with the URL you want to scrape and `"products"` with the desired category. If the category name contains spaces, enclose it in double quotes.

### Optional Flags:

- `--no-upload`: Add this flag if you do not want to upload images to Cloudinary.

## Local File System Example (v1 - First Commit)

If you prefer to store images locally, you can refer to the first commit (v1) for an example of how to work with the local file system. In that version, images are stored in the local file system instead of being uploaded to Cloudinary.

## Contribution

Contributions are welcome! If you have any suggestions, ideas, or bug fixes, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
