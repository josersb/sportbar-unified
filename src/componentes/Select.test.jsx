import { render, screen } from "@testing-library/react";
import { Formik } from "formik";
import Select from "./Select";

describe("Select", () => {
  it("renders a select element with a label", () => {
    render(
      <Formik initialValues={{ channel: "" }} onSubmit={() => {}}>
        <Select label="Channel" name="channel">
          <option value="DTV1">DTV1</option>
          <option value="DTV2">DTV2</option>
        </Select>
      </Formik>
    );

    expect(screen.getByText("Channel")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
