// ============================================
// Domain Types — TerraWorld
// ============================================

// --- User ---
export interface User {
  id: number
  email: string
  nickname: string
  role: 'USER' | 'ADMIN'
  level: number
  totalExp: number
  basicCoin: number
  createdAt: string
}

// --- Category ---
export interface Category {
  id: number
  name: string
  iconUrl: string
  color: string
  tokenName: string
  baseCoinReward: number
  baseTokenReward: number
  dailyLimit: number
}

// --- Activity Record ---
export interface ActivityRecord {
  id: number
  userId: number
  categoryId: number
  memo: string
  recordedDate: string
  createdAt: string
}

export interface CreateRecordPayload {
  categoryId: number
  memo?: string
  recordedDate: string
}

export interface RecordStats {
  totalRecords: number
  streakDays: number
  categoryBreakdown: { categoryId: number; count: number }[]
}

// --- Wallet ---
export interface WalletInfo {
  basicCoin: number
  tokens: CategoryToken[]
}

export interface CategoryToken {
  categoryId: number
  categoryName: string
  amount: number
}

export interface WalletTransaction {
  id: number
  currencyType: 'BASIC_COIN' | 'CATEGORY_TOKEN'
  categoryId: number | null
  amount: number
  balanceAfter: number
  reason: 'RECORD_REWARD' | 'PURCHASE' | 'EXCHANGE' | 'LEVEL_UP'
  createdAt: string
}

export interface ExchangeTokenPayload {
  fromCategoryId: number
  toCategoryId: number
  amount: number
}

// --- Item ---
export interface Item {
  id: number
  name: string
  description: string
  categoryId: number | null
  priceType: 'BASIC_COIN' | 'CATEGORY_TOKEN'
  priceAmount: number
  rarity: 'COMMON' | 'RARE' | 'EPIC'
  assetUrl: string
  width: number
  height: number
}

export interface UserItem {
  id: number
  itemId: number
  quantity: number
  acquiredAt: string
  item: Item
}

export interface PurchasePayload {
  itemId: number
  idempotencyKey: string
}

// --- Terrarium ---
export interface TerrariumItem {
  id: number
  itemId: number
  posX: number
  posY: number
  rotation: number
  scale: number
  zIndex: number
  placedAt: string
}

export interface Terrarium {
  id: number
  backgroundId: number
  items: TerrariumItem[]
}

export interface PlaceItemPayload {
  itemId: number
  posX: number
  posY: number
  rotation?: number
  scale?: number
}

export interface TerrariumBackground {
  id: number
  name: string
  assetUrl: string
  unlockCondition: 'DEFAULT' | 'LEVEL' | 'PURCHASE'
  unlockValue: number
}

// --- Level ---
export interface LevelConfig {
  level: number
  requiredExp: number
  rewardType: string | null
  rewardValue: number | null
  maxItems: number
}

// --- Share ---
export interface ShareInfo {
  shareCode: string
  terrariumId: number
  createdAt: string
}
