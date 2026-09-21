import {
  emptyCheckoutAddressValues,
  type CheckoutAddressValues,
  type CheckoutAddressErrors,
} from "@/lib/address";

export type CheckoutAddressState = {
  status: "idle" | "success" | "error";
  message: string;
  errors: CheckoutAddressErrors;
  values: CheckoutAddressValues;
};

export const initialCheckoutAddressState: CheckoutAddressState = {
  status: "idle",
  message: "",
  errors: {},
  values: emptyCheckoutAddressValues,
};
