const crypto = require('crypto');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'API-nycklar saknas i Vercel-miljövariablerna' });
  }

  // Lägg till recvWindow för att undvika tidsdifferensfel mot Binance Testnet
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}&recvWindow=60000`;
  
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');

  try {
    const binanceUrl = `https://testnet.binance.vision/api/v3/account?${queryString}&signature=${signature}`;
    
    const response = await fetch(binanceUrl, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Binance fel svar:", data);
      return res.status(response.status).json(data);
    }

    const usdtAsset = data.balances ? data.balances.find(b => b.asset === 'USDT') : null;
    const totalBalance = usdtAsset ? parseFloat(usdtAsset.free) + parseFloat(usdtAsset.locked) : 10000;

    return res.status(200).json({ totalBalance, raw: data.balances });
  } catch (error) {
    console.error("Serverless catch fel:", error);
    return res.status(500).json({ error: error.message });
  }
}
