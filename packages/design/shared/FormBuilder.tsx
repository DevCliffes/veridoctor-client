"use client";

import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components";
import {
  LucideArrowLeft,
  LucideCalendar1,
  LucideCheckSquare2,
  LucideChevronDown,
  LucideCircleCheck,
  LucideCircleChevronDown,
  LucideClock2,
  LucideEye,
  LucideGripHorizontal,
  LucidePlus,
  LucideSave,
  LucideText,
  LucideTrash2,
} from "../icons";
import { DialogModal } from "./DialogModal";
import * as React from "react";
import { FormRenderer } from "./FormRenderer";

type QuestionTypeMap = "string" | "text" | "choice" | "date" | "time";
type FormItemProps = {
  formItem: FormItem;
};

type QuestionType = { name: string; icon: React.ReactNode; id: string };

export type FormItem = {
  id: string;
  type: string;
  required: boolean;
  label?: string;
  options?: any[];
};
export type Form = {
  title: string;
  description: string;
  item?: FormItem[];
};

const FormContext = React.createContext<{
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  formState: Form;
  addFormItem: (formItem: FormItem) => void;
  deleteFormItem: (formItem: FormItem) => void;
  updateFormItem: (FormItem: FormItem) => void;
  // updateFormMetaData: ()
} | null>(null);

function FormBuilder() {
  const [selectedId, setSelectedId] = React.useState<string>("header");
  const [formState, setFormState] = React.useState<Form>({
    title: "untitled form",
    description: "no description provided",
    item: [],
  });
  const [builderState, setBuilderState] = React.useState<"build" | "preview">(
    "build",
  );

  const addFormItem = () => {
    const newItem: FormItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: "string",
      required: false,
    };

    setFormState((prev) => ({
      ...prev,
      item: [...(prev.item || []), newItem],
    }));
  };

  const deleteFormItem = (formItem: FormItem) => {
    setFormState((prev) => ({
      ...prev,
      item: [...(prev.item || []).filter((item) => item.id !== formItem.id)],
    }));
  };

  /**
   * updates a form item element
   * @param id id of the form item element
   * @param formItem the new form Item updated status
   */
  const updateFormItem = (formItem: FormItem) => {
    setFormState((prev) => ({
      ...prev,
      item: [
        ...(prev.item || []).map((item) => {
          if (item.id === formItem.id) {
            return { ...formItem };
          }
          return item;
        }),
      ],
    }));
  };
  const updateFormMetaData = () => {};

  return (
    <FormContext.Provider
      value={{
        selectedId,
        setSelectedId,
        formState,
        addFormItem,
        deleteFormItem,
        updateFormItem,
      }}
    >
      <div className="p-4 rounded-lg mx-4">
        <div>
          <header className="bg-white p-4  h-14 border-b px-6 flex items-center justify-between">
            <div className="flex gap-2">
              {builderState === "preview" && (
                <Button
                  variant="ghost"
                  onClick={() => setBuilderState("build")}
                >
                  <LucideArrowLeft className="" />
                </Button>
              )}
              <h1 className="font-bold text-lg tracking-tight">
                {builderState === "build" ? "Form builder" : "Preview"}
              </h1>
            </div>

            {builderState === "build" && (
              <div className="flex items-center gap-3">
                <Button
                  variant="roundedOutline"
                  onClick={addFormItem}
                  className="w-10 h-10"
                >
                  <LucidePlus />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBuilderState("preview")}
                >
                  <LucideEye size={16} /> <p>Preview</p>
                </Button>
                {/* <PreviewDialog /> */}
                <DialogModal
                  title="Confirm form saving"
                  description=""
                  trigger={
                    <>
                      <LucideSave size={16} /> Publish
                    </>
                  }
                  onSave={() => {
                    alert("An error occurred");
                  }}
                />
              </div>
            )}
          </header>

          {builderState === "build" ? (
            <div className="mt-2 flex flex-col gap-2 items-center">
              <FormHeader />
              {formState.item &&
                formState.item.map((item) => (
                  <FormItem key={item.id} formItem={item} />
                ))}
            </div>
          ) : (
            <FormRenderer form={formState} />
          )}
        </div>
      </div>
    </FormContext.Provider>
  );
}

function FormHeader() {
  const [formTitle, setFormTitle] = React.useState("untitled form");
  const context = React.useContext(FormContext);

  if (!context) {
    throw new Error("FormHeader must be used within a FormContext");
  }

  const active = context.selectedId === "header";

  return (
    <div
      onClick={() => context.setSelectedId("header")}
      className="bg-white border-2 rounded-lg w-full lg:max-w-[768px] flex"
    >
      {active && <div className="w-2 bg-primary"></div>}
      <div className="px-4">
        <input
          type="text"
          value={formTitle}
          className="focus:outline-none focus:border-b-2 focus:border-b-primary h-fit p-4 w-full text-2xl"
          onChange={(event) => setFormTitle(event.target.value)}
        />
        <input
          type="text"
          placeholder="Form description"
          className="focus:outline-none focus:border-b-2 focus:border-b-primary h-fit p-4 w-full"
        />
      </div>
    </div>
  );
}

