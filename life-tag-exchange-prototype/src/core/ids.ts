export function createInstanceId(prefix: string, counter: number): string {
  return `${prefix}_${counter}`;
}

export function createProductInstanceId(counter: number): string {
  return createInstanceId('prod', counter);
}

export function createCustomerOrderId(counter: number): string {
  return createInstanceId('order', counter);
}
