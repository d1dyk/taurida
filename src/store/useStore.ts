import { create } from 'zustand';
import { FurnitureItem } from '../lib/db';

interface StoreState {
  // Selected items in cart/order
  selectedProductIds: number[];
  selectedProducts: FurnitureItem[];
  addToOrder: (product: FurnitureItem) => void;
  removeFromOrder: (productId: number) => void;
  toggleProductInOrder: (product: FurnitureItem) => void;
  clearOrder: () => void;
  isProductSelected: (productId: number) => boolean;

  // Quick view modal
  activeModalProduct: FurnitureItem | null;
  openProductModal: (product: FurnitureItem) => void;
  closeProductModal: () => void;

  // Global Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  selectedProductIds: [],
  selectedProducts: [],

  addToOrder: (product) => {
    const { selectedProductIds, selectedProducts } = get();
    if (!selectedProductIds.includes(product.id)) {
      set({
        selectedProductIds: [...selectedProductIds, product.id],
        selectedProducts: [...selectedProducts, product],
        toastMessage: `Изделие Арт. №${product.id} добавлено к заявке`
      });
      setTimeout(() => {
        if (get().toastMessage) {
          set({ toastMessage: null });
        }
      }, 3500);
    }
  },

  removeFromOrder: (productId) => {
    const { selectedProductIds, selectedProducts } = get();
    set({
      selectedProductIds: selectedProductIds.filter(id => id !== productId),
      selectedProducts: selectedProducts.filter(p => p.id !== productId)
    });
  },

  toggleProductInOrder: (product) => {
    const { isProductSelected, addToOrder, removeFromOrder } = get();
    if (isProductSelected(product.id)) {
      removeFromOrder(product.id);
    } else {
      addToOrder(product);
    }
  },

  clearOrder: () => {
    set({ selectedProductIds: [], selectedProducts: [] });
  },

  isProductSelected: (productId) => {
    return get().selectedProductIds.includes(productId);
  },

  activeModalProduct: null,
  openProductModal: (product) => set({ activeModalProduct: product }),
  closeProductModal: () => set({ activeModalProduct: null }),

  toastMessage: null,
  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 3500);
  },
  clearToast: () => set({ toastMessage: null })
}));
