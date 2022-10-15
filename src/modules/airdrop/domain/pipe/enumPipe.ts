import { ArgumentMetadata, HttpStatus, Injectable, Optional, PipeTransform } from "@nestjs/common";
import { ErrorHttpStatusCode, HttpErrorByCode } from "@nestjs/common/utils/http-error-by-code.util";

export interface EnumPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;
}

/**
 * Defines the Enum Pipe
 * @publicApi
 */
@Injectable()
export class EnumPipe<T = any> implements PipeTransform<T> {
  protected exceptionFactory: (error: string) => any;

  constructor(
    protected readonly enumType: T,
    @Optional() options?: EnumPipeOptions,
  ) {
    if (!enumType) {
      throw new Error(
        `"ParseEnumPipe" requires "enumType" argument specified (to validate input values).`,
      );
    }
    options = options || {};
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } =
      options;

    this.exceptionFactory =
      exceptionFactory ||
      (error => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  /**
   * Method that accesses and performs optional transformation on argument for
   * in-flight requests.
   *
   * @param value currently processed route argument
   * @param metadata contains metadata about the currently processed route argument
   */
  async transform(value: T, metadata: ArgumentMetadata): Promise<T | null> {
    if (value && !this.isEnum(value)) {
      throw this.exceptionFactory(
        'Validation failed (enum string is expected)',
      );
    } else if(!value) {
      return null
    }
    return value;
  }

  protected isEnum(value: T): boolean {
    const enumValues = Object.keys(this.enumType).map(
      item => this.enumType[item],
    );
    return enumValues.includes(value);
  }
}