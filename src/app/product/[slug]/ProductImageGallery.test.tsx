import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProductImageGallery } from "./ProductImageGallery";

afterEach(cleanup);

describe("ProductImageGallery", () => {
  function getOriginalImagePath(image: HTMLElement) {
    const src = image.getAttribute("src");
    const url = new URL(src!, "http://localhost");
    return url.pathname === "/_next/image"
      ? url.searchParams.get("url")
      : url.pathname;
  }

  it("shows an empty state without navigation", () => {
    render(<ProductImageGallery images={[]} productName="Notebook" />);
    expect(screen.getByText("Sem imagem cadastrada")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("deduplicates images and supports thumbnails and circular navigation", () => {
    render(
      <ProductImageGallery
        images={["/a.jpg", "/b.jpg", "/a.jpg"]}
        productName="Notebook"
      />,
    );
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mídia anterior" }));
    const image = screen.getByRole("img", { name: "Notebook — imagem 2" });
    expect(getOriginalImagePath(image)).toBe("/b.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Próxima mídia" }));
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
    const thumbnail = screen.getByRole("button", {
      name: "Ver imagem 2 de Notebook",
    });
    fireEvent.click(thumbnail);
    expect(thumbnail).toHaveAttribute("aria-pressed", "true");
  });

  it("handles failed images without blocking navigation", () => {
    render(
      <ProductImageGallery
        images={["/a.jpg", "/b.jpg"]}
        productName="Notebook"
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Notebook — imagem 1" }));
    expect(
      screen.getByText("Não foi possível carregar esta mídia."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima mídia" }));
    expect(
      screen.getByRole("img", { name: "Notebook — imagem 2" }),
    ).toBeInTheDocument();
  });

  it("preserves video playback without autoplay or video thumbnails", () => {
    const { container } = render(
      <ProductImageGallery
        images={["/demo.MP4#preview", "/a.jpg"]}
        productName="Notebook"
      />,
    );
    const video = screen.getByLabelText("Vídeo de Notebook");
    expect(video).toHaveAttribute("controls");
    expect(video).not.toHaveAttribute("autoplay");
    expect(container.querySelectorAll("video")).toHaveLength(1);
    fireEvent.error(video);
    expect(
      screen.getByText("Não foi possível carregar esta mídia."),
    ).toBeInTheDocument();
  });
});
