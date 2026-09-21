export type StockIssueCode =
  | "INACTIVE_PRODUCT"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK";

export type StockValidationIssue = {
  code: StockIssueCode;
  itemId?: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  message: string;
};

export type StockValidationItem = {
  id?: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    stock: number;
    active: boolean;
  };
};

function getStockIssueMessage({
  code,
  productName,
  requestedQuantity,
  availableQuantity,
}: {
  code: StockIssueCode;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
}) {
  if (code === "INACTIVE_PRODUCT") {
    return `${productName} nao esta disponivel para venda.`;
  }

  if (code === "OUT_OF_STOCK") {
    return `${productName} esta sem estoque.`;
  }

  return `Desse produto temos somente ${availableQuantity} unidade${
    availableQuantity === 1 ? "" : "s"
  } no estoque: ${productName}.`;
}

export function getStockValidationIssue(
  item: StockValidationItem,
): StockValidationIssue | null {
  const requestedQuantity = Math.max(item.quantity, 0);
  const availableQuantity = Math.max(item.product.stock, 0);
  let code: StockIssueCode | null = null;

  if (!item.product.active) {
    code = "INACTIVE_PRODUCT";
  } else if (availableQuantity < 1 && requestedQuantity > 0) {
    code = "OUT_OF_STOCK";
  } else if (requestedQuantity > availableQuantity) {
    code = "INSUFFICIENT_STOCK";
  }

  if (!code) {
    return null;
  }

  return {
    code,
    itemId: item.id,
    productId: item.product.id,
    productName: item.product.name,
    requestedQuantity,
    availableQuantity,
    message: getStockIssueMessage({
      code,
      productName: item.product.name,
      requestedQuantity,
      availableQuantity,
    }),
  };
}

export function validateCartStock(items: StockValidationItem[]) {
  const issues = items
    .map((item) => getStockValidationIssue(item))
    .filter((issue): issue is StockValidationIssue => issue !== null);

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function assertStockAvailability(item: StockValidationItem) {
  const issue = getStockValidationIssue(item);

  if (issue) {
    throw new Error(issue.message);
  }
}
