import { useField } from "formik";
import PropTypes from "prop-types";

const CheckBox = ({ children, id, ...props }) => {
  const [field, meta] = useField({ ...props, type: "checkbox" });
  const inputId = id || props.name || `checkbox-${children}`;

  return (
    <div>
      <label htmlFor={inputId}>
        <input type="checkbox" id={inputId} {...field} {...props} />
        {children}
      </label>
      {meta.touched && meta.error ? <div className="error">{meta.error}</div> : null}
    </div>
  );
};

CheckBox.propTypes = {
  children: PropTypes.node,
  id: PropTypes.string,
};

export default CheckBox;
