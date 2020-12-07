const puppeteer = require('puppeteer');
const fs = require('fs');

const parseData = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.okeydostavka.ru/');
  await page.setViewport({ width: 1440, height: 1200 });
  await page.waitForSelector(
    '#citySelectionLink > tbody > tr > td.dijitReset.dijitStretch.dijitButtonContents > div.dijitReset.dijitInputField.dijitButtonText > span'
  );

  await page.click(
    '#citySelectionLink > tbody > tr > td.dijitReset.dijitStretch.dijitButtonContents > div.dijitReset.dijitInputField.dijitButtonText > span'
  );
  await page.click(
    '#citySelectionLink_menu > table > tbody > tr > td.dijitMenuItemLabel'
  );

  await page.waitForNavigation();

  await page.hover(
    '#departmentLink_15063_alt > div > div.col-no-gutter.col-a-middle.menu-label'
  );

  await page.click('#subcategoryLink_15063_16059_24568');

  const data = [];

  const scrapeCurrentPage = async () => {
    await page.waitForTimeout(7000);

    const parser = async () => {
      const parseData = await page.$$eval(
        'div.product.ok-theme',
        (products) => {
          const result = [];

          products = products.map((item) => {
            const discount = item.querySelector(
              '.discount-badge.special-discount > span'
            );

            const getCommonProperties = () => {
              return {
                name: item
                  .querySelector('div.product-info > div > a')
                  .title.trim(),
                weight: item
                  .querySelector('div.product-weight')
                  .textContent.trim()
                  .replace(/[\t\n]+кг/gm, '')
                  .replace(/\,/gm, '.'),
                price: item
                  .querySelector(
                    'div.rows.price_and_cart > div.product-price > span'
                  )
                  .textContent.trim(),
              };
            };

            const commonProperties = getCommonProperties();
            if (discount) {
              result.push({
                ...commonProperties,
                discountPrice: item
                  .querySelector(
                    'div.rows.price_and_cart > div.product-price > span:nth-of-type(2)'
                  )
                  .textContent.trim(),
              });
            } else {
              result.push({
                ...commonProperties,
              });
            }
          });

          return result.map((item) => {
            return { ...item, weight: `${item.weight * 1000} г` };
          });
        }
      );

      return data.push(await parseData);
    };

    await parser();

    const pageLength = await page.$eval(
      '#searchBasedNavigation_widget_6_-1011_3074457345618259713 > div.productListingWidget > section.top-line > div.rows.controls.row-a-space.pagination_present > div.paging_controls',
      (item) => item.querySelectorAll('a').length / 2
    );

    const pageNumber = await page.$eval(
      '#pageControlMenu_6_-1011_3074457345618259713 > div > a.active.selected',
      (item) => +item.textContent
    );

    if (pageLength > pageNumber) {
      await page.click(
        '#WC_SearchBasedNavigationResults_pagination_link_right_categoryResults_img'
      );
      return scrapeCurrentPage();
    }

    await page.close();
  };

  await scrapeCurrentPage();

  const mappedData = data.flat().map((item, index) => {
    return { position: index + 1, ...item };
  });

  await fs.writeFile(
    './result.txt',
    JSON.stringify(mappedData, undefined, 2),
    (err) => {
      if (err) {
        return console.log(err);
      }
      console.log('Done!');
    }
  );

  browser.close();
};

parseData();
