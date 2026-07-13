import { useField } from "formik";

const Select = ({ label, ...props }) => {
  const [field, meta] = useField({ ...props, type: "select" });

  return (
    <div>
      <label>{label}</label>
      <select {...field} {...props}></select>
      {meta.touched && meta.error ? (
        <div className="error">{meta.error}</div>
      ) : null}
    </div>
  );
};

export default Select;