/**
 * a form item component
 */
function FormItem({ formItem }: FormItemProps) {
  const [activeQTypeId, setActiveQTypeId] = React.useState<string>(
    formItem.type,
  );
  const [activeQType, setActiveQType] = React.useState<
    QuestionType | undefined
  >();
  const [isChecked, setIsChecked] = React.useState<boolean>(false);

  const context = React.useContext(FormContext);

  if (!context) throw new Error("FormItem must be used within a Form");

  const active = context.selectedId === formItem.id;

  React.useEffect(() => {
    findQuestionType(activeQTypeId);
  }, [activeQTypeId]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;

    // If the user deleted everything or only a <br> remains
    if (content === "<br>" || content === "") {
      e.currentTarget.innerHTML = ""; // Force it to be truly empty
    }
    context.updateFormItem({ ...formItem, label: content });
  };

  const formQuestionTypes: {
    text: QuestionType[];
    option: QuestionType[];
    dateTime: QuestionType[];
  } = {
    text: [
      { id: "string", name: "short answer", icon: <LucideText /> },
      { id: "text", name: "Long answer", icon: <LucideText /> },
    ],
    option: [
      { id: "choice", name: "multiple choice", icon: <LucideCircleCheck /> },
      { id: "checkbox", name: "checkbox", icon: <LucideCheckSquare2 /> },
      { id: "dropdown", name: "dropdown", icon: <LucideCircleChevronDown /> },
    ],
    dateTime: [
      { id: "date", name: "Date", icon: <LucideCalendar1 /> },
      { id: "time", name: "Time", icon: <LucideClock2 /> },
    ],
  };

  const formQuestionTypeKeys = Object.keys(formQuestionTypes) as Array<
    keyof typeof formQuestionTypes
  >;

  const findQuestionType = (id: string) => {
    const type = Object.values(formQuestionTypes)
      .flat()
      .find((qType) => qType.id === id);

    if (type) {
      setActiveQType(type);
    }
  };

  const handleDeleteItem = () => {
    context.deleteFormItem(formItem);
  };

  const changeQType = (qTypeId: string) => {
    setActiveQTypeId(qTypeId);
    context.updateFormItem({
      ...formItem,
      type: qTypeId,
    });
  };

  const setItemRequired = (ischecked: boolean) => {
    setIsChecked(isChecked);
    context.updateFormItem({ ...formItem, required: ischecked });
  };

  return (
    <div
      onClick={() => context.setSelectedId(formItem.id)}
      draggable
      className="bg-white border-2 rounded-lg w-[768px] flex"
    >
      {active && <div className="w-2 bg-primary"></div>}
      <div className="p-1 w-full">
        <div className="w-full flex justify-center cursor-grab">
          <LucideGripHorizontal />
        </div>
        <div className="py-2 px-4 flex items-start">
          {/* TODO: find a way of persisting the content herein */}
          <div
            onInput={handleInput}
            onBlur={handleInput}
            data-placeholder="Question"
            contentEditable
            aria-label="question"
            role="textbox"
            className="placeholder-div hover:bg-primary/10 focus:outline-none focus:border-b-2 focus:border-b-primary h-fit p-4 w-[60%] overflow-ellipsis"
          ></div>
          {active && (
            <div className="w-[40%] flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger className="border-2 rounded-md p-2 flex justify-between gap-2 cursor-pointer w-[200px]">
                  {activeQType && (
                    <>
                      {activeQType.icon}
                      {activeQType.name}
                    </>
                  )}

                  <LucideChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {formQuestionTypeKeys.map((group, index) => (
                    <div key={index}>
                      <DropdownMenuGroup>
                        {formQuestionTypes[group].map(
                          (item: QuestionType, index) => (
                            <DropdownMenuItem
                              key={index}
                              className="cursor-pointer py-3"
                              onClick={() => {
                                changeQType(item.id);
                              }}
                            >
                              {item.icon}
                              <p>{item.name}</p>
                            </DropdownMenuItem>
                          ),
                        )}
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        {active && (
          <>
            <hr />
            <div className="flex gap-4 justify-end p-4">
              <LucideTrash2
                className="cursor-pointer"
                onClick={handleDeleteItem}
              />
              <div className="flex gap-1 items-center">
                <Checkbox
                  id="item-required"
                  name="item-required"
                  className="cursor-pointer"
                  defaultChecked={formItem.required}
                  onCheckedChange={setItemRequired}
                />
                <label htmlFor="item-required" className="cursor-pointer">
                  required?
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { FormBuilder };
