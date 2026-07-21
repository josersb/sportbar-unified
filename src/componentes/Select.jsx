import { useField } from "formik";
import PropTypes from "prop-types";

const Select = ({ label, id, ...props }) => {
  const [field, meta] = useField({ ...props, type: "select" });
  const inputId = id || props.name || `select-${label}`;

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <select id={inputId} {...field} {...props}></select>
      {meta.touched && meta.error ? <div className="error">{meta.error}</div> : null}
    </div>
  );
};

Select.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
};

export default Select;
