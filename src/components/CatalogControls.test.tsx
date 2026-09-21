import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CatalogFilters } from "./CatalogFilters";
import { CatalogPagination, CatalogEmptyState } from "./CatalogPagination";

const filters = {
  q: "fone",
  categoryId: "audio",
  status: "active",
  stock: "available",
  sort: "price-asc",
};
afterEach(cleanup);

describe("Catalog controls", () => {
  it("exposes all filters and submits them together without the previous page", () => {
    render(
      <CatalogFilters
        filters={filters}
        categories={[{ id: "audio", name: "Áudio", slug: "audio" }]}
      />,
    );
    const form = screen.getByRole("form", {
      name: "Filtrar catálogo",
    }) as HTMLFormElement;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/#catalogo");
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "price-desc" },
    });
    expect(Object.fromEntries(new FormData(form))).toEqual({
      ...filters,
      sort: "price-desc",
    });
    expect(
      screen.getByRole("button", { name: "Aplicar filtros" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Limpar filtros" }),
    ).toHaveAttribute("href", "/#catalogo");
  });

  it("preserves filters and sort in page links, with a bounded page window", () => {
    render(
      <CatalogPagination filters={filters} currentPage={50} totalPages={100} />,
    );
    const next = new URL(
      screen.getByRole("link", { name: "Próxima" }).getAttribute("href")!,
      "https://example.test",
    );
    expect(Object.fromEntries(next.searchParams)).toEqual({
      ...filters,
      page: "51",
    });
    expect(next.hash).toBe("#catalogo");
    expect(screen.getByRole("link", { name: "Página 50" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("link").length).toBeLessThanOrEqual(9);
  });

  it("does not leave a navigable previous link at the first page", () => {
    render(
      <CatalogPagination filters={filters} currentPage={1} totalPages={10} />,
    );
    expect(
      screen.queryByRole("link", { name: "Anterior" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Anterior")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("disables next on the last page and hides pagination for one page", () => {
    const { rerender } = render(
      <CatalogPagination filters={filters} currentPage={10} totalPages={10} />,
    );
    expect(
      screen.queryByRole("link", { name: "Próxima" }),
    ).not.toBeInTheDocument();
    rerender(
      <CatalogPagination filters={filters} currentPage={1} totalPages={1} />,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("offers a reset for empty searches and honest copy for an empty catalog", () => {
    const { rerender } = render(<CatalogEmptyState hasFilters />);
    expect(
      screen.getByRole("heading", { name: "Nenhum produto encontrado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Limpar busca e filtros" }),
    ).toHaveAttribute("href", "/#catalogo");
    rerender(<CatalogEmptyState hasFilters={false} />);
    expect(
      screen.getByText("Nosso catálogo está sendo atualizado."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
