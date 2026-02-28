import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";
import nodemailer from "nodemailer";

import { OpenAIEmailContentRepository } from "@/infrastructure/external/mail/openai-email-content-repository.js";
import { NodemailerEmailRepository } from "@/infrastructure/external/mail/nodemailer-email-repository.js";
import { SendFollowUpEmailUseCase } from "@/application/usecases/follow-up-email/send-follow-up-email-usecase.js";

const TEST_DATA = {
  to: process.argv[2] || "",
  companyName: "株式会社サンプルテック",
  contactName: "佐藤一郎",
  summary: "DX推進のクラウドソリューションを提案。在庫管理の課題を抱えており、AI需要予測に興味を示した。来週水曜14時にオンラインデモを実施予定。",
  interestLevel: 4,
};

function validateEnv(): void {
  const required = ["OPENAI_API_KEY", "MAIL_HOST", "MAIL_USER", "MAIL_PASSWORD", "MAIL_FROM"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`環境変数が未設定: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function printUsage(): void {
  console.log("使い方: npx tsx --tsconfig tsconfig.json scripts/test-follow-up-email.ts <宛先メールアドレス>");
  console.log("例:     npx tsx --tsconfig tsconfig.json scripts/test-follow-up-email.ts user@example.com");
}

async function main(): Promise<void> {
  if (!TEST_DATA.to) {
    console.error("エラー: 宛先メールアドレスを引数で指定してください\n");
    printUsage();
    process.exit(1);
  }

  validateEnv();

  const openaiClient = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
  const emailContentRepository = new OpenAIEmailContentRepository(openaiClient);

  const transporter = nodemailer.createTransport({
    host: process.env["MAIL_HOST"],
    port: Number(process.env["MAIL_PORT"] || "587"),
    secure: false,
    auth: {
      user: process.env["MAIL_USER"],
      pass: process.env["MAIL_PASSWORD"],
    },
  });

  const emailRepository = new NodemailerEmailRepository(transporter, process.env["MAIL_FROM"]!);
  const useCase = new SendFollowUpEmailUseCase(emailContentRepository, emailRepository);

  console.log("=== フォローアップメール送信テスト ===\n");
  console.log("--- テストデータ ---");
  console.log(`宛先:       ${TEST_DATA.to}`);
  console.log(`会社名:     ${TEST_DATA.companyName}`);
  console.log(`担当者名:   ${TEST_DATA.contactName}`);
  console.log(`興味度:     ${TEST_DATA.interestLevel} / 5`);
  console.log(`通話要約:   ${TEST_DATA.summary}`);
  console.log("\n--- メール文面を AI で生成中... ---\n");

  const result = await useCase.execute(TEST_DATA);

  if (!result.success) {
    console.error("送信失敗:", result.error.message);
    process.exit(1);
  }

  console.log("送信完了!");
  console.log(`${TEST_DATA.to} の受信ボックスを確認してください。`);
}

main();
