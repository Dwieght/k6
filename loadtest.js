import http from "k6/http";
import { sleep, check } from "k6";

// 🔹 Load Test Options
export let options = {
  stages: [
    { duration: "30s", target: 10 }, // ramp up to 10 users
    { duration: "1m", target: 10 }, // hold 10 users
    { duration: "30s", target: 0 }, // ramp down
  ],
};

export default function () {
  // 🔹 Use token from environment
  const token = __ENV.API_TOKEN;

  if (!token) {
    throw new Error("⚠️ API_TOKEN environment variable is not set!");
  }

  // 1. Fetch product list
  let productRes = http.get("https://api.yourapp.com/products", {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(productRes, {
    "products loaded": (r) => r.status === 200,
  });

  // Pick one product ID (simplified)
  let productId = productRes.json()[0]?.id;

  sleep(1);

  // 2. Add to cart
  let cartRes = http.post(
    "https://api.yourapp.com/cart",
    JSON.stringify({ productId, quantity: 1 }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  check(cartRes, {
    "added to cart": (r) => r.status === 200,
  });

  sleep(1);

  // 3. Checkout
  let checkoutRes = http.post(
    "https://api.yourapp.com/checkout",
    JSON.stringify({ payment: "credit_card" }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  check(checkoutRes, {
    "checkout success": (r) => r.status === 200,
  });

  sleep(1);
}
