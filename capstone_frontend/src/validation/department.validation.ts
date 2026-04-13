export type DepartmentInput = {
  name: string;
  description: string;
};

export function validateDepartment(data: DepartmentInput) {
  const errors: Partial<Record<keyof DepartmentInput, string>> = {};

  if (!data.name.trim())
    errors.name = "Department name required";
  else if (data.name.length < 2 || data.name.length > 60)
    errors.name = "Must be 2-60 characters";
  else if (!/^[a-zA-Z0-9\s&()-]+$/.test(data.name))
    errors.name = "Invalid characters";

  if (data.description.length > 200)
    errors.description = "Max 200 characters";

  return errors;          
}