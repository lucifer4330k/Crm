import { z } from 'zod';

export type AppStep = 'upload' | 'preview' | 'processing' | 'results';

export interface BatchProgress {
  batchNumber: number;
  totalBatches: number;
  processed: number;
  total: number;
}

export const CRMRecordSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  country_code: z.string().default(''),
  mobile_without_country_code: z.string().default(''),
  company: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  country: z.string().default(''),
  lead_owner: z.string().default(''),
  crm_status: z.enum(['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE', '']).default(''),
  crm_note: z.string().default(''),
  data_source: z.enum(['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots', '']).default(''),
  possession_time: z.string().default(''),
  description: z.string().default(''),
  created_at: z.string().default(''),
});

export type CRMRecord = z.infer<typeof CRMRecordSchema>;

export const SkippedRecordSchema = z.object({
  originalData: z.record(z.string(), z.string()),
  reason: z.string(),
});

export type SkippedRecord = z.infer<typeof SkippedRecordSchema>;

export const GeminiProcessResultSchema = z.object({
  records: z.array(CRMRecordSchema),
  skipped: z.array(SkippedRecordSchema),
});

export interface ProcessingResult {
  success: CRMRecord[];
  skipped: SkippedRecord[];
  totalProcessed: number;
}
