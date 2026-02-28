import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests", "<rootDir>/backend/src"],
  moduleNameMapper: {
    "^@/domain/(.*)\\.js$": "<rootDir>/backend/src/domain/$1",
    "^@/application/(.*)\\.js$": "<rootDir>/backend/src/application/$1",
    "^@/infrastructure/(.*)\\.js$": "<rootDir>/backend/src/infrastructure/$1",
    "^@/presentation/(.*)\\.js$": "<rootDir>/backend/src/presentation/$1",
    "^@/container/(.*)\\.js$": "<rootDir>/backend/src/container/$1",
    "^@/config/(.*)\\.js$": "<rootDir>/backend/src/config/$1",
    "^@/constants/(.*)\\.js$": "<rootDir>/backend/src/constants/$1",
    "^@/utils/(.*)\\.js$": "<rootDir>/backend/src/utils/$1",
    "^@/domain/(.*)$": "<rootDir>/backend/src/domain/$1",
    "^@/application/(.*)$": "<rootDir>/backend/src/application/$1",
    "^@/infrastructure/(.*)$": "<rootDir>/backend/src/infrastructure/$1",
    "^@/presentation/(.*)$": "<rootDir>/backend/src/presentation/$1",
    "^@/container/(.*)$": "<rootDir>/backend/src/container/$1",
    "^@/config/(.*)$": "<rootDir>/backend/src/config/$1",
    "^@/constants/(.*)$": "<rootDir>/backend/src/constants/$1",
    "^@/utils/(.*)$": "<rootDir>/backend/src/utils/$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        diagnostics: {
          ignoreDiagnostics: [151002],
        },
      },
    ],
  },
  maxWorkers: 2,
  moduleFileExtensions: ["ts", "js", "json"],
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/integration/**/*.test.ts",
  ],
};

export default config;
