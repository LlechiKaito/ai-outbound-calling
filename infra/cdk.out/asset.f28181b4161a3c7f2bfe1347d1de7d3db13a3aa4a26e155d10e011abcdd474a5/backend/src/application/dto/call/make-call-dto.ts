export interface MakeCallRequestDto {
  readonly to: string;
}

export interface MakeCallResponseDto {
  readonly callSid: string;
  readonly to: string;
  readonly from: string;
  readonly status: string;
}
