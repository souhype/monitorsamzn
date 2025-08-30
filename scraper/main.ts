import puppeteer from "puppeteer-core";
import { Database } from "bun:sqlite";

const db = new Database("./db.sqlite");

const products: Product[] = [];

const duration = () => Math.floor(Math.random() * 4000) + 4000;

interface Product {
    name: string;
    url: string;
    imgUrl: string;
    title: string;
    rating: number;
    reviews: number;
    sales: number;
    price: number;
    usedPrice: number;
    save: number;
    region: string;
}

function resetDb() {
    db.run(`
        DROP TABLE IF EXISTS products;
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            url TEXT,
            imgUrl TEXT,
            title TEXT,
            rating REAL DEFAULT 0,
            reviews INTEGER DEFAULT 0,
            sales INTEGER DEFAULT 0,
            price REAL,
            usedPrice REAL DEFAULT 0,
            save REAL DEFAULT 0,
            region TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX search ON products(name);
    `);
}

function readDb() {
    const products = db
        .query("SELECT * FROM products ORDER BY id desc LIMIT 5")
        .all();
    const count = db.query("SELECT COUNT(*) from products").all();
    console.log(products, count);
}

function insertDb() {
    products.forEach((product) =>
        db.run(
            `
          INSERT INTO products(name, url, imgUrl, title, rating, reviews, sales, price, usedPrice, save, region)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(name)
          DO UPDATE SET
          rating=excluded.rating,
          reviews=excluded.reviews,
          sales=excluded.sales,
          price=excluded.price,
          usedPrice=excluded.usedPrice,
          save=excluded.save
          `,
            [
                product.name,
                product.url,
                product.imgUrl,
                product.title,
                product.rating,
                product.reviews,
                product.sales,
                product.price,
                product.usedPrice,
                product.save,
                product.region,
            ]
        )
    );
}

const selectors = {
    container: "div > div > div > div > span > div > div",
    url: "div > div > span > div > div > div > div > a",
    imgUrl: "div > div > span > div > div > div > span > a > div > img",
    title: "div > div > span > div > div > div > div > a > h2",
    rating:
        "div > div > span > div > div > div > div > span > div > div > div > div > div > span > a > i > span",
    reviews: "span.a-size-base.s-underline-text",
    sales:
        "div > div > div > div > span > div > div > div > div > span > div > div > div > div > div:nth-of-type(2) > span",
    price:
        "div > div > span > div > div > div > div > div > div > a > span > span",
    usedPrice:
        "div > div > div > div > div > span > div > div > div > div > span > div > div > div > div:nth-of-type(7) > div > span:nth-of-type(2)",
};

function getUrl(y: number, iterator: number) {
    const urls = [
        `https://www.amazon.de/-/en/s?i=computers&rh=n%3A429868031&s=popularity-rank&fs=true&page=${iterator}&language=en&xpid=pndD1t-CqdeWG&qid=1738341475&ref=sr_pg_1`,
        `https://www.amazon.com/s?i=computers&rh=n%3A1292115011&s=popularity-rank&fs=true&page=${iterator}&xpid=X5Pyn4VA123rg&qid=1738343793&ref=sr_pg_1`,
        `https://www.amazon.nl/-/en/s?i=electronics&bbn=16269066031&rh=n%3A16366028031&s=popularity-rank&fs=true&page=${iterator}&language=en&xpid=jQtuJ_KIB3zhT&qid=1738345332&ref=sr_pg_1`,
        `https://www.amazon.com.be/-/en/s?i=computers&rh=n%3A27862560031&s=popularity-rank&fs=true&page=${iterator}&language=en&xpid=LIzUF4Srgnx2N&qid=1738345389&ref=sr_pg_1`,
        `https://www.amazon.fr/-/en/s?i=computers&srs=514848031&rh=n%3A514848031&s=popularity-rank&fs=true&page=${iterator}&language=en&xpid=-eXNQSoC9ShDP&qid=1738345447&ref=sr_pg_1`,
        `https://www.amazon.es/-/en/s?i=computers&rh=n%3A937992031&s=popularity-rank&fs=true&page=${iterator}&language=en&xpid=dr3HNjfbxtBIg&qid=1738345506&ref=sr_pg_1`,
        `https://www.amazon.it/-/en/s?i=computers&rh=n%3A460159031&s=popularity-rank&fs=true&page=${iterator}&language=en&xpid=Oh7Cf0wT-75V-&qid=1738361034&ref=sr_pg_1`,
    ];
    return urls[y];
}

