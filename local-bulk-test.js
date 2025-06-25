#!/usr/bin/env node

// Local Bulk Product Test Script
// This script adds thousands of products to test local system efficiency

const API_BASE_URL = 'http://localhost:8000/api';

// Simplified product data for faster testing
const PRODUCT_TEMPLATES = [
  // Groceries
  { name: 'Rice Basmati', unit: 'kg', category: 'groceries', basePrice: 150 },
  { name: 'Wheat Flour', unit: 'kg', category: 'groceries', basePrice: 80 },
  { name: 'Sugar White', unit: 'kg', category: 'groceries', basePrice: 120 },
  { name: 'Cooking Oil', unit: 'liter', category: 'groceries', basePrice: 300 },
  { name: 'Tea Black', unit: 'kg', category: 'groceries', basePrice: 800 },
  
  // Electronics
  { name: 'LED Bulb', unit: 'piece', category: 'electronics', basePrice: 200 },
  { name: 'USB Cable', unit: 'piece', category: 'electronics', basePrice: 150 },
  { name: 'Phone Charger', unit: 'piece', category: 'electronics', basePrice: 500 },
  { name: 'Power Bank', unit: 'piece', category: 'electronics', basePrice: 2000 },
  { name: 'Headphones', unit: 'piece', category: 'electronics', basePrice: 1500 },
  
  // Household
  { name: 'Detergent Powder', unit: 'kg', category: 'household', basePrice: 250 },
  { name: 'Dish Soap', unit: 'liter', category: 'household', basePrice: 180 },
  { name: 'Toilet Paper', unit: 'piece', category: 'household', basePrice: 50 },
  { name: 'Garbage Bags', unit: 'box', category: 'household', basePrice: 120 },
  { name: 'Floor Cleaner', unit: 'liter', category: 'household', basePrice: 200 },
  
  // Personal Care
  { name: 'Shampoo', unit: 'ml', category: 'personal_care', basePrice: 400 },
  { name: 'Toothpaste', unit: 'piece', category: 'personal_care', basePrice: 150 },
  { name: 'Soap Bar', unit: 'piece', category: 'personal_care', basePrice: 80 },
  { name: 'Face Wash', unit: 'ml', category: 'personal_care', basePrice: 300 },
  { name: 'Hand Sanitizer', unit: 'ml', category: 'personal_care', basePrice: 120 }
];

const SUPPLIERS = [
  'Local Wholesale Market',
  'City Trading Co',
  'Metro Suppliers',
  'Quality Distributors',
  'Express Trading'
];

const BRANDS = ['Premium', 'Quality', 'Super', 'Gold', 'Standard'];
const SIZES = ['Small', 'Medium', 'Large', '500g', '1kg', '2L', '250ml'];

// Utility functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateVariation(template, index) {
  const brand = getRandomElement(BRANDS);
  const size = getRandomElement(SIZES);
  const variation = getRandomNumber(1, 4);
  
  let name;
  switch (variation) {
    case 1: name = `${template.name} #${index}`; break;
    case 2: name = `${brand} ${template.name} #${index}`; break;
    case 3: name = `${template.name} ${size} #${index}`; break;
    case 4: name = `${brand} ${template.name} ${size} #${index}`; break;
  }
  
  const priceVariation = 0.8 + (Math.random() * 0.4); // 80% to 120% of base price
  const purchasePrice = (template.basePrice * priceVariation).toFixed(2);
  const salePrice = (parseFloat(purchasePrice) * (1.1 + Math.random() * 0.4)).toFixed(2); // 10-50% markup
  
  return {
    name: name,
    unit: template.unit,
    quantity: getRandomNumber(20, 200),
    price: purchasePrice,
    sale_price: salePrice,
    description: `${template.category} - ${name}`,
    low_stock_threshold: getRandomNumber(5, 15)
  };
}

class LocalBulkTestClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.suppliers = new Map();
    this.stats = {
      suppliersCreated: 0,
      productsCreated: 0,
      errors: 0,
      startTime: null,
      endTime: null
    };
  }

  async checkConnection() {
    try {
      console.log('🔍 Checking connection to local backend...');
      const response = await fetch(`${this.baseUrl}/suppliers/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('✅ Connected to local backend successfully!');
        return true;
      } else {
        console.log(`❌ Backend responded with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Cannot connect to local backend: ${error.message}`);
      console.log('💡 Make sure your Django server is running with: python manage.py runserver');
      return false;
    }
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
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMessage = errorData.detail;
          else if (errorData.error) errorMessage = errorData.error;
        } catch {}
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (response.status === 204 || !contentType?.includes('application/json')) {
        return null;
      }

      return await response.json();
    } catch (error) {
      throw new Error(`${endpoint}: ${error.message}`);
    }
  }

  async getOrCreateSupplier(supplierName) {
    if (this.suppliers.has(supplierName)) {
      return this.suppliers.get(supplierName);
    }

    try {
      const supplier = await this.request('/suppliers/', {
        method: 'POST',
        body: JSON.stringify({
          name: supplierName,
          contact_person: `Manager ${supplierName}`,
          email: `${supplierName.toLowerCase().replace(/\s+/g, '')}@local.com`,
          phone: `+92-300-${getRandomNumber(1000000, 9999999)}`,
          address: `${getRandomNumber(1, 999)} ${supplierName} Street, Local City`
        }),
      });
      
      this.suppliers.set(supplierName, supplier);
      this.stats.suppliersCreated++;
      return supplier;
    } catch (error) {
      console.error(`Failed to create supplier ${supplierName}: ${error.message}`);
      this.stats.errors++;
      return null;
    }
  }

  async createProduct(productData, supplierName) {
    try {
      const supplier = await this.getOrCreateSupplier(supplierName);
      if (!supplier) return null;

      const product = await this.request('/products/', {
        method: 'POST',
        body: JSON.stringify({
          ...productData,
          supplier: supplier.id
        }),
      });
      
      this.stats.productsCreated++;
      return product;
    } catch (error) {
      console.error(`Failed to create product ${productData.name}: ${error.message}`);
      this.stats.errors++;
      return null;
    }
  }

  async bulkCreateProducts(count = 1000) {
    console.log(`\n🚀 Starting LOCAL bulk product creation: ${count} products`);
    console.log(`📡 API Endpoint: ${this.baseUrl}`);
    
    // Check connection first
    const connected = await this.checkConnection();
    if (!connected) {
      console.log('\n❌ Cannot proceed without backend connection');
      return;
    }
    
    this.stats.startTime = Date.now();
    
    const batchSize = 25; // Smaller batches for local testing
    const totalBatches = Math.ceil(count / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const currentBatchSize = batchEnd - batchStart;
      
      console.log(`\n📦 Batch ${batch + 1}/${totalBatches} (${currentBatchSize} products)`);
      
      const promises = [];
      
      for (let i = batchStart; i < batchEnd; i++) {
        const template = getRandomElement(PRODUCT_TEMPLATES);
        const productData = generateVariation(template, i + 1);
        const supplierName = getRandomElement(SUPPLIERS);
        
        promises.push(this.createProduct(productData, supplierName));
      }
      
      await Promise.allSettled(promises);
      
      const progress = ((batchEnd / count) * 100).toFixed(1);
      const successRate = this.stats.productsCreated > 0 ? 
        ((this.stats.productsCreated / (this.stats.productsCreated + this.stats.errors)) * 100).toFixed(1) : 0;
      
      console.log(`✅ Batch ${batch + 1} completed. Progress: ${progress}% | Success: ${successRate}% | Created: ${this.stats.productsCreated}/${count}`);
      
      // Small delay between batches
      if (batch < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    this.stats.endTime = Date.now();
    this.printFinalStats();
  }

  printFinalStats() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    const productsPerSecond = (this.stats.productsCreated / duration).toFixed(2);
    const successRate = this.stats.productsCreated > 0 ? 
      ((this.stats.productsCreated / (this.stats.productsCreated + this.stats.errors)) * 100).toFixed(1) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 LOCAL BULK TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`🏪 Suppliers: ${this.stats.suppliersCreated} created`);
    console.log(`📦 Products: ${this.stats.productsCreated} created`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`⚡ Speed: ${productsPerSecond} products/second`);
    console.log(`🎯 Success Rate: ${successRate}%`);
    console.log('='.repeat(60));
    
    if (this.stats.errors === 0) {
      console.log('🎉 Perfect! All products created successfully!');
    } else if (this.stats.productsCreated > 0) {
      console.log('✅ Test completed with some errors (check logs above)');
    } else {
      console.log('❌ Test failed - no products were created');
    }
    
    console.log(`\n💡 Your local system handled ${this.stats.productsCreated} products at ${productsPerSecond} products/second`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const productCount = args[0] ? parseInt(args[0]) : 1000;
  
  if (isNaN(productCount) || productCount <= 0) {
    console.error('❌ Please provide a valid number of products to create.');
    console.log('Usage: node local-bulk-test.js [number_of_products]');
    console.log('Example: node local-bulk-test.js 500');
    process.exit(1);
  }

  console.log('🧪 LOCAL SYSTEM EFFICIENCY TEST');
  console.log('===============================');
  console.log(`🎯 Target: ${productCount} products`);
  console.log(`🌐 Backend: ${API_BASE_URL}`);
  
  const client = new LocalBulkTestClient();
  
  try {
    await client.bulkCreateProducts(productCount);
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Test interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}