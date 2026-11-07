# Utensil Stock Ledger

A front-end-only UI for tracking bulk purchases of plastic utensils and their retail selling prices.
Built with React (Vite) and Tailwind CSS. Data lives in memory for now, so a refresh resets it to the sample data.

## Run it

1. Install Node.js 18 or newer from https://nodejs.org
2. In this folder run:

    npm install
    npm run dev

3. Open the address shown in the terminal (usually http://localhost:5173).

## Where things are

- `src/App.jsx` holds the whole UI and the sample data (the `SEED` list at the top).
- `tailwind.config.js` holds the colours.

## Next steps (not built yet)

- Save data permanently (a backend or a database)
- Record sales against each purchase
- Edit and delete purchases
