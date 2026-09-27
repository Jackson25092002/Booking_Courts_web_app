import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentFeedback } from "./payment-feedback";

test("insufficient funds and locked card display explicit reasons", () => {
  assert.match(getPaymentFeedback("FAILED", "51").title, /không đủ số dư/);
  assert.match(getPaymentFeedback("FAILED", "12").title, /bị khóa/);
  assert.equal(getPaymentFeedback("FAILED", "51").canRetry, true);
});
test("generic bank errors include activation and expiration guidance without asserting a cause", () => {
  for (const code of ["99", "unknown", null]) {
    const feedback = getPaymentFeedback("FAILED", code);
    assert.match(feedback.message, /chưa cung cấp mã nguyên nhân cụ thể/);
    assert.match(feedback.advice, /chưa kích hoạt/);
    assert.match(feedback.advice, /thẻ hết hạn/);
  }
});
test("timeout is not card expiration and Internet Banking is not card activation", () => {
  assert.match(getPaymentFeedback("FAILED", "11").title, /thời gian thanh toán/);
  assert.match(getPaymentFeedback("FAILED", "09").title, /Internet Banking/);
});
test("waiting and suspected debited transactions must not encourage retry", () => {
  assert.equal(getPaymentFeedback("WAITING", "51").canRetry, false);
  assert.equal(getPaymentFeedback("FAILED", "07").canRetry, false);
  assert.equal(getPaymentFeedback("SUCCEEDED", "00").canRetry, false);
});
