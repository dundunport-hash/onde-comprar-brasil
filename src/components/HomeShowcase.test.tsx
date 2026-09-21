import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HomeBenefits, HomeCategories, HomeProductShelf } from "./HomeShowcase";

afterEach(cleanup);

describe("Home showcase", () => {
  it("links real categories to the existing catalog filters", () => {
    render(
      <HomeCategories
        categories={[{ id: "cat-1", name: "Smartphones", slug: "smartphones" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Smartphones" })).toHaveAttribute(
      "href",
      "/?categoryId=cat-1&status=active#catalogo",
    );
  });

  it("keeps the offer section useful when no offers exist", () => {
    render(
      <HomeProductShelf
        id="ofertas"
        title="Ofertas para aproveitar"
        description="Ofertas vigentes"
        items={[]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Ofertas para aproveitar" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma oferta disponível/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Explorar catálogo/ }),
    ).toHaveAttribute("href", "/#catalogo");
  });

  it("shows benefits with a working contact destination", () => {
    render(<HomeBenefits />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: /Fale com a loja/ }),
    ).toHaveAttribute("href", "/contato");
  });
});
