export interface SendFollowUpEmailDto {
  readonly to: string;
  readonly companyName: string;
  readonly contactName: string;
  readonly summary: string;
  readonly interestLevel: number;
}
