/**
 * ARG Builder Pricing Products
 *
 * Hybrid pricing model:
 * - Starter: Flat $299/month (up to 25 users) — PLG self-serve entry
 * - Professional: $15/user/month (25-user minimum) — mid-market per-seat scaling
 * - Enterprise: Custom (starting $2,500/month) — sales-led, large orgs
 *
 * Annual discount: 20% off (Starter $239/mo, Professional $12/user/mo)
 *
 * Competitive positioning:
 * - 40% below Guru ($25/seat)
 * - More value than Trainual ($249/mo for 10 seats)
 * - AI features included (Confluence/Notion charge extra)
 */

export interface ProductTier {
  id: string;
  name: string;
  description: string;
  pricingModel: "flat" | "per_seat" | "custom";
  monthlyPrice: number; // in cents (flat price or per-seat price)
  annualPrice: number; // in cents (per month equivalent, billed annually)
  includedSeats: number; // seats included in the base price
  minSeats: number; // minimum seats required
  features: string[];
  targetTeamSize: string;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
}

export const PRODUCTS: Record<string, ProductTier> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "For small teams and departments getting organized",
    pricingModel: "flat",
    monthlyPrice: 29900, // $299/month flat
    annualPrice: 23900, // $239/month billed annually (20% off)
    includedSeats: 25,
    minSeats: 1,
    features: [
      "Up to 25 users",
      "AI-powered document generation",
      "Full-text search with relevance scoring",
      "Basic analytics dashboard",
      "3 custom workflows",
      "Knowledge graph (read-only)",
      "Email support",
      "14-day free trial",
    ],
    targetTeamSize: "1–25 employees",
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL || null,
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "For growing mid-market operations teams",
    pricingModel: "per_seat",
    monthlyPrice: 1500, // $15/user/month
    annualPrice: 1200, // $12/user/month billed annually (20% off)
    includedSeats: 25,
    minSeats: 25,
    features: [
      "Unlimited users (25 minimum)",
      "Everything in Starter",
      "Interactive knowledge graph",
      "Duplicate content detection",
      "Approval workflows",
      "Advanced analytics & reporting",
      "SSO / SAML integration",
      "Custom branding",
      "Priority support",
      "Dedicated CSM (100+ seats)",
    ],
    targetTeamSize: "25–500 employees",
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL || null,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations requiring full operational intelligence",
    pricingModel: "custom",
    monthlyPrice: 250000, // Starting at $2,500/month (display only)
    annualPrice: 250000, // Custom — negotiated
    includedSeats: 0, // Unlimited
    minSeats: 100,
    features: [
      "Unlimited users",
      "Everything in Professional",
      "Custom AI model training",
      "On-premise deployment option",
      "Custom integrations & API access",
      "Compliance reporting (SOC 2, HIPAA)",
      "Multi-workspace support",
      "24/7 white-glove support",
      "Quarterly business reviews",
      "Dedicated implementation team",
    ],
    targetTeamSize: "500+ employees",
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || null,
  },
};

export const IMPLEMENTATION_FEES = {
  standard: {
    name: "Standard Implementation",
    price: 500000, // $5,000 one-time
    description:
      "AI-powered operational audit, system configuration, and team onboarding (1–2 weeks)",
    stripePriceId: process.env.STRIPE_PRICE_IMPL_STANDARD || null,
  },
  custom: {
    name: "Custom Implementation",
    price: 1500000, // $15,000–$50,000 (starting price)
    description:
      "Multi-department deployment with custom integrations, data migration, and dedicated project manager",
    stripePriceId: process.env.STRIPE_PRICE_IMPL_CUSTOM || null,
  },
};

/**
 * Get a product tier by ID
 */
export function getProduct(tierId: string): ProductTier | undefined {
  return PRODUCTS[tierId];
}

/**
 * Get all product tiers as an array
 */
export function getAllProducts(): ProductTier[] {
  return Object.values(PRODUCTS);
}

/**
 * Calculate monthly cost for a given tier and seat count
 */
export function calculateMonthlyCost(
  tierId: string,
  seats: number,
  annual: boolean = false
): number | null {
  const product = PRODUCTS[tierId];
  if (!product) return null;

  const price = annual ? product.annualPrice : product.monthlyPrice;

  switch (product.pricingModel) {
    case "flat":
      return price;
    case "per_seat":
      const effectiveSeats = Math.max(seats, product.minSeats);
      return price * effectiveSeats;
    case "custom":
      return null; // Contact sales
  }
}
