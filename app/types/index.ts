// Category
export interface Category {
  id: number
  name: string
  iconUrl: string
  color: string
  tokenName: string
}

// Record
export interface ActivityRecord {
  id: number
  categoryId: number
  memo: string
  recordedDate: string
  createdAt: string
}

// Wallet
export interface WalletInfo {
  basicCoin: number
  tokens: CategoryToken[]
}

export interface CategoryToken {
  categoryId: number
  categoryName: string
  amount: number
}

// Item
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

// Terrarium
export interface TerrariumItem {
  id: number
  itemId: number
  posX: number
  posY: number
  rotation: number
  scale: number
  zIndex: number
}

export interface Terrarium {
  id: number
  backgroundId: number
  items: TerrariumItem[]
}
