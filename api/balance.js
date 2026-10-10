const crypto = require('crypto');

export default async function handler(req, res) {
  // Tillåt anrop från din hemsida
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'API-nycklar saknas i Vercel-miljövariablerna' });
  }

  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');

  try {
    const response = await fetch(`https://testnet.binance.vision/api/v3/account?${queryString}&signature=${signature}`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Filtrera ut t.ex. USDT eller skicka hela saldot
    const usdtAsset = data.balances.find(b => b.asset === 'USDT');
    const totalBalance = usdtAsset ? parseFloat(usdtAsset.free) + parseFloat(usdtAsset.locked) : 0;

    return res.status(200).json({ totalBalance, raw: data.balances });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
