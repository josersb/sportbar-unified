import { useField } from "formik";
import PropTypes from "prop-types";

const Radio = ({ label, id, ...props }) => {
  const [field] = useField({ ...props, type: "radio" });
  const inputId = id || props.name || `radio-${label}`;

  return (
    <div>
      <label htmlFor={inputId}>
        <input type="radio" id={inputId} {...field} {...props}></input>
        {label}
      </label>
    </div>
  );
};

Radio.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
};

export default Radio;
