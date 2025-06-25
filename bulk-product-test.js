#!/usr/bin/env node

// Bulk Product Test Script
// This script adds thousands of products to test system efficiency

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Product categories with realistic data
const PRODUCT_CATEGORIES = {
  groceries: {
    names: [
      'Rice Basmati', 'Rice Sella', 'Wheat Flour', 'Sugar White', 'Sugar Brown',
      'Salt Rock', 'Salt Table', 'Oil Cooking', 'Oil Olive', 'Ghee Pure',
      'Milk Powder', 'Tea Black', 'Tea Green', 'Coffee Instant', 'Honey Pure',
      'Lentils Red', 'Lentils Black', 'Chickpeas', 'Kidney Beans', 'Split Peas'
    ],
    units: ['kg', 'gram', 'liter', 'ml'],
    priceRange: [50, 2000]
  },
  electronics: {
    names: [
      'LED Bulb', 'CFL Bulb', 'Extension Cord', 'Power Strip', 'USB Cable',
      'Phone Charger', 'Bluetooth Speaker', 'Headphones', 'Power Bank', 'Memory Card',
      'USB Drive', 'HDMI Cable', 'Adapter', 'Battery AA', 'Battery AAA'
    ],
    units: ['piece', 'box'],
    priceRange: [100, 5000]
  },
  household: {
    names: [
      'Detergent Powder', 'Dish Soap', 'Floor Cleaner', 'Glass Cleaner', 'Toilet Paper',
      'Paper Towels', 'Garbage Bags', 'Aluminum Foil', 'Plastic Wrap', 'Sponges',
      'Broom', 'Mop', 'Bucket', 'Dustpan', 'Cleaning Cloth'
    ],
    units: ['piece', 'box', 'kg', 'liter'],
    priceRange: [25, 800]
  },
  personal_care: {
    names: [
      'Shampoo', 'Conditioner', 'Body Wash', 'Face Wash', 'Toothpaste',
      'Toothbrush', 'Soap Bar', 'Deodorant', 'Moisturizer', 'Sunscreen',
      'Hair Oil', 'Face Cream', 'Hand Sanitizer', 'Tissues', 'Cotton Pads'
    ],
    units: ['ml', 'piece', 'box'],
    priceRange: [80, 1500]
  },
  stationery: {
    names: [
      'Pen Blue', 'Pen Black', 'Pencil HB', 'Eraser', 'Ruler',
      'Notebook A4', 'Notebook A5', 'Stapler', 'Paper Clips', 'Sticky Notes',
      'Marker', 'Highlighter', 'Scissors', 'Glue Stick', 'Calculator'
    ],
    units: ['piece', 'box'],
    priceRange: [10, 500]
  }
};

const SUPPLIERS = [
  'Metro Wholesale', 'City Suppliers', 'Prime Distributors', 'Global Traders',
  'Local Market Co', 'Best Buy Wholesale', 'Quality Goods Ltd', 'Express Supply',
  'Mega Mart Suppliers', 'Elite Distributors', 'Fast Track Trading', 'Supreme Suppliers'
];

const BRANDS = [
  'Premium', 'Quality', 'Super', 'Gold', 'Silver', 'Classic', 'Royal', 'Elite',
  'Standard', 'Economy', 'Deluxe', 'Special', 'Fresh', 'Pure', 'Natural'
];

// Utility functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPrice(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

