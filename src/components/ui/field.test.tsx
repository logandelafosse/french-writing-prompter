import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./field";

describe("Field", () => {
  it("associates its label and hint with the control", () => {
    render(
      <Field label="Ta réponse" hint="Écris en français">
        <input type="text" />
      </Field>,
    );
    const control = screen.getByLabelText("Ta réponse");
    expect(control).toHaveAccessibleDescription("Écris en français");
  });

  it("gives two fields distinct ids on one page", () => {
    render(
      <>
        <Field label="Premier">
          <input type="text" />
        </Field>
        <Field label="Deuxième">
          <input type="text" />
        </Field>
      </>,
    );
    const first = screen.getByLabelText("Premier");
    const second = screen.getByLabelText("Deuxième");
    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
  });
});
