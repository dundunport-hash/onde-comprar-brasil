type CategoryFilterProps = {
  categoriesPromise: Promise<{ id: string; name: string }[]>;
  defaultValue: string;
};

export async function CategoryFilter({
  categoriesPromise,
  defaultValue,
}: CategoryFilterProps) {
  const categories = await categoriesPromise;

  return (
    <div className="grid gap-2">
      <label
        className="text-sm font-medium text-foreground"
        htmlFor="categoryId"
      >
        Categoria
      </label>
      <select
        id="categoryId"
        name="categoryId"
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
      >
        <option value="">Todas</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
