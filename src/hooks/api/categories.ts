import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import { categoriesResponse, type Category } from "@/lib/api-types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> =>
      (await apiGet("/api/categories", categoriesResponse)).categories,
    staleTime: 1000 * 60 * 60, // taxonomy is effectively static
  });
}
