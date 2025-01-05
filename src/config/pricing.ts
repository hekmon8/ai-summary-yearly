export interface PricingTier {
  id: 'free' | 'basic' | 'plus'  // Used as i18n key
  price: number // in cents
  credits: number
  summariesCount: number
  isPopular?: boolean
  isComingSoon?: boolean
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    price: 0,
    credits: 30,
    summariesCount: 2,
  },
  {
    id: 'basic',
    price: 299, // $2.99
    credits: 25,
    summariesCount: 5,
    isComingSoon: true,
  },
  {
    id: 'plus',
    price: 999, // $9.99
    credits: 100,
    summariesCount: 20,
    isComingSoon: true,
  },
]

export interface StylePrice {
  id: 'sarcasm' | 'praise'  // Used as i18n key in styles.*
  price: number // in cents
  credits: number
}

export const STYLE_PRICES: StylePrice[] = [
  {
    id: 'sarcasm',
    price: 0,
    credits: 5,
  },
  {
    id: 'praise',
    price: 0,
    credits: 8,
  }
]

export type StyleType = StylePrice['id'] 