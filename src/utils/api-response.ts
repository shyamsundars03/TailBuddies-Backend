export class ApiResponse<T> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly data?: T;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    if (data !== undefined) {
      this.data = data;
    }
  }

  static success<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(true, message, data);
  }

  static error<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(false, message, data);
  }
}
