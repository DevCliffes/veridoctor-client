import * as React from "react";
import { Form, FormItem } from "./FormBuilder";
import { Checkbox, Input } from "../components";

function FormRenderer({ form }: { form: Form }) {
  const renderInput = (item: FormItem) => {
    switch (item.type) {
      case "string":
        return <Input type="text" />;
      case "text":
        return <textarea />;
      case "checkbox":
        return (
          <div>
            {item.options?.map((opt, i) => (
              <label key={i}>
                <Checkbox value={opt} />
                {opt}
              </label>
            ))}
          </div>
        );
      case "dropdown":
        return (
          <select>
            {item.options?.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "date":
        return <input type="date" />;
      case "time":
        return <input type="time" />;
      default:
        return <input type="text" />;
    }
  };

  return (
    <div>
      {form.item?.map((item, index) => (
        <div key={index} className="flex flex-col">
          <label>{item.label}</label>
          {renderInput(item)}
        </div>
      ))}
    </div>
  );
}

export { FormRenderer };
