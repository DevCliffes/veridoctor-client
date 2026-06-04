import * as React from "react";
import { Form } from "./FormBuilder";
import { Card } from "../components";
import { LucideFileEdit, LucideFileWarning } from "lucide-react";

function FormTemplatesViewer({
  clickAction,
}: {
  clickAction: (formId: string) => void;
}) {
  const templates: { id: string; form: Form }[] = [
    {
      id: "123",
      form: {
        title: "Vitals template form",
        description: "some description for the template",
      },
    },
  ];
  return (
    <div>
      {templates.length > 0 ? (
        <div className="grid">
          {templates.map((template, index) => (
            <Card
              key={index}
              className="w-fit p-4 cursor-pointer"
              onClick={() => clickAction(template.id)}
            >
              <div className="flex gap-2">
                <LucideFileEdit />
                <p className="font-bold">{template.form.title}</p>
              </div>
              <p>{template.form.description}</p>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <LucideFileWarning className="text-primary" size={64} />
          No forms available at the moment
        </div>
      )}
    </div>
  );
}

export { FormTemplatesViewer };
