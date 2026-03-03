import { InterestLevel } from "@/domain/value-objects/analysis/interest-level";

describe("InterestLevel", () => {
  it.each([1, 2, 3, 4, 5])("should create with valid level %i", (level) => {
    const interestLevel = InterestLevel.create(level);
    expect(interestLevel.value).toBe(level);
  });

  it.each([0, 6, -1, 1.5, NaN])(
    "should throw for invalid level %s",
    (level) => {
      expect(() => InterestLevel.create(level)).toThrow(
        "Interest level must be an integer between 1 and 5",
      );
    },
  );
});
