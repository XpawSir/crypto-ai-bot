// api/state.js – Vercel Serverless Function för persistens
let globalState = {
    balance: 10000.00,
    pnl: 0.00,
    totalTrades: 0,
    winningTrades: 0
};

export default function handler(req, res) {
    if (req.method === 'POST') {
        const { balance, pnl, totalTrades, winningTrades } = req.body;
        if (typeof balance === 'number') {
            globalState = { balance, pnl, totalTrades, winningTrades };
        }
        return res.status(200).json({ success: true, state: globalState });
    }
    return res.status(200).json(globalState);
}
