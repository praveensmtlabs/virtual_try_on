/**
 * Future AI try-on service — stub only.
 * Implementations must call a backend; never embed provider API keys here.
 */
export interface AiTryOnRequest {
  photoUrl: string;
  garmentId: string;
  avatarId?: string;
}

export interface AiTryOnResult {
  jobId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  resultImageUrl?: string;
  error?: string;
}

export interface AiTryOnService {
  submit(request: AiTryOnRequest): Promise<AiTryOnResult>;
  getJob(jobId: string): Promise<AiTryOnResult>;
}
