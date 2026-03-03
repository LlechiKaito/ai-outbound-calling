export interface SaveCallHistoryRequestDto {
  readonly companyName: string;
  readonly contactName: string;
  readonly phoneNumber: string;
  readonly email: string;
  readonly status: string;
  readonly callResult: string;
  readonly interestLevel: number;
  readonly nextAction: string;
  readonly memo: string;
  readonly retryCount: string;
}
