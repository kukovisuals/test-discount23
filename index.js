const puppeteer = require('puppeteer');
const assert = require('assert');


const iPhone = puppeteer.devices['iPhone 6'];

(async () => {
  const browser = await puppeteer.launch({ headless: false});
  const page = await browser.newPage();
  await page.emulate(iPhone);

  // Fetching product data
  await page.goto('https://shop.join-eby.com/collections/seamless-underwear/products.json?limit=200');
  const data = await page.evaluate(() => JSON.parse(document.body.textContent));
  const skus = data.products.map(pdp => pdp.id);
  const pdpNames = data.products.map(pdp => '/products/' + pdp.handle);

  for(pdpName of pdpNames){

    // Visit the first product detail page
    await page.goto(`https://shop.join-eby.com${pdpName}`);

    // Perform actions on the product detail page
    // Example: Extract price text
    let priceText = await page.evaluate(() => {
      const priceElement = document.querySelector('.mobile-intro .priceProduct.holidayPriceWrapper.standard.bfx-price');
      return priceElement ? priceElement.innerText.trim() : '';
    });

    // Check if '.swatch-element.available' exists
    const availableVariant = await page.$('.js-swatch.swatch.clearfix .swatch-element label[data-available="true"]');
    const isAvailableVariantVisible = availableVariant && await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility === 'visible';
    }, availableVariant);

    await page.waitForTimeout(2000);
    if (isAvailableVariantVisible) {
      // Click on the first available variant
      await page.click('.js-swatch.swatch.clearfix .swatch-element label[data-available="true"]');
    } else {

      const dropdowns = await page.$$('.select-dropdown.dropdown-trigger');
      
      await page.click('.select-dropdown.dropdown-trigger:first-child');
      await page.waitForTimeout(1000); // Wait for 3 seconds
      await page.keyboard.press('ArrowDown'); // Navigate down in the dropdown
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter'); // Select the option

      if (dropdowns.length > 1) {
          await dropdowns[1].click();
          await page.waitForTimeout(1000); // Wait for 3 seconds
          await page.keyboard.press('ArrowDown'); // Navigate down in the dropdown
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter'); // Select the option
      }
    }


    // Add to cart
    await page.click('#AddToCartText');
    await page.waitForTimeout(500); 
    await page.evaluate(() => {
        window.scrollTo(0, 100);
    });
    await page.waitForTimeout(500); // Wait for 2.5 seconds for the cart to update
    await page.evaluate(() => {
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(2000); // Wait for 2.5 seconds for the cart to update
    // Scroll to the top of the page
    

    // Open the side cart
    await page.click('.eby-mobile-nav.bkgrn-white-color-dark .ebyicon-minicart-empty-alt');
    await page.waitForTimeout(500);

    // Check if the price in the cart matches the saved price
    const cartPriceText = await page.evaluate(() => {
      const cartPriceElement = document.querySelector('.has-discount.bfx-product-subtotal.bfx-price');
      return cartPriceElement ? cartPriceElement.innerText.trim() : '';
    });
    // console.log('SKUs:', JSON.stringify(skus));
    console.log('what is it', isAvailableVariantVisible)
    // console.log('PDP Names:', JSON.stringify(pdpNames));
    console.log('Price Text:', priceText);
    console.log('Cart Price Text:', cartPriceText);
    
    assert.strictEqual(priceText, cartPriceText, 'The prices should be equal');
    if (priceText === cartPriceText) {
      console.log('Test Passed: The numeric values of the prices are equal.', pdpName);
    } else {
        console.log('Test Failed: The numeric values of the prices are different.', pdpName);
    }
    await page.click('.cartRemoveBox');

  }
  await browser.close();
})();
