/**
 * ARG Builder Pricing Products
 * 
 * These are the product definitions used for Stripe Checkout.
 * Price IDs will be created in Stripe Dashboard and referenced here.
 * Until real Stripe Price IDs are configured, these serve as the 
 * canonical product catalog for the application.
 */

export interface ProductTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number; // in cents
  annualPrice: number; // in cents (per month, billed annually)
  features: string[];
  targetTeamSize: string;
  stripePriceIdMonthly: string | null; // Set after creating in Stripe Dashboard
  stripePriceIdAnnual: string | null; // Set after creating in Stripe Dashboard
}

export const PRODUCTS: Record<string, ProductTier> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "For growing teams that need structured operational knowledge",
    monthlyPrice: 200000, // $2,000/month
    annualPrice: 170000, // $1,700/month billed annually (15% off)
    features: [
      "Up to 200 employees",
      "AI-powered document generation",
      "Knowledge graph visualization",
      "Full-text search with relevance scoring",
      "5 custom workflows",
      "Basic analytics dashboard",
      "Email support",
    ],
    targetTeamSize: "50–200 employees",
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL || null,
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "For scaling organizations with complex operational needs",
    monthlyPrice: 500000, // $5,000/month
    annualPrice: 425000, // $4,250/month billed annually (15% off)
    features: [
      "Up to 1,000 employees",
      "Everything in Starter",
      "Multi-workspace support",
      "Advanced AI summarization & translation",
      "Unlimited custom workflows",
      "Advanced analytics & reporting",
      "Priority support + dedicated CSM",
      "SSO / SAML integration",
    ],
    targetTeamSize: "200–1,000 employees",
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL || null,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations requiring full operational intelligence",
    monthlyPrice: 1000000, // $10,000/month
    annualPrice: 850000, // $8,500/month billed annually (15% off)
    features: [
      "Unlimited employees",
      "Everything in Professional",
      "Custom AI model training",
      "On-premise deployment option",
      "Custom integrations & API access",
      "Compliance reporting (SOC 2, HIPAA)",
      "24/7 white-glove support",
      "Quarterly business reviews",
    ],
    targetTeamSize: "1,000+ employees",
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || null,
  },
};

export const IMPLEMENTATION_FEES = {
  standard: {
    name: "Standard Implementation",
    price: 2500000, // $25,000 one-time
    description: "Full AI-powered operational audit and system build (12–19 hours delivery)",
    stripePriceId: process.env.STRIPE_PRICE_IMPL_STANDARD || null,
  },
  custom: {
    name: "Custom Implementation",
    price: 5000000, // $50,000–$100,000
    description: "Complex multi-department deployment with custom integrations",
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
