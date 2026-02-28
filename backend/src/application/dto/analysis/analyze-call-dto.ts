export interface AnalyzeCallRequestDto {
  readonly transcript: string;
}

export interface AnalyzeCallResponseDto {
  readonly interestLevel: number;
  readonly summary: string;
  readonly nextAction: string;
}
