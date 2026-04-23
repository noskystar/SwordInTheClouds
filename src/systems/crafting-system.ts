import { EventEmitter } from '../utils/event-emitter';
import type { CraftingRecipe, ItemData } from '../types/inventory';
import type { InventorySystem } from './inventory-system';

export interface CraftingResult {
  success: boolean;
  recipeId: string;
  outputItemId: string;
  outputQuantity: number;
  message: string;
}

export class CraftingSystem {
  private eventEmitter = new EventEmitter();
  private recipes = new Map<string, CraftingRecipe>();
  private itemData = new Map<string, ItemData>();

  constructor(recipes: CraftingRecipe[] = [], itemDataList: ItemData[] = []) {
    for (const recipe of recipes) {
      this.recipes.set(recipe.id, recipe);
    }
    for (const item of itemDataList) {
      this.itemData.set(item.id, item);
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    this.eventEmitter.on(event, callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    this.eventEmitter.off(event, callback);
  }

  private emit(event: string, data?: unknown): void {
    this.eventEmitter.emit(event, data);
  }

  loadRecipes(recipes: CraftingRecipe[]): void {
    for (const recipe of recipes) {
      this.recipes.set(recipe.id, recipe);
    }
  }

  loadItemData(itemDataList: ItemData[]): void {
    for (const item of itemDataList) {
      this.itemData.set(item.id, item);
    }
  }

  getRecipe(id: string): CraftingRecipe | undefined {
    return this.recipes.get(id);
  }

  getAllRecipes(): CraftingRecipe[] {
    return Array.from(this.recipes.values());
  }

  getAvailableRecipes(inventory: InventorySystem): CraftingRecipe[] {
    return this.getAllRecipes().filter((recipe) => this.canCraft(recipe.id, inventory));
  }

  canCraft(recipeId: string, inventory: InventorySystem): boolean {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) return false;

    for (const ingredient of recipe.ingredients) {
      if (!inventory.hasItem(ingredient.itemId, ingredient.quantity)) {
        return false;
      }
    }

    return true;
  }

  craft(recipeId: string, inventory: InventorySystem): CraftingResult {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      return { success: false, recipeId, outputItemId: '', outputQuantity: 0, message: '配方不存在' };
    }

    for (const ingredient of recipe.ingredients) {
      if (!inventory.hasItem(ingredient.itemId, ingredient.quantity)) {
        const item = this.itemData.get(ingredient.itemId);
        return {
          success: false,
          recipeId,
          outputItemId: recipe.outputItemId,
          outputQuantity: 0,
          message: `材料不足: 需要 ${item?.name ?? ingredient.itemId} x${ingredient.quantity}`,
        };
      }
    }

    // Consume ingredients
    for (const ingredient of recipe.ingredients) {
      const result = inventory.removeItem(ingredient.itemId, ingredient.quantity);
      if (!result.success) {
        return {
          success: false,
          recipeId,
          outputItemId: recipe.outputItemId,
          outputQuantity: 0,
          message: '材料消耗失败',
        };
      }
    }

    // Add output
    const addResult = inventory.addItem(recipe.outputItemId, recipe.outputQuantity);

    const outputItem = this.itemData.get(recipe.outputItemId);
    if (!addResult.success) {
      // Remove any partially added output to free space for refunds
      if (addResult.added > 0) {
        inventory.removeItem(recipe.outputItemId, addResult.added);
      }
      // Refund ingredients since output couldn't be fully added
      for (const ingredient of recipe.ingredients) {
        inventory.addItem(ingredient.itemId, ingredient.quantity);
      }
      const result: CraftingResult = {
        success: false,
        recipeId,
        outputItemId: recipe.outputItemId,
        outputQuantity: 0,
        message: `背包已满，无法放入 ${outputItem?.name ?? recipe.outputItemId}`,
      };
      this.emit('item_crafted', result);
      return result;
    }

    const result: CraftingResult = {
      success: true,
      recipeId,
      outputItemId: recipe.outputItemId,
      outputQuantity: recipe.outputQuantity,
      message: `成功制作 ${outputItem?.name ?? recipe.outputItemId} x${recipe.outputQuantity}`,
    };

    this.emit('item_crafted', result);
    return result;
  }

  getRecipeIngredients(recipeId: string): { itemId: string; name: string; required: number; has: number }[] | undefined {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) return undefined;

    return recipe.ingredients.map((ing) => ({
      itemId: ing.itemId,
      name: this.itemData.get(ing.itemId)?.name ?? ing.itemId,
      required: ing.quantity,
      has: 0,
    }));
  }
}
