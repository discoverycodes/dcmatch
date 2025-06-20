import fetch from 'node-fetch';

async function testPlisio() {
  const apiKey = 'H6CuCwgRl1mp38gc2OSFz9RGe-rAVgWLnSHl0-uqRkhdhLDT5pyvqQf-D-TVRH_W';
  
  try {
    // Test 1: Get supported currencies
    console.log('Testing currencies endpoint...');
    const currenciesResponse = await fetch(`https://plisio.net/api/v1/currencies?api_key=${apiKey}`);
    const currenciesData = await currenciesResponse.json();
    console.log('Currencies result:', JSON.stringify(currenciesData, null, 2));
    
    // Test 2: Try creating invoice with BTC (commonly supported)
    console.log('\nTesting invoice creation with BTC...');
    const invoiceParams = new URLSearchParams({
      api_key: apiKey,
      currency: 'BTC',
      amount: '10',
      order_name: 'Test Order',
      order_number: 'test_123',
      plugin: 'memory-casino',
      version: '1.0'
    });
    
    const invoiceResponse = await fetch(`https://plisio.net/api/v1/invoices/new?${invoiceParams.toString()}`);
    const invoiceData = await invoiceResponse.json();
    console.log('Invoice result:', JSON.stringify(invoiceData, null, 2));
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testPlisio();