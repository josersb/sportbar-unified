import { useField } from "formik";
import PropTypes from "prop-types";

const TextInput = ({ label, ...props }) => {
  const [field, meta] = useField(props);

  return (
    <div className="control">
      <label className="label">{label}</label>
      <input className="input" {...field} {...props} />
      {meta.touched && meta.error ? <div className="error">{meta.error}</div> : null}
    </div>
  );
};

TextInput.propTypes = {
  label: PropTypes.string,
};

export default TextInput;