async function imgDownloader() {
    const els = db
        .query("SELECT * FROM products ORDER BY id DESC")
        .all() as Product[];
    for (const product of els) {
        const response = await fetch(product.imgUrl);
        const imageData = await response.arrayBuffer();

        const path = `products/${product.name}.jpg`;

        const blob = new Blob([imageData], { type: "image/jpeg" });

        await Bun.write(path, blob);
    }
    console.log('done')
}

async function spawn() {
    Bun.spawn([
        "cmd",
        "/c",
        "start chrome --remote-debugging-port=9222",
    ]);
    await Bun.sleep(2000);
    const browser = await puppeteer.connect({
        browserURL: "http://127.0.0.1:9222",
    });
}

async function main() {
    // const browser = await puppeteer.launch({
    //     headless: false,
    //     args: ["--remote-debugging-port=9222"],
    //     executablePath: `C:/Program Files/Google/Chrome/Application/chrome.exe`,
    // });
    const browser = await puppeteer.launch({
    headless: false,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    ignoreDefaultArgs: true,
    args: [
        '--user-data-dir=' + "C:/Users/PC/AppData/Local/Google/Chrome/User Data/Default"]
});
    const page = await browser.newPage();

    for (let y = 0; y < 7; y++) {
        console.log(y)
        for (let i = 1; i < 2; i++) {
            await page.goto(getUrl(y, i));
            await Bun.sleep(duration());

            const temp = await page.evaluate((selectors) => {
                return Array.from(document.querySelectorAll(selectors.container))
                    .map((product) => {
                        const url =
                            (
                                product.querySelector(selectors.url) as HTMLAnchorElement
                            )?.href.split("?")[0] || "";
                        const imgUrl =
                            (product.querySelector(selectors.imgUrl) as HTMLImageElement)
                                ?.src || "";
                        const title =
                            product.querySelector(selectors.title)?.textContent || "";
                        const rating = parseFloat(
                            product
                                .querySelector(selectors.rating)
                                ?.textContent?.split(" ")[0] || ""
                        );
                        const reviews =
                            parseFloat(
                                product
                                    .querySelector(selectors.reviews)
                                    ?.textContent?.replace(",", "") || ""
                            ) || 0;
                        const sales =
                            parseFloat(
                                product
                                    .querySelector(selectors.sales)
                                    ?.textContent?.split(" ")[0]
                                    .replace("K+", "000") || ""
                            ) || 0;
                        const price = parseFloat(
                            product
                                .querySelector(selectors.price)
                                ?.textContent?.replace(/[^\d.]/g, "") || ""
                        );
                        const usedPrice = parseFloat(
                            product
                                .querySelector(selectors.usedPrice)
                                ?.textContent?.replace(/[^\d.]/g, "") || String(price)
                        );

                        const name = title?.replace(/[^\w]/g, "").toLowerCase();
                        const region = url.split(".").pop()?.split("/").shift() || "";
                        const save = +(((price - usedPrice) / price) * 100).toFixed(2);

                        return {
                            url,
                            imgUrl,
                            title,
                            rating,
                            reviews,
                            sales,
                            price,
                            usedPrice,
                            name,
                            region,
                            save,
                        };
                    })
                    .filter((product) => product.price && !product.url.includes("sspa") && product.region);
            }, selectors);

            products.push(...temp);
        }
    }
    // await browser.close();
    insertDb();
    readDb();
}

// await main()
// await imgDownloader()