// API client
class BulkTestClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.createdSuppliers = new Map();
    this.stats = {
      suppliersCreated: 0,
      productsCreated: 0,
      errors: 0,
      startTime: null,
      endTime: null
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${url}`, error.message);
      throw error;
    }
  }

  async createSupplier(supplierData) {
    try {
      const supplier = await this.request('/suppliers/', {
        method: 'POST',
        body: JSON.stringify(supplierData),
      });
      this.stats.suppliersCreated++;
      return supplier;
    } catch (error) {
      console.error(`Failed to create supplier ${supplierData.name}:`, error.message);
      this.stats.errors++;
      return null;
    }
  }

  async getOrCreateSupplier(supplierName) {
    if (this.createdSuppliers.has(supplierName)) {
      return this.createdSuppliers.get(supplierName);
    }

    const supplierData = {
      name: supplierName,
      contact_person: `Contact for ${supplierName}`,
      email: `${supplierName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: `+92-300-${getRandomNumber(1000000, 9999999)}`,
      address: `${getRandomNumber(1, 999)} ${supplierName} Street, City`
    };

    const supplier = await this.createSupplier(supplierData);
    if (supplier) {
      this.createdSuppliers.set(supplierName, supplier);
    }
    return supplier;
  }

  async createProduct(productData) {
    try {
      const product = await this.request('/products/', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      this.stats.productsCreated++;
      return product;
    } catch (error) {
      console.error(`Failed to create product ${productData.name}:`, error.message);
      this.stats.errors++;
      return null;
    }
  }

  generateProductName(category, baseName) {
    const brand = getRandomElement(BRANDS);
    const size = getRandomElement(['Small', 'Medium', 'Large', '500g', '1kg', '2L', '250ml']);
    
    // Sometimes add brand, sometimes add size, sometimes both
    const variations = [
      baseName,
      `${brand} ${baseName}`,
      `${baseName} ${size}`,
      `${brand} ${baseName} ${size}`
    ];
    
    return getRandomElement(variations);
  }

  async generateAndCreateProducts(count = 1000) {
    console.log(`\n🚀 Starting bulk product creation: ${count} products`);
    console.log(`📡 API Endpoint: ${this.baseUrl}`);
    
    this.stats.startTime = Date.now();
    
    const categories = Object.keys(PRODUCT_CATEGORIES);
    const productsPerBatch = 50; // Process in batches to avoid overwhelming the API
    
    for (let batch = 0; batch < Math.ceil(count / productsPerBatch); batch++) {
      const batchStart = batch * productsPerBatch;
      const batchEnd = Math.min(batchStart + productsPerBatch, count);
      const batchSize = batchEnd - batchStart;
      
      console.log(`\n📦 Processing batch ${batch + 1}/${Math.ceil(count / productsPerBatch)} (${batchSize} products)`);
      
      const promises = [];
      
      for (let i = batchStart; i < batchEnd; i++) {
        const category = getRandomElement(categories);
        const categoryData = PRODUCT_CATEGORIES[category];
        const baseName = getRandomElement(categoryData.names);
        const productName = this.generateProductName(category, baseName);
        
        const supplierName = getRandomElement(SUPPLIERS);
        const unit = getRandomElement(categoryData.units);
        const purchasePrice = parseFloat(getRandomPrice(categoryData.priceRange[0], categoryData.priceRange[1]));
        const salePrice = (purchasePrice * (1 + Math.random() * 0.5 + 0.1)).toFixed(2); // 10-60% markup
        
        const productPromise = this.createSingleProduct({
          name: productName,
          unit: unit,
          quantity: getRandomNumber(10, 500),
          purchasePrice: purchasePrice.toFixed(2),
          salePrice: salePrice,
          supplierName: supplierName,
          description: `${category} item - ${productName}`,
          lowStockThreshold: getRandomNumber(5, 20)
        });
        
        promises.push(productPromise);
      }
      
      // Wait for batch to complete
      await Promise.allSettled(promises);
      
      // Progress update
      const progress = ((batchEnd / count) * 100).toFixed(1);
      console.log(`✅ Batch ${batch + 1} completed. Progress: ${progress}% (${this.stats.productsCreated}/${count} products created)`);
      
      // Small delay between batches to be nice to the API
      if (batch < Math.ceil(count / productsPerBatch) - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.stats.endTime = Date.now();
    this.printStats();
  }

  async createSingleProduct(productData) {
    try {
      // Get or create supplier
      const supplier = await this.getOrCreateSupplier(productData.supplierName);
      if (!supplier) {
        throw new Error(`Failed to get supplier: ${productData.supplierName}`);
      }

      // Create product
      const product = await this.createProduct({
        name: productData.name,
        unit: productData.unit,
        quantity: productData.quantity,
        price: productData.purchasePrice,
        sale_price: productData.salePrice,
        supplier: supplier.id,
        description: productData.description,
        low_stock_threshold: productData.lowStockThreshold
      });

      return product;
    } catch (error) {
      console.error(`Error creating product ${productData.name}:`, error.message);
      this.stats.errors++;
      return null;
    }
  }

  printStats() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    const productsPerSecond = (this.stats.productsCreated / duration).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 BULK PRODUCT CREATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Time: ${duration.toFixed(2)} seconds`);
    console.log(`🏪 Suppliers Created: ${this.stats.suppliersCreated}`);
    console.log(`📦 Products Created: ${this.stats.productsCreated}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`⚡ Rate: ${productsPerSecond} products/second`);
    console.log(`🎯 Success Rate: ${((this.stats.productsCreated / (this.stats.productsCreated + this.stats.errors)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    if (this.stats.errors > 0) {
      console.log('⚠️  Some errors occurred. Check the logs above for details.');
    } else {
      console.log('🎉 All products created successfully!');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const productCount = args[0] ? parseInt(args[0]) : 1000;
  
  if (isNaN(productCount) || productCount <= 0) {
    console.error('❌ Please provide a valid number of products to create.');
    console.log('Usage: node bulk-product-test.js [number_of_products]');
    console.log('Example: node bulk-product-test.js 2000');
    process.exit(1);
  }

  console.log('🧪 BULK PRODUCT TEST SCRIPT');
  console.log('==========================');
  console.log(`Target: ${productCount} products`);
  
  const client = new BulkTestClient();
  
  try {
    await client.generateAndCreateProducts(productCount);
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Script interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BulkTestClient };