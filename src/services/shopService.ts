import prisma from '../db/client.js';
import { v4 as uuid } from 'uuid';
import { ShopItemResponse, Axis, CosmeticSlot, Currency } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function getShopItems(
  userId: string,
  axis?: string,
  slot?: string
): Promise<ShopItemResponse[]> {
  // 유저의 인벤토리와 장착 아이템 조회
  const [inventory, equipped] = await Promise.all([
    prisma.inventory.findMany({
      where: { userId },
      select: { shopItemId: true },
    }),
    prisma.equippedItem.findMany({
      where: { userId },
      select: { shopItemId: true },
    }),
  ]);

  const ownedIds = new Set(inventory.map((i) => i.shopItemId));
  const equippedIds = new Set(equipped.map((e) => e.shopItemId));

  // 상점 아이템 조회
  const whereClause: any = { active: true };
  if (axis && axis !== 'any') whereClause.axis = axis;
  if (slot && slot !== 'any') whereClause.slot = slot;

  const items = await prisma.shopItem.findMany({
    where: whereClause,
    orderBy: [{ rarity: 'desc' }, { priceAmount: 'asc' }],
  });

  return items.map((item) => ({
    id: item.id,
    axis: item.axis as Axis | null,
    slot: item.slot as CosmeticSlot,
    rarity: item.rarity as any,
    name: item.name,
    description: item.description,
    price_currency: item.priceCurrency as Currency,
    price_amount: item.priceAmount,
    owned: ownedIds.has(item.id),
    equipped: equippedIds.has(item.id),
  }));
}

export interface PurchaseResult {
  inventory_id: string;
  new_wallet: { gold: number; diamond: number };
}

export async function purchaseItem(
  userId: string,
  shopItemId: string,
  idempotencyKey?: string
): Promise<PurchaseResult> {
  // Idempotency 체크 (purchase_events 테이블 사용)
  if (idempotencyKey) {
    const existing = await prisma.purchaseEvent.findFirst({
      where: { userId, shopItemId, status: 'success' },
    });

    if (existing) {
      const wallet = await prisma.walletSnapshot.findUnique({ where: { userId } });
      const inv = await prisma.inventory.findUnique({
        where: { userId_shopItemId: { userId, shopItemId } },
      });

      return {
        inventory_id: inv?.id || '',
        new_wallet: {
          gold: Number(wallet?.gold || 0),
          diamond: Number(wallet?.diamond || 0),
        },
      };
    }
  }

  // 상품 확인
  const shopItem = await prisma.shopItem.findUnique({
    where: { id: shopItemId },
  });

  if (!shopItem || !shopItem.active) {
    throw createError('Item not found', 404, 'NOT_FOUND');
  }

  // 이미 보유 확인
  const existingOwnership = await prisma.inventory.findUnique({
    where: { userId_shopItemId: { userId, shopItemId } },
  });

  if (existingOwnership) {
    throw createError('Item already owned', 409, 'ALREADY_OWNED');
  }

  // 지갑 확인
  const wallet = await prisma.walletSnapshot.findUnique({ where: { userId } });
  const currentGold = Number(wallet?.gold || 0);
  const currentDiamond = Number(wallet?.diamond || 0);

  const price = shopItem.priceAmount;
  const currency = shopItem.priceCurrency;

  if (currency === 'gold' && currentGold < price) {
    throw createError('Insufficient gold', 400, 'INSUFFICIENT_FUNDS');
  }
  if (currency === 'diamond' && currentDiamond < price) {
    throw createError('Insufficient diamond', 400, 'INSUFFICIENT_FUNDS');
  }

  // 트랜잭션으로 구매 처리
  const result = await prisma.$transaction(async (tx) => {
    // 1. 지갑 차감
    const newGold = currency === 'gold' ? currentGold - price : currentGold;
    const newDiamond = currency === 'diamond' ? currentDiamond - price : currentDiamond;

    await tx.walletSnapshot.upsert({
      where: { userId },
      create: { userId, gold: BigInt(newGold), diamond: BigInt(newDiamond) },
      update: { gold: BigInt(newGold), diamond: BigInt(newDiamond), updatedAt: new Date() },
    });

    // 2. 인벤토리에 추가
    const inventoryItem = await tx.inventory.create({
      data: {
        id: uuid(),
        userId,
        shopItemId,
      },
    });

    // 3. PurchaseEvent 기록
    await tx.purchaseEvent.create({
      data: {
        id: uuid(),
        userId,
        shopItemId,
        currency: currency as any,
        amount: price,
        status: 'success',
      },
    });

    // 4. WalletLedger 기록
    await tx.walletLedger.create({
      data: {
        id: uuid(),
        userId,
        refType: 'purchase',
        refId: inventoryItem.id,
        currency: currency as any,
        delta: -price,
        balanceAfter: BigInt(currency === 'gold' ? newGold : newDiamond),
      },
    });

    return {
      inventoryItem,
      newWallet: { gold: newGold, diamond: newDiamond },
    };
  });

  return {
    inventory_id: result.inventoryItem.id,
    new_wallet: result.newWallet,
  };
}

export interface EquipResult {
  equipped_at: string;
  previous_item_id: string | null;
}

export async function equipItem(
  userId: string,
  shopItemId: string,
  slot: CosmeticSlot
): Promise<EquipResult> {
  // 아이템 보유 확인
  const inventory = await prisma.inventory.findUnique({
    where: { userId_shopItemId: { userId, shopItemId } },
    include: { shopItem: true },
  });

  if (!inventory) {
    throw createError('Item not owned', 400, 'NOT_OWNED');
  }

  // 슬롯 확인
  if (inventory.shopItem.slot !== slot) {
    throw createError('Item slot mismatch', 400, 'SLOT_MISMATCH');
  }

  // 기존 장착 아이템 확인
  const previousEquipped = await prisma.equippedItem.findUnique({
    where: { userId_slot: { userId, slot } },
  });

  // 장착 처리
  await prisma.equippedItem.upsert({
    where: { userId_slot: { userId, slot } },
    create: {
      userId,
      slot,
      shopItemId,
    },
    update: {
      shopItemId,
      equippedAt: new Date(),
    },
  });

  return {
    equipped_at: new Date().toISOString(),
    previous_item_id: previousEquipped?.shopItemId || null,
  };
}
