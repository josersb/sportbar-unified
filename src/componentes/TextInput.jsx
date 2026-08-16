import { useField } from "formik";
import PropTypes from "prop-types";

const TextInput = ({ label, id, ...props }) => {
  const [field, meta] = useField(props);
  const inputId = id || props.name || `input-${label}`;

  return (
    <div className="control">
      <label className="label" htmlFor={inputId}>{label}</label>
      <input className="input" id={inputId} {...field} {...props} />
      {meta.touched && meta.error ? <div className="error">{meta.error}</div> : null}
    </div>
  );
};

TextInput.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
};

export default TextInput;
