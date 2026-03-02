import React from "react";

export default function ProductCard({ product, onClick }) {
  const isLegendary = Math.random() < 0.15;

  return (
    <div
      className={`mission-card apple-reveal visible${isLegendary ? " legendary" : ""}`}
      data-category={product.category}
      onClick={() => onClick(product)}
    >
      <img src={product.image} alt={product.title} />
      <h3>{product.title}</h3>
      <p>{product.description}</p>
      <span>{product.price}</span>
    </div>
  );
}
