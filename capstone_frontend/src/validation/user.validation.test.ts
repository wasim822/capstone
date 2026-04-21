import { validateUser } from "./user.validation";

describe("validateUser", () => {
  const base = {
    firstName: "John",
    lastName: "Doe",
    email: "john@demo.com",
    username: "john.doe",
    role: "staff",
    department: "ops",
    status: "active",
  };

  it("returns required-field errors", () => {
    const result = validateUser(
      {
        ...base,
        firstName: "",
        lastName: "",
        email: "",
      },
      { requireUsername: true },
    );

    expect(result.firstName).toBe("First name is required");
    expect(result.lastName).toBe("Last name is required");
    expect(result.email).toBe("Email required");
  });

  it("enforces username constraints when required", () => {
    const emptyUsername = validateUser(
      {
        ...base,
        username: "",
      },
      { requireUsername: true },
    );

    expect(emptyUsername.username).toBe(
      "Username is required and cannot be cleared once set.",
    );

    const invalidChars = validateUser(
      {
        ...base,
        username: "john<>",
      },
      { requireUsername: false },
    );

    expect(invalidChars.username).toBe(
      "Only letters, numbers, spaces, and . _ - ' allowed",
    );
  });

  it("enforces password policy and confirm match", () => {
    const weakPassword = validateUser(
      {
        ...base,
        password: "short",
        confirmPassword: "short",
      },
      { requirePassword: true },
    );

    expect(weakPassword.password).toBe("At least 8 characters");

    const mismatch = validateUser(
      {
        ...base,
        password: "ValidPass1!",
        confirmPassword: "Different1!",
      },
      { requirePassword: true },
    );

    expect(mismatch.confirmPassword).toBe("Passwords do not match");
  });

  it("returns no errors for a valid create payload", () => {
    const result = validateUser(
      {
        ...base,
        password: "ValidPass1!",
        confirmPassword: "ValidPass1!",
      },
      { requireUsername: true, requirePassword: true },
    );

    expect(result).toEqual({});
  });
});
