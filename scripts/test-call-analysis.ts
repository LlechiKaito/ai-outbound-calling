import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";
import { OpenAICallAnalysisRepository } from "@/infrastructure/external/openai/openai-call-analysis-repository.js";

const SAMPLE_TRANSCRIPT = `
営業: お忙しいところ恐れ入ります。株式会社ABCの田中と申します。御社のDX推進についてご提案がありまして、お電話させていただきました。
顧客: はい、どのようなご提案でしょうか？
営業: 弊社では、業務効率化のためのクラウドソリューションを提供しております。御社のような製造業のお客様に導入いただいた事例では、月間の作業時間を約30%削減できた実績がございます。
顧客: 30%ですか。それは結構な数字ですね。具体的にはどのような業務が対象になるんですか？
営業: 主に在庫管理、受発注処理、そして社内の承認フローの自動化です。特に在庫管理では、AIを活用した需要予測も組み込んでおりまして。
顧客: なるほど、在庫管理はうちも課題なんですよね。今のシステムだと手作業が多くて。
営業: そうでしたか。もしよろしければ、一度デモをお見せできればと思うのですが、来週あたりご都合いかがでしょうか？
顧客: 来週ですか…水曜か木曜なら時間取れそうです。
営業: ありがとうございます。では水曜日の14時はいかがでしょうか？
顧客: 14時で大丈夫です。オンラインでお願いできますか？
営業: もちろんです。では水曜14時にオンラインでデモをさせていただきます。事前に資料もお送りしますね。
顧客: お願いします。楽しみにしています。
`.trim();

async function main(): Promise<void> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set");
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });
  const repository = new OpenAICallAnalysisRepository(client);

  console.log("=== 通話分析テスト ===\n");
  console.log("--- トランスクリプト ---");
  console.log(SAMPLE_TRANSCRIPT);
  console.log("\n--- 分析中... ---\n");

  const result = await repository.analyze(SAMPLE_TRANSCRIPT);

  if (!result.success) {
    console.error("分析失敗:", result.error.message);
    process.exit(1);
  }

  console.log("--- 分析結果 ---");
  console.log(JSON.stringify({
    interestLevel: result.data.interestLevel.value,
    summary: result.data.summary,
    nextAction: result.data.nextAction,
  }, null, 2));
}

main();
