export class Lead {
  constructor(
    readonly rowIndex: number,
    readonly companyName: string,
    readonly contactName: string,
    readonly phoneNumber: string,
    readonly email: string,
    readonly status: string,
    readonly retryCount: number,
    readonly lastCalledAt: string = "",
    readonly callResult: string = "",
    readonly interestLevel: string = "",
    readonly nextAction: string = "",
    readonly memo: string = "",
  ) {}

  isPending(): boolean {
    return this.status === "" || this.status === "未対応";
  }

  isFollowing(): boolean {
    return this.status === "フォロー中";
  }

  isCompleted(): boolean {
    return this.status === "対応済み";
  }

  canRetry(maxRetries: number): boolean {
    return this.retryCount < maxRetries;
  }

  isCallable(maxRetries: number): boolean {
    return (this.isPending() || this.isFollowing()) && this.canRetry(maxRetries);
  }
}
