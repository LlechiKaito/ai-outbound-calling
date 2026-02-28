export class Lead {
  constructor(
    readonly rowIndex: number,
    readonly companyName: string,
    readonly contactName: string,
    readonly phoneNumber: string,
    readonly email: string,
    readonly status: string,
    readonly retryCount: number,
  ) {}

  isPending(): boolean {
    return this.status === "" || this.status === "未対応";
  }

  canRetry(maxRetries: number): boolean {
    return this.retryCount < maxRetries;
  }

  isCallable(maxRetries: number): boolean {
    return this.isPending() && this.canRetry(maxRetries);
  }
}
