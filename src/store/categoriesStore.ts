import { create } from 'zustand';
import * as CategoriesRepo from '../db/categories.repo';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../types/models';

interface CategoriesState {
  categories: Category[];
  counts: Map<string, number>;
  isLoading: boolean;
  /**
   * Ключ локализации ошибки (например, 'errors.loadCategories').
   * В UI рендерим через t(error) — так перевод берётся в момент отображения.
   */
  error: string | null;

  loadCategories: () => Promise<void>;
  addCategory: (dto: CreateCategoryDTO) => Promise<string>;
  editCategory: (id: string, dto: UpdateCategoryDTO) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  counts: new Map(),
  isLoading: false,
  error: null,

  loadCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const [categories, counts] = await Promise.all([
        CategoriesRepo.getAllCategories(),
        CategoriesRepo.getCategoryCounts(),
      ]);
      set({ categories, counts, isLoading: false });
    } catch (e) {
      console.error('[categoriesStore] loadCategories:', e);
      set({ error: 'errors.loadCategories', isLoading: false });
    }
  },

  addCategory: async (dto) => {
    try {
      const id = await CategoriesRepo.createCategory(dto);
      const created = await CategoriesRepo.getCategoryById(id);
      if (created) {
        const list = [...get().categories, created].sort((a, b) =>
          a.name.localeCompare(b.name, 'ru'),
        );
        // Новая категория — 0 заметок (по определению)
        const counts = new Map(get().counts);
        counts.set(id, 0);
        set({ categories: list, counts });
      }
      return id;
    } catch (e) {
      console.error('[categoriesStore] addCategory:', e);
      set({ error: 'errors.createCategory' });
      throw e;
    }
  },

  editCategory: async (id, dto) => {
    const prev = get().categories;
    set({
      categories: prev.map((c) => (c.id === id ? { ...c, ...dto } : c)),
    });
    try {
      await CategoriesRepo.updateCategory(id, dto);
    } catch (e) {
      console.error('[categoriesStore] editCategory:', e);
      set({ categories: prev, error: 'errors.updateCategory' });
    }
  },

  removeCategory: async (id) => {
    const prev = get().categories;
    set({ categories: prev.filter((c) => c.id !== id) });
    try {
      await CategoriesRepo.deleteCategory(id);
      // Перечитываем счётчики — после удаления категории
      // её заметки стали «без категории», и Map должен обновиться
      const counts = await CategoriesRepo.getCategoryCounts();
      set({ counts });
    } catch (e) {
      console.error('[categoriesStore] removeCategory:', e);
      set({ categories: prev, error: 'errors.deleteCategory' });
    }
  },

  clearError: () => set({ error: null }),
}));
