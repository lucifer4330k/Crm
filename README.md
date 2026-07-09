# GrowEasy CRM CSV Uploader

An AI-powered CSV-to-CRM converter built for [GrowEasy.ai](https://groweasy.ai). Upload any CSV with lead data and let Google Gemini intelligently extract and map it to the GrowEasy CRM schema.

## Features

- 📤 **Drag & Drop CSV Upload** – Supports any CSV format, auto-detects headers
- 🤖 **AI Field Extraction** – Google Gemini maps arbitrary columns to the CRM schema
- 📊 **Live Preview** – See your data before processing
- ⚡ **Real-time Progress** – Batch-by-batch progress with live logs
- 🔁 **Retry Logic** – Automatically retries failed AI batches (3 attempts)
- ✅ **Smart Skipping** – Records missing both email and mobile are auto-skipped
- 📥 **Download Results** – Export successfully mapped records as CSV
- 🌙 **Dark Mode UI** – Premium glassmorphism design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Vanilla CSS |
| AI | Google Gemini 1.5 Flash |
| CSV Parsing | PapaParse |

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd groweasy2
npm install
```

### 2. Set Up Gemini API Key

Get a **free** API key from [Google AI Studio](https://aistudio.google.com/app/apikey) (no credit card required).

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## CRM Schema

The AI maps input data to these fields:

| Field | Type | Notes |
|-------|------|-------|
| `created_at` | string | ISO date format |
| `name` | string | Full name |
| `email` | string | Email address |
| `country_code` | string | e.g., `+91` |
| `mobile_without_country_code` | string | Digits only |
| `company` | string | Company/organization |
| `city` | string | City |
| `state` | string | State/province |
| `country` | string | Country |
| `lead_owner` | string | Sales rep name |
| `crm_status` | enum | `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE` |
| `crm_note` | string | Notes/remarks |
| `data_source` | enum | `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots` |
| `possession_time` | string | Expected possession date |
| `description` | string | Additional info |

## Skip Rules

Records are automatically skipped if they have **no email AND no mobile number**.

## Project Structure

```
groweasy2/
├── app/
│   ├── page.tsx                  # Main 4-step wizard
│   ├── layout.tsx                # Root layout + metadata
│   ├── globals.css               # Design system
│   └── api/process-csv/route.ts  # AI processing API
├── components/
│   ├── FileUpload.tsx            # Drag & drop uploader
│   ├── CSVPreview.tsx            # Data preview table
│   └── ResultsTable.tsx          # Results with tabs
├── lib/
│   ├── types.ts                  # TypeScript interfaces
│   └── gemini.ts                 # Gemini AI client
└── .env.local                    # API keys (not committed)
```

## Deployment

Deploy to Vercel in one click:

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Add `GEMINI_API_KEY` in Vercel Environment Variables
4. Deploy!

## License

Built as an assignment for GrowEasy.ai.
