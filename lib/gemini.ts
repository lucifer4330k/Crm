import { GoogleGenerativeAI } from '@google/generative-ai';
import { CRMRecord, SkippedRecord } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const CRM_SCHEMA_DESCRIPTION = `
You are a data extraction assistant. Your job is to map raw CSV records to a structured CRM schema.

CRM Schema fields:
- created_at: Date/time string (ISO format preferred). Extract from any date/timestamp fields.
- name: Full name of the lead/contact.
- email: Email address.
- country_code: Phone country code (e.g., "+91", "91", "+1"). Just the code, no spaces.
- mobile_without_country_code: Phone number without country code (digits only, no spaces or dashes).
- company: Company or organization name.
- city: City name.
- state: State or province.
- country: Country name.
- lead_owner: Name of the person who owns this lead (sales rep).
- crm_status: MUST be one of: "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE", or "" (empty string).
  Map intelligently: "interested"/"hot" → GOOD_LEAD_FOLLOW_UP, "not reachable"/"no answer" → DID_NOT_CONNECT, "not interested"/"invalid" → BAD_LEAD, "sold"/"closed"/"won" → SALE_DONE.
- crm_note: Any notes, comments, or remarks about the lead.
- data_source: MUST be one of: "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots", or "" (empty string).
  Try to match from source/project/property fields in the data.
- possession_time: When possession is expected (e.g., "Q1 2025", "Immediate", "2-3 years").
- description: Any additional description, requirements, or budget info.

Rules:
1. If a record has NO email AND NO mobile number, mark it as SKIP with reason "Missing contact info".
2. For missing fields, use empty string "".
3. Never invent data that isn't in the source record.
4. Return a JSON object with two arrays: "records" (successfully mapped) and "skipped" (with originalData and reason).
`;

export interface GeminiProcessResult {
  records: CRMRecord[];
  skipped: SkippedRecord[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function processBatchWithGemini(
  batch: Record<string, string>[],
  retries = 3
): Promise<GeminiProcessResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `${CRM_SCHEMA_DESCRIPTION}

Here are the raw CSV records to process (${batch.length} records):

${JSON.stringify(batch, null, 2)}

Return ONLY a valid JSON object in this exact format, no markdown, no explanation:
{
  "records": [...array of CRMRecord objects...],
  "skipped": [...array of {originalData: {...}, reason: "..."} objects...]
}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Strip markdown code fences if present
      const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

      const parsed = JSON.parse(cleaned);
      return {
        records: parsed.records || [],
        skipped: parsed.skipped || [],
      };
    } catch (err) {
      console.error(`Gemini batch attempt ${attempt} failed:`, err);
      if (attempt < retries) {
        await sleep(1000 * attempt); // exponential backoff
      } else {
        // On final failure, mark all records as skipped
        return {
          records: [],
          skipped: batch.map(row => ({
            originalData: row,
            reason: 'AI processing failed after retries',
          })),
        };
      }
    }
  }

  return { records: [], skipped: [] };
}
