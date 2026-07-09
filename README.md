# GrowEasy CRM Uploader

An AI-powered CSV upload tool designed to intelligently map unstructured lead data to a strict CRM schema using Google's Gemini LLM.

## Design Decisions & Architectural Highlights

### 1. Robust AI Integration (100% Deterministic JSON)
Instead of relying on fragile prompt engineering and Markdown-fenced responses, this application leverages Gemini's native **Structured Outputs** (`responseMimeType: "application/json"` and `responseSchema`). This guarantees that the LLM's response always perfectly conforms to the required data shapes, eliminating parsing errors.

### 2. Multi-Layer Validation (Zod & Code-Level Fallbacks)
We employ a **Zero-Trust approach** towards the LLM:
- **Zod Validation**: Every record returned by Gemini is parsed against a strict Zod schema enforcing string types and enum validation for critical fields like `crm_status` and `data_source`.
- **Code-Level Fallbacks**: The business rule to skip records missing both email and phone numbers is enforced by our TypeScript backend code, not just by asking the AI nicely. This acts as a bulletproof safety net.
- **Multiple Email/Phone Handling**: The LLM is prompted to take the *first* email and phone number and put the rest in `crm_note`. As a secondary check, we run RegEx over the raw row in code; if extra emails/phones are found that the LLM missed, our code automatically appends them to the `crm_note`.

### 3. CSV Formula Injection Defense
During the CSV export phase (`ResultsTable.tsx`), any field beginning with `=`, `+`, `-`, or `@` is prepended with a single quote (`'`). This entirely neutralizes malicious spreadsheet formula execution vulnerabilities when the exported file is opened in Microsoft Excel.

### 4. Next.js App Router API Routes vs. Express Server
We explicitly opted against setting up an entirely separate Express.js backend repository. Using Next.js API Routes (`app/api/process-csv/route.ts`) provides a serverless, horizontally scalable backend within the same repo. This dramatically reduces DevOps overhead, CORS configuration complexity, and context switching, while still ensuring API keys are securely kept out of the browser.

### 5. Web Workers for PapaParse
For large spreadsheets, the UI remains perfectly fluid because `Papa.parse` is configured to run on a Web Worker (`worker: true`), moving CPU-intensive parsing off the main UI thread.

### 6. Batch Fetching vs. Streaming
We opted for chunked HTTP batch requests (processing 10 rows at a time) rather than an SSE (Server-Sent Events) stream. 
- **Reasoning**: While streaming looks flashy, dealing with incomplete JSON chunks mid-stream is highly volatile. By making discrete HTTP calls per batch, we ensure that every response is complete and valid JSON. If one batch fails due to network issues, we can independently retry that single HTTP request (which we do, up to 3 times) without breaking the entire stream.

---

## Messy CSV Stress Test Evidence

To prove the robustness of our rules, here is the result of passing an extremely messy test file:

**Input (`messy_leads.csv`)**
```csv
name,contact_info,project,date,notes,status
"Messy Bob","bob1@example.com, bob2@test.com / Ph: 9876543210, 1234567890","I saw meridian tower on FB","2026-99-99","=1+1 is a formula injection attempt","hot lead"
"Missing Info","no contact details provided","Eden Park phase 2","02/29/2025","should be skipped",""
"John Smith","john@gmail.com","varah swamy layout","Yesterday","Just one email, standard phone 555-1234","not reachable"
"Valid Sale","alice@corp.com +18005559999","Leads on Demand","2023-05-12T10:00:00Z","- starts with dash","won"
```

**Results:**
- **Messy Bob**: Processed. `email` -> `bob1@example.com`. `mobile` -> `9876543210`. `crm_note` -> `=1+1 is a formula injection attempt. | Extra emails: bob2@test.com | Extra phones: 1234567890`. `crm_status` -> `GOOD_LEAD_FOLLOW_UP`.
- **Missing Info**: Skipped cleanly by the code-level safety net (`Missing contact info (No Email/Mobile)`).
- **John Smith**: Processed. 
- **Valid Sale**: Processed. Note starts with dash, which is safely exported to CSV as `'- starts with dash`.

---

## Run Locally

```bash
npm install
npm run dev
```
