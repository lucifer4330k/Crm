import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import { CRMRecord, SkippedRecord, CRMRecordSchema } from './types';

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
  If ambiguous and not clearly matching, leave blank ("").
- crm_note: Any notes, comments, or remarks about the lead.
- data_source: MUST be one of: "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots", or "" (empty string).
  Try to match from source/project/property fields in the data. If ambiguous, leave blank ("").
- possession_time: When possession is expected (e.g., "Q1 2025", "Immediate", "2-3 years").
- description: Any additional description, requirements, or budget info.

Critical Rules:
1. You MUST return exactly one mapped record for EVERY input record in the batch. Do not skip or drop any records, even if they are missing data. Our system will handle skipping them later.
2. Multi-Email / Multi-Phone Rule: If a record contains MULTIPLE emails or MULTIPLE phones, put ONLY the first one in the primary \`email\` or \`mobile_without_country_code\` fields. You MUST append all additional emails and phones to the \`crm_note\` field.
   Example: If input has "john@a.com, john@b.com", email becomes "john@a.com", and crm_note gets "Additional emails: john@b.com".
3. For missing fields, use empty string "".
4. Never invent data that isn't in the source record.
`;

export interface GeminiProcessResult {
  records: CRMRecord[];
  skipped: SkippedRecord[];
}

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    records: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          email: { type: SchemaType.STRING },
          country_code: { type: SchemaType.STRING },
          mobile_without_country_code: { type: SchemaType.STRING },
          company: { type: SchemaType.STRING },
          city: { type: SchemaType.STRING },
          state: { type: SchemaType.STRING },
          country: { type: SchemaType.STRING },
          lead_owner: { type: SchemaType.STRING },
          crm_status: { type: SchemaType.STRING }, // Enums enforced via Zod post-processing
          crm_note: { type: SchemaType.STRING },
          data_source: { type: SchemaType.STRING },
          possession_time: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          created_at: { type: SchemaType.STRING },
        },
      },
    },
  },
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to extract multiple emails/phones and append to notes
function applyCodeLevelFallback(rawRow: Record<string, string>, mappedRecord: CRMRecord) {
  const rowString = JSON.stringify(rawRow).toLowerCase();
  
  // Extract all emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = Array.from(new Set(rowString.match(emailRegex) || []));
  
  // Basic phone regex (looking for 10+ digit sequences)
  const phoneRegex = /\b\d{10,14}\b/g;
  const phones = Array.from(new Set(rowString.match(phoneRegex) || []));

  let noteAdditions = [];

  if (emails.length > 1) {
    const extraEmails = emails.filter(e => e !== mappedRecord.email.toLowerCase());
    if (extraEmails.length > 0) {
      noteAdditions.push(`Extra emails: ${extraEmails.join(', ')}`);
    }
  }

  if (phones.length > 1) {
    const extraPhones = phones.filter(p => !mappedRecord.mobile_without_country_code.includes(p));
    if (extraPhones.length > 0) {
      noteAdditions.push(`Extra phones: ${extraPhones.join(', ')}`);
    }
  }

  if (noteAdditions.length > 0) {
    mappedRecord.crm_note = mappedRecord.crm_note 
      ? `${mappedRecord.crm_note} | ${noteAdditions.join(' | ')}`
      : noteAdditions.join(' | ');
  }
}

export async function processBatchWithGemini(
  batch: Record<string, string>[],
  retries = 3
): Promise<GeminiProcessResult> {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-flash-latest',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    }
  });

  const prompt = `${CRM_SCHEMA_DESCRIPTION}\n\nHere are the raw CSV records to process:\n\n${JSON.stringify(batch, null, 2)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const parsed = JSON.parse(text);
      const llmRecords = parsed.records || [];
      
      const finalRecords: CRMRecord[] = [];
      const finalSkipped: SkippedRecord[] = [];

      // Validate each record with Zod and apply code-level skip rules
      for (let i = 0; i < Math.min(batch.length, llmRecords.length); i++) {
        const rawRow = batch[i];
        let mapped = llmRecords[i];

        try {
          // Parse with Zod (will strip invalid enums to default '' if they fail strictly, but we need to handle it)
          // Since our Zod enum doesn't auto-fallback on failure, we parse safely:
          const zodResult = CRMRecordSchema.safeParse(mapped);
          
          if (!zodResult.success) {
            finalSkipped.push({ originalData: rawRow, reason: "Zod Schema Validation Failed" });
            continue;
          }

          const validRecord = zodResult.data;

          // Date Parse Check (ensure created_at is valid if provided)
          if (validRecord.created_at) {
            const d = new Date(validRecord.created_at);
            if (isNaN(d.getTime())) {
              validRecord.created_at = ''; // Strip bad date rather than fail
            }
          }

          // Code-level fallback for multiple emails/phones
          applyCodeLevelFallback(rawRow, validRecord);

          // Code-Level Skip Rule (Missing Contact Info)
          if (!validRecord.email && !validRecord.mobile_without_country_code) {
            finalSkipped.push({ originalData: rawRow, reason: "Missing contact info (No Email/Mobile)" });
            continue;
          }

          finalRecords.push(validRecord);
        } catch (e) {
          finalSkipped.push({ originalData: rawRow, reason: "Code-level validation error" });
        }
      }

      // If Gemini returned fewer records than the batch, mark remaining as skipped
      if (llmRecords.length < batch.length) {
        for (let i = llmRecords.length; i < batch.length; i++) {
          finalSkipped.push({ originalData: batch[i], reason: "AI silently dropped this record" });
        }
      }

      return { records: finalRecords, skipped: finalSkipped };

    } catch (err) {
      console.error(`Gemini batch attempt ${attempt} failed:`, err);
      if (attempt < retries) {
        await sleep(15000 * attempt);
      } else {
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
